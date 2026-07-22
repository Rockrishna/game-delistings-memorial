import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { fetchIGDBGamesByIds } from "@/lib/igdb";
import { fetchRawg } from "@/lib/rawg";
import { invalidateCatalogCache } from "@/lib/catalog";
import { callNumberFor } from "@/lib/sync-catalog";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Refetch + repair pass. For each record it re-pulls the IGDB row (authoritative
 * publisher/developer — so incorrect values that a loose earlier RAWG match
 * injected, e.g. crediting a title to Sony, get corrected or blanked) and runs
 * the strict RAWG lookup to attach the RAWG game id/slug and external links.
 *
 * Resumable + idempotent: selects rows where rawgLinks IS NULL (never enriched)
 * and always writes rawgLinks (at least "[]"), so re-run until remaining === 0.
 * IGDB is authoritative for publisher/developer; when a row can't be re-found on
 * IGDB its existing publisher/developer are left untouched (can't verify).
 * Reachable only through Vercel Deployment Protection.
 */
export async function GET(request: NextRequest) {
  if (!env.IGDB_CLIENT_ID || !env.IGDB_CLIENT_SECRET) {
    return NextResponse.json({ error: "IGDB credentials are not configured." }, { status: 500 });
  }

  const sp = request.nextUrl.searchParams;
  const limit = Math.min(300, Math.max(1, Number(sp.get("limit") ?? "150") || 150));

  try {
    const pending = await prisma.game.findMany({
      where: { rawgLinks: null },
      include: { platforms: { include: { platform: true } } },
      orderBy: { igdbId: "asc" },
      take: limit,
    });

    if (!pending.length) {
      return NextResponse.json({ ok: true, processed: 0, remaining: 0, done: true });
    }

    // Batch-fetch the IGDB rows for authoritative publisher/developer.
    const ids = pending.map((g) => g.igdbId).filter((x): x is number => x != null);
    const byId = new Map<number, Awaited<ReturnType<typeof fetchIGDBGamesByIds>>[number]>();
    for (let start = 0; start < ids.length; start += 400) {
      const rows = await fetchIGDBGamesByIds(ids.slice(start, start + 400));
      for (const row of rows) byId.set(row.igdbId, row);
    }

    let repaired = 0;
    let linked = 0;
    for (const g of pending) {
      const igdb = g.igdbId != null ? byId.get(g.igdbId) : undefined;
      const platformNames = g.platforms.map((p) => p.platform.name);
      const rawg = await fetchRawg(g.name, g.releaseYear);
      if (rawg?.rawgId) linked += 1;

      const igdbData = igdb
        ? {
            // IGDB is authoritative; fall back to strict RAWG; else blank.
            publisher: igdb.publisher ?? rawg?.publisher ?? null,
            developer: igdb.developer ?? rawg?.developer ?? null,
            metacritic: rawg?.metacritic ?? null,
            websites: JSON.stringify(igdb.websites ?? []),
            enrichedFrom:
              (!igdb.publisher || !igdb.developer) && (rawg?.publisher || rawg?.developer)
                ? "igdb+rawg"
                : "igdb",
          }
        : {};
      if (igdb) repaired += 1;

      await prisma.game.update({
        where: { id: g.id },
        data: {
          ...igdbData,
          rawgId: rawg?.rawgId ?? null,
          rawgSlug: rawg?.rawgSlug ?? null,
          rawgLinks: JSON.stringify(rawg?.links ?? []),
          ...(g.igdbId != null
            ? { callNumber: callNumberFor(g.igdbId, platformNames, g.releaseYear) }
            : {}),
        },
      });
    }

    invalidateCatalogCache();
    const remaining = await prisma.game.count({ where: { rawgLinks: null } });

    return NextResponse.json({
      ok: true,
      processed: pending.length,
      repaired,
      linked,
      remaining,
      done: remaining === 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Refetch failed.", details: (error as Error).message },
      { status: 500 }
    );
  }
}
