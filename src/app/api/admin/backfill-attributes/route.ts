import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { fetchIGDBGamesByIds } from "@/lib/igdb";
import { fetchRawgFallback } from "@/lib/rawg";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * One-off / resumable backfill for the attribute columns added after the
 * initial sync — gameModes, themes, playerPerspectives, franchise — which
 * existing rows never received. Selects rows where `gameModes` is still NULL
 * (the "never enriched" marker), re-fetches them from IGDB by id (batched and
 * cached), and writes only those columns. Optionally fills publisher/developer
 * from RAWG when still missing (?rawg=1).
 *
 * Idempotent and bounded: processes up to ?limit rows per call (default 600)
 * and reports how many remain, so it can be invoked repeatedly until done.
 * Reachable only through Vercel Deployment Protection.
 */
export async function GET(request: NextRequest) {
  if (!env.IGDB_CLIENT_ID || !env.IGDB_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "IGDB credentials are not configured." },
      { status: 500 }
    );
  }

  const sp = request.nextUrl.searchParams;
  const limit = Math.min(1500, Math.max(1, Number(sp.get("limit") ?? "600") || 600));
  const useRawg = sp.get("rawg") === "1";

  try {
    const pending = await prisma.game.findMany({
      where: { gameModes: null },
      select: { id: true, igdbId: true, name: true, publisher: true, developer: true },
      orderBy: { igdbId: "asc" },
      take: limit,
    });

    if (!pending.length) {
      return NextResponse.json({ ok: true, processed: 0, remaining: 0, done: true });
    }

    const ids = pending.map((g) => g.igdbId).filter((x): x is number => x != null);

    // Fetch from IGDB in batches of 400 (well under the 500-id query ceiling).
    const byId = new Map<number, Awaited<ReturnType<typeof fetchIGDBGamesByIds>>[number]>();
    for (let start = 0; start < ids.length; start += 400) {
      const batch = ids.slice(start, start + 400);
      const rows = await fetchIGDBGamesByIds(batch);
      for (const row of rows) byId.set(row.igdbId, row);
    }

    let updated = 0;
    let rawgFilled = 0;
    let notFound = 0;

    for (const g of pending) {
      const igdb = g.igdbId != null ? byId.get(g.igdbId) : undefined;

      if (!igdb) {
        // Mark as processed so we don't reselect it forever.
        await prisma.game.update({
          where: { id: g.id },
          data: { gameModes: "[]", themes: "[]", playerPerspectives: "[]" },
        });
        notFound += 1;
        continue;
      }

      let publisher = g.publisher;
      let developer = g.developer;
      if (useRawg && (!publisher || !developer)) {
        const rawg = await fetchRawgFallback(g.name);
        if (rawg.publisher || rawg.developer) {
          publisher = publisher ?? rawg.publisher ?? null;
          developer = developer ?? rawg.developer ?? null;
          rawgFilled += 1;
        }
      }

      await prisma.game.update({
        where: { id: g.id },
        data: {
          gameModes: JSON.stringify(igdb.gameModes ?? []),
          themes: JSON.stringify(igdb.themes ?? []),
          playerPerspectives: JSON.stringify(igdb.playerPerspectives ?? []),
          franchise: igdb.franchise ?? null,
          ...(useRawg ? { publisher, developer } : {}),
        },
      });
      updated += 1;
    }

    const remaining = await prisma.game.count({ where: { gameModes: null } });

    return NextResponse.json({
      ok: true,
      processed: pending.length,
      updated,
      notFound,
      rawgFilled,
      remaining,
      done: remaining === 0,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Backfill failed.",
        details: (error as Error).message,
        stack: (error as Error).stack?.split("\n").slice(0, 5),
      },
      { status: 500 }
    );
  }
}
