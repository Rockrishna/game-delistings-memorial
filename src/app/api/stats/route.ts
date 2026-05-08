import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getIgdbCacheStats } from "@/lib/igdb";

export const maxDuration = 30;

/**
 * Combined stats endpoint: catalogue counts + IGDB request-cache health.
 * Driven entirely off the Vercel Postgres instance — no external API calls
 * unless the IGDB cache itself needs refilling somewhere else.
 */
export async function GET() {
  try {
    const [
      totalEvents,
      gamesWithMetadata,
      platformsTracked,
      genresTracked,
      eventsByType,
      cache,
    ] = await Promise.all([
      prisma.delistingEvent.count(),
      prisma.game.count({ where: { igdbId: { not: null } } }),
      prisma.platform.count(),
      prisma.genre.count(),
      prisma.delistingEvent.groupBy({ by: ["type"], _count: { _all: true } }),
      getIgdbCacheStats(),
    ]);

    const byType = Object.fromEntries(
      eventsByType.map((row) => [row.type, row._count._all])
    );

    return NextResponse.json({
      catalogue: {
        totalEvents,
        gamesWithMetadata,
        platformsTracked,
        genresTracked,
        recent: byType.RECENT ?? 0,
        upcoming: byType.UPCOMING ?? 0,
        delisted: byType.DELISTED ?? 0,
      },
      igdbCache: cache,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load stats.", details: (error as Error).message },
      { status: 500 }
    );
  }
}
