import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

/**
 * One-shot cleanup: delete the 17 curated placeholder titles seeded before
 * the IGDB-driven sync existed. They're identified by either a non-IGDB
 * sourceUrl or a non-DELISTED type — both signatures the IGDB sync never
 * produces.
 *
 * Idempotent — re-running it after the first call is a no-op.
 */
export async function POST() {
  const before = await prisma.delistingEvent.count();

  // Delete events that aren't from the IGDB sync.
  const eventsDeleted = await prisma.delistingEvent.deleteMany({
    where: {
      OR: [
        { type: { in: ["RECENT", "UPCOMING"] } },
        // Curated DELISTED events have non-igdb.com sourceUrls
        {
          AND: [
            { type: "DELISTED" },
            {
              OR: [
                { sourceUrl: null },
                { sourceUrl: { not: { startsWith: "https://www.igdb.com/games/" } } },
              ],
            },
          ],
        },
      ],
    },
  });

  // Delete orphan games — games with no remaining events
  const orphans = await prisma.game.findMany({
    where: { events: { none: {} } },
    select: { id: true },
  });
  const orphanIds = orphans.map((g) => g.id);
  if (orphanIds.length) {
    await prisma.gamePlatform.deleteMany({ where: { gameId: { in: orphanIds } } });
    await prisma.gameGenre.deleteMany({ where: { gameId: { in: orphanIds } } });
  }
  const gamesDeleted = await prisma.game.deleteMany({
    where: { id: { in: orphanIds } },
  });

  const after = await prisma.delistingEvent.count();

  return NextResponse.json({
    ok: true,
    eventsDeleted: eventsDeleted.count,
    orphanGamesDeleted: gamesDeleted.count,
    counts: { before, after },
  });
}
