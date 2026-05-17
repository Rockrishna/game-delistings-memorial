import { prisma } from "@/lib/prisma";
import {
  getDelistedStatusIds,
  fetchGamesByStatus,
  type NormalizedIGDBGame,
} from "@/lib/igdb";
import { fetchRawgFallback } from "@/lib/rawg";

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

/**
 * Library-style call number, stable for the life of an IGDB id and unique
 * (bijective with igdbId): igdbId 8234 → "DG.823.4".
 */
export function callNumberFor(igdbId: number): string {
  const klass = Math.floor(igdbId / 10);
  const item = igdbId % 10;
  return `DG.${klass}.${item}`;
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

  if (!publisher || !developer) {
    const rawg = await fetchRawgFallback(igdb.name);
    if (rawg.publisher || rawg.developer || rawg.metacritic != null) {
      publisher = publisher ?? rawg.publisher;
      developer = developer ?? rawg.developer;
      metacritic = rawg.metacritic;
      if (rawg.publisher || rawg.developer) {
        enrichedFrom = "igdb+rawg";
        summary.rawgBackfilled += 1;
      }
    }
  }

  const data = {
    slug: igdb.slug,
    name: igdb.name,
    callNumber: callNumberFor(igdb.igdbId),
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
    igdbStatus: igdb.status,
    statusLabel: STATUS_LABEL[igdb.status ?? -1] ?? "delisted",
    enrichedFrom,
    igdbUpdatedAt: undefined,
    lastSyncedAt: new Date(),
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
