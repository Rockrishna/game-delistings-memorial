import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { syncDelistedFromIGDB } from "@/lib/sync-delistings";
import { getIgdbCacheStats } from "@/lib/igdb";

export const maxDuration = 300;

/**
 * Status-driven IGDB ingestion.
 *
 * 1. GET /v4/game_statuses → find rows whose label means delisted/offline.
 * 2. Page /v4/games filtered to those status IDs (250/page, 20-page cap).
 * 3. Upsert Game/Platform/Genre and create a DELISTED DelistingEvent for
 *    every game we haven't already seen.
 *
 * Public + idempotent: every IGDB request is cached in the IgdbRequest
 * table so re-runs cost nothing at the API boundary. Existing DELISTED
 * events are detected and skipped, so re-running never duplicates rows.
 *
 * If you want to gate this behind auth, set INGEST_API_KEY and pass
 * `Authorization: Bearer <key>`; the route is open by default.
 */
export async function GET() {
  const eventCount = await prisma.delistingEvent.count();
  const cache = await getIgdbCacheStats();
  return NextResponse.json({
    configured: {
      INGEST_API_KEY: !!env.INGEST_API_KEY,
      IGDB_CLIENT_ID: !!env.IGDB_CLIENT_ID,
      IGDB_CLIENT_SECRET: !!env.IGDB_CLIENT_SECRET,
    },
    eventCount,
    cache,
    instructions:
      "POST to ingest. While the database is empty, no auth is required (one-shot bootstrap). Otherwise pass `Authorization: Bearer <INGEST_API_KEY>`.",
  });
}

export async function POST(request: Request) {
  if (!env.IGDB_CLIENT_ID || !env.IGDB_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "IGDB credentials are not configured." },
      { status: 500 }
    );
  }

  const fresh = new URL(request.url).searchParams.get("fresh") === "1";

  try {
    if (fresh) {
      await prisma.igdbRequest.deleteMany({});
    }
    const summary = await syncDelistedFromIGDB();
    const cache = await getIgdbCacheStats();
    const totalEvents = await prisma.delistingEvent.count();
    return NextResponse.json({ ok: true, fresh, summary, cache, totalEvents });
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
