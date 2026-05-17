import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { syncCatalogFromIGDB } from "@/lib/sync-catalog";
import { getIgdbCacheStats } from "@/lib/igdb";

export const maxDuration = 300;

/**
 * Daily cron — re-runs the catalogue sweep so newly delisted/offline
 * titles get indexed and existing records re-enriched. Idempotent and
 * cached. Honours CRON_SECRET when configured.
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
    const summary = await syncCatalogFromIGDB();
    const cache = await getIgdbCacheStats();
    const totalGames = await prisma.game.count();
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
