import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { syncCatalogFromIGDB } from "@/lib/sync-catalog";
import { getIgdbCacheStats } from "@/lib/igdb";

export const maxDuration = 300;

/**
 * Bimonthly cron — re-runs the catalogue sweep so newly delisted/offline
 * titles get indexed and existing records re-enriched. Idempotent, cached,
 * and incremental: records IGDB hasn't touched since the last sweep are
 * skipped without a write. Honours CRON_SECRET when configured.
 *
 * `?startPage=N` resumes a sweep that hit its time budget; `?force=1`
 * rewrites every record (only for post-schema-change repair — it is the
 * expensive path).
 */
export async function GET(request: NextRequest) {
  if (env.CRON_SECRET) {
    const auth = request.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!env.IGDB_CLIENT_ID || !env.IGDB_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "IGDB credentials are not configured." },
      { status: 500 }
    );
  }

  try {
    const sp = request.nextUrl.searchParams;
    const startPage = Number(sp.get("startPage") ?? "0") || 0;
    const summary = await syncCatalogFromIGDB({
      force: sp.get("force") === "1",
      startPage,
    });

    // Only pay for the cache/count reporting queries when the sweep actually
    // did something — an unchanged run should cost the database almost nothing.
    const didWork = summary.gamesUpserted > 0 || summary.errors.length > 0;
    const [totalGames, cache] = didWork
      ? await Promise.all([prisma.game.count(), getIgdbCacheStats()])
      : [null, null];

    return NextResponse.json({ ok: true, summary, totalGames, cache });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Cron sync failed.",
        details: (error as Error).message,
        stack: (error as Error).stack?.split("\n").slice(0, 5),
      },
      { status: 500 }
    );
  }
}
