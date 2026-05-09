import { NextRequest, NextResponse } from "next/server";
import { DelistingType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { searchIGDBGameByName, getDelistedStatusIds } from "@/lib/igdb";
import { resolveDelistDate } from "@/lib/delist-date-lookup";

export const maxDuration = 60;

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

type Outcome = "added" | "not_delisted" | "not_found" | "already_in_catalogue";

function normalize(query: string) {
  return query.trim().toLowerCase();
}

/**
 * User-driven IGDB fallback search.
 *
 * Flow when the visitor's term has no DB match:
 *   1. Read UserSearchCache(query=normalised) — if a fresh row exists,
 *      return it untouched (no IGDB call).
 *   2. Otherwise, call searchIGDBGameByName(query) — itself cached in
 *      IgdbRequest, so duplicate queries across users coalesce.
 *   3. If IGDB has a hit AND the game's status is delisted/offline, upsert
 *      the Game and create a DELISTED DelistingEvent — visitor reloads to
 *      see it. outcome = "added".
 *   4. If IGDB has a hit but the status isn't delisted, return
 *      outcome = "not_delisted" with a message.
 *   5. If IGDB has no hit at all, outcome = "not_found".
 *
 * Each outcome is cached in UserSearchCache for 30 days.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { query?: string } | null;
  const raw = body?.query;
  if (!raw || raw.trim().length < 2) {
    return NextResponse.json(
      { error: "query must be at least 2 characters." },
      { status: 400 }
    );
  }

  const query = normalize(raw);
  const now = Date.now();

  // Cache hit → respond immediately
  const cached = await prisma.userSearchCache.findUnique({ where: { query } });
  if (cached && cached.expiresAt.getTime() > now) {
    return NextResponse.json({
      query,
      outcome: cached.outcome as Outcome,
      message: cached.message,
      igdbGameId: cached.igdbGameId,
      matchedTitle: cached.matchedTitle,
      fromCache: true,
    });
  }

  if (!env.IGDB_CLIENT_ID || !env.IGDB_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "IGDB credentials are not configured." },
      { status: 500 }
    );
  }

  // Already in our catalogue? Then there's nothing to do.
  const existing = await prisma.game.findFirst({
    where: { name: { equals: raw, mode: "insensitive" } },
    include: { events: { where: { type: DelistingType.DELISTED }, take: 1 } },
  });
  if (existing && existing.events.length > 0) {
    const message = `${existing.name} is already in the catalogue.`;
    await persist(query, "already_in_catalogue", message, existing.igdbId, existing.name);
    return NextResponse.json({
      query,
      outcome: "already_in_catalogue" as Outcome,
      message,
      igdbGameId: existing.igdbId,
      matchedTitle: existing.name,
      fromCache: false,
    });
  }

  const igdb = await searchIGDBGameByName(raw);
  if (!igdb) {
    const message = `No game found on IGDB matching "${raw}".`;
    await persist(query, "not_found", message);
    return NextResponse.json({ query, outcome: "not_found" as Outcome, message, fromCache: false });
  }

  const { ids: delistedIds } = await getDelistedStatusIds();
  const isDelisted =
    typeof igdb.status === "number" && delistedIds.includes(igdb.status);

  if (!isDelisted) {
    const message = `${igdb.name} is on IGDB but isn't flagged as delisted/offline.`;
    await persist(query, "not_delisted", message, igdb.igdbId, igdb.name);
    return NextResponse.json({
      query,
      outcome: "not_delisted" as Outcome,
      message,
      igdbGameId: igdb.igdbId,
      matchedTitle: igdb.name,
      fromCache: false,
    });
  }

  // Add to catalogue
  const game = await prisma.game.upsert({
    where: { igdbId: igdb.igdbId },
    update: {
      slug: igdb.slug,
      name: igdb.name,
      summary: igdb.summary,
      firstReleaseAt: igdb.firstReleaseAt,
      coverUrl: igdb.coverUrl,
      artworkUrls: JSON.stringify(igdb.artworkUrls),
      rating: igdb.rating,
    },
    create: {
      igdbId: igdb.igdbId,
      slug: igdb.slug,
      name: igdb.name,
      summary: igdb.summary,
      firstReleaseAt: igdb.firstReleaseAt,
      coverUrl: igdb.coverUrl,
      artworkUrls: JSON.stringify(igdb.artworkUrls),
      rating: igdb.rating,
    },
  });

  await prisma.gamePlatform.deleteMany({ where: { gameId: game.id } });
  await prisma.gameGenre.deleteMany({ where: { gameId: game.id } });

  for (const platform of igdb.platforms) {
    const dbPlatform = await prisma.platform.upsert({
      where: { slug: platform.slug },
      update: { igdbId: platform.igdbId, name: platform.name, abbreviation: platform.abbreviation },
      create: {
        igdbId: platform.igdbId,
        slug: platform.slug,
        name: platform.name,
        abbreviation: platform.abbreviation,
      },
    });
    await prisma.gamePlatform.create({ data: { gameId: game.id, platformId: dbPlatform.id } });
  }
  for (const genre of igdb.genres) {
    const dbGenre = await prisma.genre.upsert({
      where: { slug: genre.slug },
      update: { igdbId: genre.igdbId, name: genre.name },
      create: { igdbId: genre.igdbId, slug: genre.slug, name: genre.name },
    });
    await prisma.gameGenre.create({ data: { gameId: game.id, genreId: dbGenre.id } });
  }

  const existingEvent = await prisma.delistingEvent.findFirst({
    where: { gameId: game.id, type: DelistingType.DELISTED },
  });
  if (!existingEvent) {
    // Same provenance pipeline used by the bulk sync — Wikipedia →
    // SteamDB stub → IGDB updated_at. The source string is persisted so
    // the UI can flag IGDB-derived dates as approximate.
    const resolved = await resolveDelistDate({
      igdbName: igdb.name,
      igdbSlug: igdb.slug,
      igdbUpdatedAtSeconds: igdb.updatedAtSeconds,
    });
    await prisma.delistingEvent.create({
      data: {
        gameId: game.id,
        type: DelistingType.DELISTED,
        delistDate: resolved.date,
        delistDateSource: resolved.source,
        reason: "Marked offline/delisted by IGDB.",
        sourceUrl: `https://www.igdb.com/games/${igdb.slug}`,
      },
    });
  }

  const message = `Added ${igdb.name} to the catalogue. Reload to see it.`;
  await persist(query, "added", message, igdb.igdbId, igdb.name);
  return NextResponse.json({
    query,
    outcome: "added" as Outcome,
    message,
    igdbGameId: igdb.igdbId,
    matchedTitle: igdb.name,
    fromCache: false,
  });
}

async function persist(
  query: string,
  outcome: Outcome,
  message: string,
  igdbGameId?: number | null,
  matchedTitle?: string | null
) {
  const now = Date.now();
  await prisma.userSearchCache.upsert({
    where: { query },
    update: {
      outcome,
      message,
      igdbGameId: igdbGameId ?? null,
      matchedTitle: matchedTitle ?? null,
      fetchedAt: new Date(now),
      expiresAt: new Date(now + ONE_MONTH_MS),
    },
    create: {
      query,
      outcome,
      message,
      igdbGameId: igdbGameId ?? null,
      matchedTitle: matchedTitle ?? null,
      expiresAt: new Date(now + ONE_MONTH_MS),
    },
  });
}
