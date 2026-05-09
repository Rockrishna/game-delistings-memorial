import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { syncDelistedFromIGDB } from "@/lib/sync-delistings";
import { getIgdbCacheStats } from "@/lib/igdb";

export const maxDuration = 300;

/**
 * Daily cron entry point — wired up via vercel.json `crons` to fire once
 * per day (06:00 UTC). Vercel cron makes a GET request and (when
 * CRON_SECRET is set on the project) attaches an `Authorization: Bearer
 * <secret>` header. We honour both:
 *   - if CRON_SECRET is configured, the header must match;
 *   - if not, the route stays open (the underlying sync is idempotent
 *     and cached, so an extra invocation is cheap).
 *
 * Rather than re-paging the entire delisted catalogue, we look at the
 * most-recent DelistingEvent in the DB and ask IGDB for games whose
 * `updated_at` is newer than that — minus a 24h grace window so a
 * partially-complete previous run doesn't strand fresh entries.
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

  // Anchor: the latest delistDate currently in the DB. delistDate is
  // populated from IGDB's updated_at, so it's the right cursor for an
  // "anything newer than this" incremental fetch. Subtract 1 day so we
  // re-check the boundary and pick up any rows that arrived during the
  // previous run.
  const latest = await prisma.delistingEvent.findFirst({
    orderBy: { delistDate: "desc" },
    select: { delistDate: true },
  });

  const since = latest
    ? Math.floor(latest.delistDate.getTime() / 1000) - 24 * 60 * 60
    : undefined;

  try {
    const summary = await syncDelistedFromIGDB({ since });
    const cache = await getIgdbCacheStats();
    const totalEvents = await prisma.delistingEvent.count();
    return NextResponse.json({
      ok: true,
      mode: since ? "incremental" : "full",
      since: since ? new Date(since * 1000).toISOString() : null,
      summary,
      totalEvents,
      cache,
    });
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
