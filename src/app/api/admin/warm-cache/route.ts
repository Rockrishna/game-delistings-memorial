import { NextResponse } from "next/server";
import { searchIGDBGameByName, getIgdbCacheStats } from "@/lib/igdb";
import { prisma } from "@/lib/prisma";

export const maxDuration = 120;

/**
 * Warms the IGDB request cache by re-issuing search queries for every
 * curated/known title in the database. After the first call, all subsequent
 * reads are cache hits — useful to populate the cache for sites that were
 * seeded before the cache layer existed.
 *
 * Public + idempotent: each query writes once to IgdbRequest with a 30-day
 * TTL. Within that window, repeated calls are no-ops at the API boundary.
 */
export async function POST() {
  const games = await prisma.game.findMany({
    where: { igdbId: { not: null } },
    select: { name: true },
    orderBy: { name: "asc" },
  });

  const summary: Array<{ name: string; cached: boolean }> = [];
  for (const game of games) {
    try {
      const before = await prisma.igdbRequest.findUnique({
        where: { cacheKey: `games:search:${game.name.toLowerCase()}` },
        select: { id: true },
      });
      await searchIGDBGameByName(game.name);
      summary.push({ name: game.name, cached: before !== null });
    } catch {
      // ignore individual failures; the rest of the batch should still succeed
    }
  }

  const cache = await getIgdbCacheStats();
  return NextResponse.json({
    ok: true,
    processed: summary.length,
    summary,
    cache,
  });
}

export async function GET() {
  const cache = await getIgdbCacheStats();
  const candidates = await prisma.game.count({ where: { igdbId: { not: null } } });
  return NextResponse.json({
    cache,
    candidates,
    instructions: "POST to warm the cache: re-issues a search query for every game in the catalogue.",
  });
}
