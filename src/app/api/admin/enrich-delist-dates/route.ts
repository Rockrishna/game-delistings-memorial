import { NextRequest, NextResponse } from "next/server";
import { DelistingType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveDelistDate } from "@/lib/delist-date-lookup";

export const maxDuration = 300;

const DEFAULT_LIMIT = 100;
const PAUSE_MS = 250; // be polite to the Wikipedia API

/**
 * Enrich existing DelistingEvent rows with a real delist date when one is
 * available from Wikipedia. Run iteratively — each call processes up to
 * `?limit=N` (default 100) rows whose `delistDateSource` is null or
 * "igdb", giving Wikipedia a chance to surface a more accurate date.
 *
 * Iteration is by oldest-first so famous titles (which usually have
 * better Wikipedia coverage) get processed before niche indies. Pass
 * `?dryRun=1` to see what would change without writing.
 *
 * Why not run this in the cron? Wikipedia rate-limits per User-Agent,
 * and one daily incremental sync rarely produces more than a couple of
 * hundred new entries. Splitting enrichment into a separate, manually-
 * paced job keeps the cron tight and lets us re-run enrichment without
 * touching the catalogue ingest path.
 */
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") ?? `${DEFAULT_LIMIT}`, 10), 1),
    500
  );
  const dryRun = url.searchParams.get("dryRun") === "1";
  // ?retryIgdb=1 re-processes events already marked "igdb" (useful if
  // Wikipedia coverage has improved since the last sweep). By default we
  // only target unsourced rows so each sweep makes forward progress
  // through the catalogue.
  const retryIgdb = url.searchParams.get("retryIgdb") === "1";
  // ?order=desc walks the catalogue newest-delistDate first — handy when
  // we want to verify the pipeline against a recent entry (e.g. Anthem)
  // without paging through the entire archive.
  const order = url.searchParams.get("order") === "desc" ? "desc" : "asc";

  const sourceFilter = retryIgdb
    ? { OR: [{ delistDateSource: null }, { delistDateSource: "igdb" }] }
    : { delistDateSource: null };

  const candidates = await prisma.delistingEvent.findMany({
    where: {
      type: DelistingType.DELISTED,
      ...sourceFilter,
      game: { igdbId: { not: null } },
    },
    include: {
      game: { select: { id: true, name: true, slug: true, igdbId: true, updatedAt: true } },
    },
    orderBy: { delistDate: order },
    take: limit,
  });

  const upgraded: Array<{
    name: string;
    from: string;
    to: string;
    fromSource: string | null;
    toSource: string;
  }> = [];
  const fellBackToIgdb: Array<{ name: string }> = [];
  const errors: Array<{ name: string; reason: string }> = [];

  for (const event of candidates) {
    try {
      // We don't have IGDB updated_at on the row directly — but the game's
      // updatedAt is roughly equivalent for fallback purposes (it's our
      // local mirror of when we last upserted, which itself was based on
      // IGDB's updated_at). Use the existing delistDate as a tiebreaker.
      const resolved = await resolveDelistDate({
        igdbName: event.game.name,
        igdbSlug: event.game.slug,
        fallback: event.delistDate,
      });

      // Skip writes when nothing meaningful would change.
      const sameDate =
        Math.abs(resolved.date.getTime() - event.delistDate.getTime()) < 24 * 60 * 60 * 1000;
      const sameSource = resolved.source === event.delistDateSource;
      if (sameDate && sameSource) {
        if (resolved.source === "igdb") fellBackToIgdb.push({ name: event.game.name });
        continue;
      }

      if (!dryRun) {
        await prisma.delistingEvent.update({
          where: { id: event.id },
          data: {
            delistDate: resolved.date,
            delistDateSource: resolved.source,
          },
        });
      }

      if (resolved.source === "igdb") {
        // Source upgraded from null → "igdb" (we now have provenance,
        // even if the date itself is unchanged). Track it but don't
        // count as a "real" upgrade.
        fellBackToIgdb.push({ name: event.game.name });
      } else {
        upgraded.push({
          name: event.game.name,
          from: event.delistDate.toISOString(),
          to: resolved.date.toISOString(),
          fromSource: event.delistDateSource,
          toSource: resolved.source,
        });
      }

      // Polite delay between Wikipedia hits
      await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
    } catch (error) {
      errors.push({ name: event.game.name, reason: (error as Error).message });
    }
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    checked: candidates.length,
    upgraded: upgraded.length,
    fellBackToIgdb: fellBackToIgdb.length,
    errors: errors.length,
    sampleUpgrades: upgraded.slice(0, 20),
    sampleErrors: errors.slice(0, 10),
  });
}
