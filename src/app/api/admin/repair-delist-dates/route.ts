import { NextResponse } from "next/server";
import { DelistingType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fetchIGDBGamesByIds } from "@/lib/igdb";

export const maxDuration = 120;

const BATCH_SIZE = 50;

/**
 * One-shot repair: any DelistingEvent whose `delistDate` falls on today's
 * UTC date is almost certainly a placeholder (the user-search route used
 * to stamp `new Date()` instead of IGDB's `updated_at`). Re-fetch the
 * IGDB row by id and overwrite delistDate with `updated_at` if it differs.
 *
 * Idempotent — running it again skips events that already match.
 *
 * Returns a per-game audit so callers can spot-check Anthem,
 * Forza 6: Apex, etc. were corrected.
 */
export async function POST() {
  const startOfTodayUTC = new Date();
  startOfTodayUTC.setUTCHours(0, 0, 0, 0);

  const suspectEvents = await prisma.delistingEvent.findMany({
    where: {
      type: DelistingType.DELISTED,
      delistDate: { gte: startOfTodayUTC },
      game: { igdbId: { not: null } },
    },
    include: { game: { select: { id: true, igdbId: true, name: true } } },
  });

  if (!suspectEvents.length) {
    return NextResponse.json({
      ok: true,
      repaired: 0,
      checked: 0,
      message: "No events with today's delistDate to inspect.",
    });
  }

  // Pull IGDB rows in batches to stay under any per-request size limits.
  const igdbIdToEvent = new Map<number, (typeof suspectEvents)[number]>();
  for (const event of suspectEvents) {
    if (event.game.igdbId != null) igdbIdToEvent.set(event.game.igdbId, event);
  }

  const ids = [...igdbIdToEvent.keys()];
  const fetched: Array<Awaited<ReturnType<typeof fetchIGDBGamesByIds>>[number]> = [];
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const slice = ids.slice(i, i + BATCH_SIZE);
    const rows = await fetchIGDBGamesByIds(slice);
    fetched.push(...rows);
  }

  const repaired: Array<{
    name: string;
    igdbId: number;
    from: string;
    to: string;
  }> = [];
  const skipped: Array<{ name: string; igdbId: number; reason: string }> = [];

  for (const row of fetched) {
    const event = igdbIdToEvent.get(row.igdbId);
    if (!event) continue;
    if (!row.updatedAtSeconds) {
      skipped.push({
        name: event.game.name,
        igdbId: row.igdbId,
        reason: "IGDB row has no updated_at",
      });
      continue;
    }
    const correct = new Date(row.updatedAtSeconds * 1000);
    // Only repair if IGDB's updated_at is actually older than our stamp.
    // Anything within 24h is plausible.
    if (
      Math.abs(correct.getTime() - event.delistDate.getTime()) <
      24 * 60 * 60 * 1000
    ) {
      skipped.push({
        name: event.game.name,
        igdbId: row.igdbId,
        reason: "delistDate already within 24h of IGDB updated_at",
      });
      continue;
    }
    await prisma.delistingEvent.update({
      where: { id: event.id },
      data: { delistDate: correct },
    });
    repaired.push({
      name: event.game.name,
      igdbId: row.igdbId,
      from: event.delistDate.toISOString(),
      to: correct.toISOString(),
    });
  }

  return NextResponse.json({
    ok: true,
    checked: suspectEvents.length,
    repaired: repaired.length,
    skipped: skipped.length,
    sample: repaired.slice(0, 20),
  });
}
