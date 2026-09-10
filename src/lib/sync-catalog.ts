import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { invalidateCatalogCache, platformFamily } from "@/lib/catalog";
import {
  getDelistedStatusIds,
  fetchGamesByStatus,
  type NormalizedIGDBGame,
} from "@/lib/igdb";
import { fetchRawg } from "@/lib/rawg";
import { env } from "@/lib/env";
import { isNsfwGame } from "@/lib/nsfw";

const PAGE_SIZE = 250;
const MAX_PAGES = 40; // 10,000 games — safety cap
// Writes are sent in transactions of this many statements: big enough to make
// the round trips worth it, small enough that no single transaction holds locks
// for long on a small Postgres instance.
const WRITE_CHUNK = 40;
// The sweep stops cleanly at this point and reports where it got to, rather
// than being killed mid-flight by the function timeout (maxDuration = 300).
const TIME_BUDGET_MS = 240_000;

export type SyncSummary = {
  matchedStatuses: Array<{ id: number; label: string }>;
  pagesFetched: number;
  gamesSeen: number;
  gamesUpserted: number;
  gamesCreated: number;
  gamesSkipped: number;
  linkRowsWritten: number;
  rawgLookups: number;
  rawgBackfilled: number;
  dbWrites: number;
  stoppedEarly: boolean;
  nextOffset: number | null;
  durationMs: number;
  errors: Array<{ name: string; reason: string }>;
};

// 3-letter "cabinet" code per storefront family, and the priority used to pick
// one when a game shipped on several. The overview already frames storefronts
// as drawers, so the call number reads: cabinet (store) · drawer (year) · item.
const FAMILY_CODE: Record<string, string> = {
  Steam: "STE",
  PlayStation: "PLA",
  Xbox: "XBO",
  Nintendo: "NIN",
  iOS: "IOS",
  Android: "AND",
  Epic: "EPI",
  Other: "GEN",
};
const FAMILY_PRIORITY = [
  "Steam",
  "PlayStation",
  "Xbox",
  "Nintendo",
  "iOS",
  "Android",
  "Epic",
];

export function primaryFamilyCode(platformNames: string[]): string {
  const fams = new Set(platformNames.map(platformFamily));
  for (const f of FAMILY_PRIORITY) if (fams.has(f)) return FAMILY_CODE[f];
  return FAMILY_CODE.Other;
}

/**
 * Descriptive "cabinet filing" call number: {STORE} · {YEAR} · {igdbId}
 * e.g. "STE · 2014 · 8234". The igdbId tail keeps it globally unique and
 * stable; the store/year prefix makes it meaningful and searchable by segment.
 * Unknown year → "----". See /sorting#call-numbers for the full explanation.
 */
export function callNumberFor(
  igdbId: number,
  platformNames: string[] = [],
  year: number | null = null
): string {
  const code = primaryFamilyCode(platformNames);
  return `${code} · ${year ?? "----"} · ${igdbId}`;
}

function decadeFor(year: number | null): string | null {
  if (!year) return null;
  return `${Math.floor(year / 10) * 10}s`;
}

const STATUS_LABEL: Record<number, string> = { 5: "offline", 8: "delisted" };

type IncomingGame = NormalizedIGDBGame & { status?: number; updatedAtSeconds?: number };

/** Everything the sweep needs to know about a record that already exists. */
const EXISTING_SELECT = {
  id: true,
  igdbId: true,
  igdbUpdatedAt: true,
  publisher: true,
  developer: true,
  rawgLinks: true,
  platforms: { select: { platformId: true } },
  genres: { select: { genreId: true } },
} as const;

type ExistingGame = Prisma.GameGetPayload<{ select: typeof EXISTING_SELECT }>;

/** The column set every record write sends, shared by create and update. */
type GameWriteData = Omit<
  Prisma.GameUncheckedCreateInput,
  "id" | "igdbId" | "createdAt" | "updatedAt" | "platforms" | "genres"
>;

