import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

/**
 * One-shot purge of the catalogue plus every cached IGDB response.
 *
 * Needed once to recover from the wrong-status-IDs bug: the previous sync
 * was filtering /v4/games on `status = (2,7)` which IGDB interprets as
 * alpha + rumored, so the catalogue is full of unreleased indies rather
 * than delisted titles. Wiping lets the corrected sync (status = (5,8))
 * repopulate from scratch.
 *
 * Idempotent — running it on an already-empty DB is a no-op. Returns the
 * before/after counts so the caller can confirm.
 *
 * After hitting this, follow up with POST /api/admin/sync to re-ingest.
 */
export async function POST() {
  const before = {
    events: await prisma.delistingEvent.count(),
    games: await prisma.game.count(),
    platforms: await prisma.platform.count(),
    genres: await prisma.genre.count(),
    igdbRequests: await prisma.igdbRequest.count(),
    userSearchCache: await prisma.userSearchCache.count(),
  };

  // Order matters for FK cascade safety, even though our schema declares
  // onDelete: Cascade — being explicit avoids surprises on partial deletes.
  await prisma.delistingEvent.deleteMany({});
  await prisma.gamePlatform.deleteMany({});
  await prisma.gameGenre.deleteMany({});
  await prisma.mediaAsset.deleteMany({});
  await prisma.game.deleteMany({});
  await prisma.platform.deleteMany({});
  await prisma.genre.deleteMany({});

  // Cached IGDB responses were keyed under the old status IDs; flush so the
  // next sync re-fetches with the corrected query body.
  await prisma.igdbRequest.deleteMany({});

  // User-search-cache rows recorded "not_delisted" for titles that ARE
  // delisted (Anthem etc.) because we matched against the wrong enum IDs.
  // Wipe so the next user search re-evaluates against the corrected logic.
  await prisma.userSearchCache.deleteMany({});

  const after = {
    events: await prisma.delistingEvent.count(),
    games: await prisma.game.count(),
    platforms: await prisma.platform.count(),
    genres: await prisma.genre.count(),
    igdbRequests: await prisma.igdbRequest.count(),
    userSearchCache: await prisma.userSearchCache.count(),
  };

  return NextResponse.json({
    ok: true,
    before,
    after,
    nextStep: "POST /api/admin/sync to repopulate from IGDB.",
  });
}
