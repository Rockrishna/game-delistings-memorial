import { prisma } from "@/lib/prisma";
import { invalidateCatalogCache, platformFamily } from "@/lib/catalog";
import {
  getDelistedStatusIds,
  fetchGamesByStatus,
  type NormalizedIGDBGame,
} from "@/lib/igdb";
import { fetchRawg } from "@/lib/rawg";
import { isNsfwGame } from "@/lib/nsfw";

const PAGE_SIZE = 250;
const MAX_PAGES = 40; // 10,000 games — safety cap

export type SyncSummary = {
  matchedStatuses: Array<{ id: number; label: string }>;
  pagesFetched: number;
  gamesSeen: number;
  gamesUpserted: number;
  rawgBackfilled: number;
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
 * Unknown year → "----". See /cataloguing for the full explanation.
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

/**
 * One-shot ingestion: page IGDB games filtered to delisted/offline statuses,
 * enrich each with as many attributes as IGDB exposes, fall back to RAWG for
 * a missing publisher/developer/metacritic, and upsert into the catalogue.
 *
 * There are NO delisting dates or events — "delisted" is a status only.
 * Every IGDB/RAWG call is cached so a re-run is a near no-op at the API edge.
 */
export async function syncCatalogFromIGDB(opts?: {
  since?: number;
}): Promise<SyncSummary> {
  const summary: SyncSummary = {
    matchedStatuses: [],
    pagesFetched: 0,
    gamesSeen: 0,
    gamesUpserted: 0,
    rawgBackfilled: 0,
    errors: [],
  };

  const { ids: statusIds, matched } = await getDelistedStatusIds();
  summary.matchedStatuses = matched;
  if (!statusIds.length) {
    summary.errors.push({
      name: "game_statuses",
      reason: "No status row matched delisted/offline",
    });
    return summary;
  }

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const offset = page * PAGE_SIZE;
    const { games } = await fetchGamesByStatus({
      statusIds,
      offset,
      limit: PAGE_SIZE,
      since: opts?.since,
    });
    summary.pagesFetched += 1;
    summary.gamesSeen += games.length;

    for (const game of games) {
      try {
        await upsertGame(game, summary);
      } catch (error) {
        summary.errors.push({ name: game.name, reason: (error as Error).message });
      }
    }

    if (games.length < PAGE_SIZE) break;
  }

  invalidateCatalogCache();
  return summary;
}

async function upsertGame(
  igdb: NormalizedIGDBGame & { status?: number },
  summary: SyncSummary
) {
  const releaseYear = igdb.firstReleaseAt
    ? igdb.firstReleaseAt.getUTCFullYear()
    : null;

  let publisher = igdb.publisher;
  let developer = igdb.developer;
  let metacritic: number | undefined;
  let enrichedFrom = "igdb";
  let rawgId: number | undefined;
  let rawgSlug: string | undefined;
  let rawgLinks: Array<{ category: string; url: string }> | undefined;

  if (!publisher || !developer) {
    const rawg = await fetchRawg(igdb.name, releaseYear);
    if (rawg) {
      publisher = publisher ?? rawg.publisher;
      developer = developer ?? rawg.developer;
      metacritic = rawg.metacritic;
      rawgId = rawg.rawgId;
      rawgSlug = rawg.rawgSlug;
      rawgLinks = rawg.links;
      if (rawg.publisher || rawg.developer) {
        enrichedFrom = "igdb+rawg";
        summary.rawgBackfilled += 1;
      }
    }
  }

  const data = {
    slug: igdb.slug,
    name: igdb.name,
    callNumber: callNumberFor(igdb.igdbId, igdb.platforms.map((p) => p.name), releaseYear),
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
    igdbUpdatedAt: undefined,
    lastSyncedAt: new Date(),
    // Only written when RAWG was actually consulted, so a re-sync that skips
    // RAWG (IGDB already had publisher+developer) never nulls existing links.
    ...(rawgId !== undefined ? { rawgId } : {}),
    ...(rawgSlug !== undefined ? { rawgSlug } : {}),
    ...(rawgLinks !== undefined ? { rawgLinks: JSON.stringify(rawgLinks) } : {}),
  };

  const game = await prisma.game.upsert({
    where: { igdbId: igdb.igdbId },
    update: data,
    create: { igdbId: igdb.igdbId, ...data },
  });
  summary.gamesUpserted += 1;

  // Replace platform/genre links so they reflect the latest IGDB shape.
  await prisma.gamePlatform.deleteMany({ where: { gameId: game.id } });
  await prisma.gameGenre.deleteMany({ where: { gameId: game.id } });

  for (const platform of igdb.platforms) {
    const dbPlatform = await prisma.platform.upsert({
      where: { slug: platform.slug },
      update: {
        igdbId: platform.igdbId,
        name: platform.name,
        abbreviation: platform.abbreviation,
      },
      create: {
        igdbId: platform.igdbId,
        slug: platform.slug,
        name: platform.name,
        abbreviation: platform.abbreviation,
      },
    });
    await prisma.gamePlatform.create({
      data: { gameId: game.id, platformId: dbPlatform.id },
    });
  }

  for (const genre of igdb.genres) {
    const dbGenre = await prisma.genre.upsert({
      where: { slug: genre.slug },
      update: { igdbId: genre.igdbId, name: genre.name },
      create: { igdbId: genre.igdbId, slug: genre.slug, name: genre.name },
    });
    await prisma.gameGenre.create({
      data: { gameId: game.id, genreId: dbGenre.id },
    });
  }
}