/**
 * Status-driven ingestion: page IGDB games filtered to delisted/offline
 * statuses, enrich each with as many attributes as IGDB exposes, fall back to
 * RAWG for a missing publisher/developer/metacritic, and upsert into the
 * catalogue. There are NO delisting dates — "delisted" is a status only.
 *
 * The sweep is *incremental and batched*, because the catalogue is ~4,300
 * records and the database is small:
 *
 *   - IGDB's own `updated_at` is persisted (`Game.igdbUpdatedAt`), so a record
 *     IGDB hasn't touched since the last sweep is skipped outright — no read,
 *     no write, no RAWG call. In the steady state a run writes almost nothing.
 *   - Platform/genre dictionaries are loaded once per run instead of being
 *     upserted per game (that alone was ~10 queries × 4,300 records).
 *   - Join rows are diffed, not deleted-and-recreated, and the ones that do
 *     change are written with two `createMany`/`deleteMany` calls per page.
 *   - Record writes go out in `$transaction` chunks, so 40 statements cost one
 *     round trip instead of 40.
 *
 * Pass `force: true` to rewrite every record regardless of `updated_at`
 * (post-schema-change repair), and `startPage` to resume a sweep that ran out
 * of time.
 */
export async function syncCatalogFromIGDB(opts?: {
  since?: number;
  force?: boolean;
  startPage?: number;
}): Promise<SyncSummary> {
  const startedAt = Date.now();
  const summary: SyncSummary = {
    matchedStatuses: [],
    pagesFetched: 0,
    gamesSeen: 0,
    gamesUpserted: 0,
    gamesCreated: 0,
    gamesSkipped: 0,
    linkRowsWritten: 0,
    rawgLookups: 0,
    rawgBackfilled: 0,
    dbWrites: 0,
    stoppedEarly: false,
    nextOffset: null,
    durationMs: 0,
    errors: [],
  };

  const { ids: statusIds, matched } = await getDelistedStatusIds();
  summary.matchedStatuses = matched;
  if (!statusIds.length) {
    summary.errors.push({
      name: "game_statuses",
      reason: "No status row matched delisted/offline",
    });
    summary.durationMs = Date.now() - startedAt;
    return summary;
  }

  const dictionaries = await loadDictionaries();
  const firstPage = Math.max(0, opts?.startPage ?? 0);
  let touchedAnything = false;

  for (let page = firstPage; page < MAX_PAGES; page += 1) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) {
      summary.stoppedEarly = true;
      summary.nextOffset = page * PAGE_SIZE;
      break;
    }

    const offset = page * PAGE_SIZE;
    const { games } = await fetchGamesByStatus({
      statusIds,
      offset,
      limit: PAGE_SIZE,
      since: opts?.since,
    });
    summary.pagesFetched += 1;
    summary.gamesSeen += games.length;

    if (games.length) {
      const wrote = await syncPage(games, dictionaries, summary, !!opts?.force);
      touchedAnything = touchedAnything || wrote;
    }

    if (games.length < PAGE_SIZE) break;
  }

  // Only bust the read cache when the sweep actually changed something.
  if (touchedAnything) invalidateCatalogCache();
  summary.durationMs = Date.now() - startedAt;
  return summary;
}

/* ---------------- Platform / genre dictionaries ----------------
 * Two small tables (a few hundred rows between them) that the old sweep
 * upserted once per platform per game. Loaded once per run instead, with
 * misses created in a single batch.
 */

type Dict = {
  platforms: Map<string, { id: string; name: string; abbreviation: string | null }>;
  genres: Map<string, { id: string; name: string }>;
};

async function loadDictionaries(): Promise<Dict> {
  const [platforms, genres] = await Promise.all([
    prisma.platform.findMany({ select: { id: true, slug: true, name: true, abbreviation: true } }),
    prisma.genre.findMany({ select: { id: true, slug: true, name: true } }),
  ]);
  return {
    platforms: new Map(
      platforms.map((p) => [p.slug, { id: p.id, name: p.name, abbreviation: p.abbreviation }])
    ),
    genres: new Map(genres.map((g) => [g.slug, { id: g.id, name: g.name }])),
  };
}

