import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { syncCatalogFromIGDB } from "@/lib/sync-catalog";
import { getIgdbCacheStats } from "@/lib/igdb";

export const maxDuration = 300;

/**
 * Status-driven IGDB ingestion → catalogue. Pages /v4/games filtered to
 * delisted/offline statuses, enriches each (IGDB + RAWG fallback) and
 * upserts. Idempotent: every IGDB/RAWG request is cached so re-runs cost
 * nothing at the API edge.
 *
 * GET reports config + counts. POST runs the sweep (?fresh=1 clears the
 * request cache first to force live re-fetch).
 */
export async function GET() {
  const gameCount = await prisma.game.count();
  const cache = await getIgdbCacheStats();
  return NextResponse.json({
    configured: {
      INGEST_API_KEY: !!env.INGEST_API_KEY,
      IGDB_CLIENT_ID: !!env.IGDB_CLIENT_ID,
      IGDB_CLIENT_SECRET: !!env.IGDB_CLIENT_SECRET,
      RAWG_API_KEY: !!env.RAWG_API_KEY,
    },
    gameCount,
    cache,
    instructions:
      "POST to ingest. ?fresh=1 clears the request cache and forces a full rewrite; " +
      "?force=1 rewrites every record from the cached IGDB payloads; " +
      "?startPage=N resumes a sweep that ran out of time.",
  });
}

export async function POST(request: Request) {
  if (!env.IGDB_CLIENT_ID || !env.IGDB_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "IGDB credentials are not configured." },
      { status: 500 }
    );
  }

  const sp = new URL(request.url).searchParams;
  const fresh = sp.get("fresh") === "1";
  const force = sp.get("force") === "1";
  const startPage = Number(sp.get("startPage") ?? "0") || 0;

  try {
    if (fresh) {
      await prisma.igdbRequest.deleteMany({});
    }
    const summary = await syncCatalogFromIGDB({ force: force || fresh, startPage });
    const cache = await getIgdbCacheStats();
    const totalGames = await prisma.game.count();
    return NextResponse.json({ ok: true, fresh, force, summary, cache, totalGames });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Sync failed.",
        details: (error as Error).message,
        stack: (error as Error).stack?.split("\n").slice(0, 5),
      },
      { status: 500 }
    );
  }
}
