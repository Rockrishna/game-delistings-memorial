import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callNumberFor, primaryFamilyCode } from "@/lib/sync-catalog";
import { invalidateCatalogCache } from "@/lib/catalog";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * One-off / resumable migration to the descriptive call-number scheme
 * ({STORE} · {YEAR} · {igdbId}). Recomputes from data already in the DB
 * (platform families + release year + igdbId) — no IGDB/RAWG calls. Selects
 * rows whose callNumber still uses the old "DG." format, so it is resumable
 * and idempotent: re-run until remaining === 0. Reachable only through Vercel
 * Deployment Protection.
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const limit = Math.min(5000, Math.max(1, Number(sp.get("limit") ?? "2000") || 2000));

  try {
    const pending = await prisma.game.findMany({
      where: { callNumber: { startsWith: "DG." } },
      include: { platforms: { include: { platform: true } } },
      take: limit,
    });

    if (!pending.length) {
      return NextResponse.json({ ok: true, processed: 0, remaining: 0, done: true });
    }

    let updated = 0;
    for (const g of pending) {
      const platformNames = g.platforms.map((p) => p.platform.name);
      const callNumber =
        g.igdbId != null
          ? callNumberFor(g.igdbId, platformNames, g.releaseYear)
          : // No IGDB id: keep the scheme readable and unique off the row id.
            `${primaryFamilyCode(platformNames)} · ${g.releaseYear ?? "----"} · ${g.id.slice(-6)}`;
      await prisma.game.update({ where: { id: g.id }, data: { callNumber } });
      updated += 1;
    }

    invalidateCatalogCache();
    const remaining = await prisma.game.count({
      where: { callNumber: { startsWith: "DG." } },
    });

    return NextResponse.json({
      ok: true,
      processed: pending.length,
      updated,
      remaining,
      done: remaining === 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Recompute failed.", details: (error as Error).message },
      { status: 500 }
    );
  }
}