/** Create any dictionary rows this page introduced, in one batch per table. */
async function ensureDictionaries(
  games: IncomingGame[],
  dict: Dict,
  summary: SyncSummary
): Promise<void> {
  const newPlatforms = new Map<
    string,
    { igdbId: number; slug: string; name: string; abbreviation?: string }
  >();
  const newGenres = new Map<string, { igdbId: number; slug: string; name: string }>();

  for (const game of games) {
    for (const p of game.platforms) {
      if (!dict.platforms.has(p.slug) && !newPlatforms.has(p.slug)) {
        newPlatforms.set(p.slug, {
          igdbId: p.igdbId,
          slug: p.slug,
          name: p.name,
          abbreviation: p.abbreviation,
        });
      }
    }
    for (const g of game.genres) {
      if (!dict.genres.has(g.slug) && !newGenres.has(g.slug)) {
        newGenres.set(g.slug, { igdbId: g.igdbId, slug: g.slug, name: g.name });
      }
    }
  }

  // Upsert on `igdbId` — IGDB's own identity for the row — in one transaction.
  // (`createMany` + skipDuplicates would silently drop a row whose igdbId
  // already exists under a different slug, leaving games with no links at all.)
  if (newPlatforms.size) {
    const wanted = [...newPlatforms.values()];
    let rows: Array<{ id: string; slug: string; name: string; abbreviation: string | null }>;
    try {
      rows = await prisma.$transaction(
        wanted.map((p) =>
          prisma.platform.upsert({
            where: { igdbId: p.igdbId },
            create: { igdbId: p.igdbId, slug: p.slug, name: p.name, abbreviation: p.abbreviation },
            update: { slug: p.slug, name: p.name, abbreviation: p.abbreviation ?? null },
            select: { id: true, slug: true, name: true, abbreviation: true },
          })
        )
      );
      summary.dbWrites += 1;
    } catch {
      // A pre-existing row may hold the slug without an igdbId; fall back to
      // slug identity, one row at a time, so one oddity can't sink the batch.
      rows = [];
      for (const p of wanted) {
        try {
          rows.push(
            await prisma.platform.upsert({
              where: { slug: p.slug },
              create: { igdbId: p.igdbId, slug: p.slug, name: p.name, abbreviation: p.abbreviation },
              update: { name: p.name, abbreviation: p.abbreviation ?? null },
              select: { id: true, slug: true, name: true, abbreviation: true },
            })
          );
          summary.dbWrites += 1;
        } catch (error) {
          summary.errors.push({ name: `platform:${p.slug}`, reason: (error as Error).message });
        }
      }
    }
    for (const row of rows) {
      dict.platforms.set(row.slug, {
        id: row.id,
        name: row.name,
        abbreviation: row.abbreviation,
      });
    }
  }

  if (newGenres.size) {
    const wanted = [...newGenres.values()];
    let rows: Array<{ id: string; slug: string; name: string }>;
    try {
      rows = await prisma.$transaction(
        wanted.map((g) =>
          prisma.genre.upsert({
            where: { igdbId: g.igdbId },
            create: { igdbId: g.igdbId, slug: g.slug, name: g.name },
            update: { slug: g.slug, name: g.name },
            select: { id: true, slug: true, name: true },
          })
        )
      );
      summary.dbWrites += 1;
    } catch {
      rows = [];
      for (const g of wanted) {
        try {
          rows.push(
            await prisma.genre.upsert({
              where: { slug: g.slug },
              create: { igdbId: g.igdbId, slug: g.slug, name: g.name },
              update: { name: g.name },
              select: { id: true, slug: true, name: true },
            })
          );
          summary.dbWrites += 1;
        } catch (error) {
          summary.errors.push({ name: `genre:${g.slug}`, reason: (error as Error).message });
        }
      }
    }
    for (const row of rows) dict.genres.set(row.slug, { id: row.id, name: row.name });
  }

  // Renames are rare, so this is normally an empty list — but without it a
  // dictionary row would keep whatever name it was first created with.
  const renames: Prisma.PrismaPromise<unknown>[] = [];
  for (const game of games) {
    for (const p of game.platforms) {
      const known = dict.platforms.get(p.slug);
      if (known && (known.name !== p.name || known.abbreviation !== (p.abbreviation ?? null))) {
        renames.push(
          prisma.platform.update({
            where: { id: known.id },
            data: { name: p.name, abbreviation: p.abbreviation ?? null },
          })
        );
        known.name = p.name;
        known.abbreviation = p.abbreviation ?? null;
      }
    }
    for (const g of game.genres) {
      const known = dict.genres.get(g.slug);
      if (known && known.name !== g.name) {
        renames.push(prisma.genre.update({ where: { id: known.id }, data: { name: g.name } }));
        known.name = g.name;
      }
    }
  }
  if (renames.length) {
    await prisma.$transaction(renames);
    summary.dbWrites += 1;
  }
}

