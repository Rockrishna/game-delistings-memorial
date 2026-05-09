import { DelistingType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getDelistedStatusIds,
  fetchGamesByStatus,
  type NormalizedIGDBGame,
} from "@/lib/igdb";
import { resolveDelistDate } from "@/lib/delist-date-lookup";

const PAGE_SIZE = 250;
const MAX_PAGES = 20; // 5,000 games — safety cap

export type SyncSummary = {
  matchedStatuses: Array<{ id: number; label: string }>;
  pagesFetched: number;
  gamesSeen: number;
  gamesUpserted: number;
  eventsCreated: number;
  eventsSkipped: number;
  errors: Array<{ name: string; reason: string }>;
};

/**
 * One-shot ingestion: query IGDB game_statuses → keep only the rows whose
 * label says "delisted" / "offline" / similar → page through games filtered
 * by those statuses → upsert each game and create a DELISTED DelistingEvent
 * (idempotent on the (gameId, type) pair).
 *
 * Every IGDB call is routed through the IgdbRequest cache table so a re-run
 * is a no-op at the API boundary.
 */
export async function syncDelistedFromIGDB(opts?: {
  since?: number;
}): Promise<SyncSummary> {
  const summary: SyncSummary = {
    matchedStatuses: [],
    pagesFetched: 0,
    gamesSeen: 0,
    gamesUpserted: 0,
    eventsCreated: 0,
    eventsSkipped: 0,
    errors: [],
  };

  const { ids: statusIds, matched } = await getDelistedStatusIds();
  summary.matchedStatuses = matched;
  if (!statusIds.length) {
    summary.errors.push({
      name: "game_statuses",
      reason: "No status row matched delisted/offline/withdrawn",
    });
    return summary;
  }

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const offset = page * PAGE_SIZE;
    const { games, rawUpdatedAt } = await fetchGamesByStatus({
      statusIds,
      offset,
      limit: PAGE_SIZE,
      since: opts?.since,
    });
    summary.pagesFetched += 1;
    summary.gamesSeen += games.length;

    for (const game of games) {
      try {
        await upsertGameAndEvent(game, rawUpdatedAt.get(game.igdbId), summary);
      } catch (error) {
        summary.errors.push({
          name: game.name,
          reason: (error as Error).message,
        });
      }
    }

    if (games.length < PAGE_SIZE) break;
  }

  return summary;
}

async function upsertGameAndEvent(
  igdb: NormalizedIGDBGame,
  igdbUpdatedAtSeconds: number | undefined,
  summary: SyncSummary
) {
  const game = await prisma.game.upsert({
    where: { igdbId: igdb.igdbId },
    update: {
      slug: igdb.slug,
      name: igdb.name,
      summary: igdb.summary,
      firstReleaseAt: igdb.firstReleaseAt,
      coverUrl: igdb.coverUrl,
      artworkUrls: JSON.stringify(igdb.artworkUrls),
      rating: igdb.rating,
    },
    create: {
      igdbId: igdb.igdbId,
      slug: igdb.slug,
      name: igdb.name,
      summary: igdb.summary,
      firstReleaseAt: igdb.firstReleaseAt,
      coverUrl: igdb.coverUrl,
      artworkUrls: JSON.stringify(igdb.artworkUrls),
      rating: igdb.rating,
    },
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

  const existingEvent = await prisma.delistingEvent.findFirst({
    where: { gameId: game.id, type: DelistingType.DELISTED },
  });

  if (existingEvent) {
    summary.eventsSkipped += 1;
    return;
  }

  // Try Wikipedia first (real delist date), then SteamDB (stub), and only
  // fall back to IGDB updated_at when neither has a hit. Source attribution
  // is persisted so the UI can show an "approximate" badge for IGDB-tier
  // entries.
  const resolved = await resolveDelistDate({
    igdbName: igdb.name,
    igdbSlug: igdb.slug,
    igdbUpdatedAtSeconds,
  });

  await prisma.delistingEvent.create({
    data: {
      gameId: game.id,
      type: DelistingType.DELISTED,
      delistDate: resolved.date,
      delistDateSource: resolved.source,
      reason: "Marked offline/delisted by IGDB.",
      sourceUrl: `https://www.igdb.com/games/${igdb.slug}`,
    },
  });
  summary.eventsCreated += 1;
}