/* ---------------- Page sweep ---------------- */

type PreparedWrite = {
  igdbId: number;
  existing?: ExistingGame;
  data: GameWriteData;
  platformIds: string[];
  genreIds: string[];
};

/** Returns true when the page resulted in any write. */
async function syncPage(
  games: IncomingGame[],
  dict: Dict,
  summary: SyncSummary,
  force: boolean
): Promise<boolean> {
  await ensureDictionaries(games, dict, summary);

  // One read for the whole page instead of an upsert probe per record.
  const igdbIds = games.map((g) => g.igdbId);
  const existingRows = await prisma.game.findMany({
    where: { igdbId: { in: igdbIds } },
    select: EXISTING_SELECT,
  });
  const existingByIgdbId = new Map<number, ExistingGame>();
  for (const row of existingRows) {
    if (row.igdbId != null) existingByIgdbId.set(row.igdbId, row);
  }

  const creates: PreparedWrite[] = [];
  const updates: PreparedWrite[] = [];

  for (const game of games) {
    const existing = existingByIgdbId.get(game.igdbId);

    // IGDB hasn't touched this record since we last stored it → nothing to do.
    if (!force && existing && isUnchanged(existing, game)) {
      summary.gamesSkipped += 1;
      continue;
    }

    try {
      const prepared = await prepareGame(game, existing, dict, summary);
      if (existing) updates.push(prepared);
      else creates.push(prepared);
    } catch (error) {
      summary.errors.push({ name: game.name, reason: (error as Error).message });
    }
  }

  if (!creates.length && !updates.length) return false;

  const platformLinks: Array<{ gameId: string; platformId: string }> = [];
  const genreLinks: Array<{ gameId: string; genreId: string }> = [];
  const platformResetIds: string[] = [];
  const genreResetIds: string[] = [];

  // --- Updates: one transaction per chunk, join rows only when they differ.
  for (let i = 0; i < updates.length; i += WRITE_CHUNK) {
    const chunk = updates.slice(i, i + WRITE_CHUNK);
    const written = await writeChunk(
      chunk,
      (u) =>
        prisma.game.update({
          where: { id: u.existing!.id },
          data: u.data,
          select: { id: true },
        }),
      summary
    );
    summary.gamesUpserted += written.filter(Boolean).length;
  }

  for (const u of updates) {
    const gameId = u.existing!.id;
    if (!sameSet(u.existing!.platforms.map((p) => p.platformId), u.platformIds)) {
      platformResetIds.push(gameId);
      for (const platformId of u.platformIds) platformLinks.push({ gameId, platformId });
    }
    if (!sameSet(u.existing!.genres.map((g) => g.genreId), u.genreIds)) {
      genreResetIds.push(gameId);
      for (const genreId of u.genreIds) genreLinks.push({ gameId, genreId });
    }
  }

  // --- Creates: batched too; ids come back in order so join rows can follow.
  for (let i = 0; i < creates.length; i += WRITE_CHUNK) {
    const chunk = creates.slice(i, i + WRITE_CHUNK);
    const created = await writeChunk(
      chunk,
      (c) =>
        prisma.game.create({
          data: { igdbId: c.igdbId, ...c.data },
          select: { id: true },
        }),
      summary
    );
    created.forEach((row, index) => {
      if (!row) return;
      summary.gamesUpserted += 1;
      summary.gamesCreated += 1;
      const source = chunk[index];
      for (const platformId of source.platformIds) {
        platformLinks.push({ gameId: row.id, platformId });
      }
      for (const genreId of source.genreIds) genreLinks.push({ gameId: row.id, genreId });
    });
  }

  // --- Join rows: at most four statements for the whole page.
  if (platformResetIds.length) {
    await prisma.gamePlatform.deleteMany({ where: { gameId: { in: platformResetIds } } });
    summary.dbWrites += 1;
  }
  if (genreResetIds.length) {
    await prisma.gameGenre.deleteMany({ where: { gameId: { in: genreResetIds } } });
    summary.dbWrites += 1;
  }
  if (platformLinks.length) {
    await prisma.gamePlatform.createMany({ data: platformLinks, skipDuplicates: true });
    summary.dbWrites += 1;
    summary.linkRowsWritten += platformLinks.length;
  }
  if (genreLinks.length) {
    await prisma.gameGenre.createMany({ data: genreLinks, skipDuplicates: true });
    summary.dbWrites += 1;
    summary.linkRowsWritten += genreLinks.length;
  }

  return true;
}

/**
 * Send a chunk of record writes as one transaction (one round trip). If any
 * statement in it fails — a slug collision between two IGDB rows, say — retry
 * the chunk one record at a time so a single bad record can't discard 39 good
 * ones. Returns results positionally, with `null` where a record failed.
 */
async function writeChunk(
  chunk: PreparedWrite[],
  build: (item: PreparedWrite) => Prisma.PrismaPromise<{ id: string }>,
  summary: SyncSummary
): Promise<Array<{ id: string } | null>> {
  try {
    const rows = await prisma.$transaction(chunk.map((item) => build(item)));
    summary.dbWrites += 1;
    return rows;
  } catch {
    const results: Array<{ id: string } | null> = [];
    for (const item of chunk) {
      try {
        results.push(await build(item));
        summary.dbWrites += 1;
      } catch (error) {
        results.push(null);
        summary.errors.push({
          name: item.data.name || String(item.igdbId),
          reason: (error as Error).message,
        });
      }
    }
    return results;
  }
}

function isUnchanged(existing: ExistingGame, igdb: IncomingGame): boolean {
  if (!igdb.updatedAtSeconds || !existing.igdbUpdatedAt) return false;
  // Records that predate the RAWG pass still need one — but only when RAWG is
  // configured, otherwise nothing could ever clear the flag.
  if (env.RAWG_API_KEY && existing.rawgLinks == null) return false;
  return existing.igdbUpdatedAt.getTime() === igdb.updatedAtSeconds * 1000;
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((value) => set.has(value));
}

/**
 * Build the row payload for one record. RAWG is consulted only when IGDB is
 * short a publisher/developer AND the record has never been through a RAWG
 * pass (`rawgLinks IS NULL`) — once linked, the stored values stand, so a
 * routine sweep makes no RAWG calls and no cache reads for them.
 */
async function prepareGame(
  igdb: IncomingGame,
  existing: ExistingGame | undefined,
  dict: Dict,
  summary: SyncSummary
): Promise<PreparedWrite> {
  const releaseYear = igdb.firstReleaseAt ? igdb.firstReleaseAt.getUTCFullYear() : null;

  let publisher = igdb.publisher;
  let developer = igdb.developer;
  let metacritic: number | undefined;
  let enrichedFrom = "igdb";
  let rawgId: number | undefined;
  let rawgSlug: string | undefined;
  let rawgLinks: Array<{ category: string; url: string }> | undefined;

  const alreadyRawgChecked = existing != null && existing.rawgLinks != null;
  if (env.RAWG_API_KEY && (!publisher || !developer) && !alreadyRawgChecked) {
    summary.rawgLookups += 1;
    const rawg = await fetchRawg(igdb.name, releaseYear);
    // Always record the outcome (even "nothing found" → []), so the record
    // counts as RAWG-checked and no later sweep repeats this lookup.
    rawgLinks = rawg?.links ?? [];
    if (rawg) {
      publisher = publisher ?? rawg.publisher;
      developer = developer ?? rawg.developer;
      metacritic = rawg.metacritic;
      rawgId = rawg.rawgId;
      rawgSlug = rawg.rawgSlug;
      if (rawg.publisher || rawg.developer) {
        enrichedFrom = "igdb+rawg";
        summary.rawgBackfilled += 1;
      }
    }
  } else if (alreadyRawgChecked && (!publisher || !developer)) {
    // Keep the enrichment the earlier RAWG pass produced.
    publisher = publisher ?? existing!.publisher ?? undefined;
    developer = developer ?? existing!.developer ?? undefined;
    if (existing!.publisher || existing!.developer) enrichedFrom = "igdb+rawg";
  }

  const platformNames = igdb.platforms.map((p) => p.name);
  const data: GameWriteData = {
    slug: igdb.slug,
    name: igdb.name,
    callNumber: callNumberFor(igdb.igdbId, platformNames, releaseYear),
    summary: igdb.summary,
    firstReleaseAt: igdb.firstReleaseAt,
    releaseYear,
    decade: decadeFor(releaseYear),
    coverUrl: igdb.coverUrl,
    artworkUrls: JSON.stringify(igdb.artworkUrls),
    screenshotUrls: JSON.stringify(igdb.screenshotUrls),
    rating: igdb.rating,
    aggregatedRating: igdb.aggregatedRating,
    totalRating: igdb.totalRating,
    ratingCount: igdb.ratingCount,
    metacritic,
    publisher,
    developer,
    ageRatings: JSON.stringify(igdb.ageRatings),
    websites: JSON.stringify(igdb.websites),
    gameModes: JSON.stringify(igdb.gameModes),
    themes: JSON.stringify(igdb.themes),
    playerPerspectives: JSON.stringify(igdb.playerPerspectives),
    franchise: igdb.franchise,
    nsfw: isNsfwGame({
      themes: igdb.themes,
      ageRatings: igdb.ageRatings,
      name: igdb.name,
      summary: igdb.summary,
    }),
    igdbStatus: igdb.status,
    statusLabel: STATUS_LABEL[igdb.status ?? -1] ?? "delisted",
    enrichedFrom,
    // Persisted so the next sweep can skip this record entirely.
    igdbUpdatedAt: igdb.updatedAtSeconds ? new Date(igdb.updatedAtSeconds * 1000) : undefined,
    lastSyncedAt: new Date(),
    // Only written when RAWG was actually consulted, so a re-sync that skips
    // RAWG (IGDB already had publisher+developer) never nulls existing links.
    ...(rawgId !== undefined ? { rawgId } : {}),
    ...(rawgSlug !== undefined ? { rawgSlug } : {}),
    ...(rawgLinks !== undefined ? { rawgLinks: JSON.stringify(rawgLinks) } : {}),
  };

  const platformIds: string[] = [];
  for (const platform of igdb.platforms) {
    const known = dict.platforms.get(platform.slug);
    if (known) platformIds.push(known.id);
  }
  const genreIds: string[] = [];
  for (const genre of igdb.genres) {
    const known = dict.genres.get(genre.slug);
    if (known) genreIds.push(known.id);
  }

  return {
    igdbId: igdb.igdbId,
    existing,
    data,
    platformIds: [...new Set(platformIds)],
    genreIds: [...new Set(genreIds)],
  };
}
