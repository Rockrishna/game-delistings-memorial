import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { searchIGDBGameByName, getDelistedStatusIds } from "@/lib/igdb";
import { callNumberFor } from "@/lib/sync-catalog";
import { fetchRawgFallback } from "@/lib/rawg";

export const maxDuration = 60;

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

type Outcome = "added" | "not_delisted" | "not_found" | "already_in_catalogue";

function normalize(query: string) {
  return query.trim().toLowerCase();
}

/**
 * User-driven IGDB fallback search. When the visitor's term has no DB
 * match we ask IGDB; if it's a delisted/offline title we enrich and add
 * it to the catalogue. Every outcome is cached for 30 days.
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

  const existing = await prisma.game.findFirst({
    where: { name: { equals: raw, mode: "insensitive" } },
  });
  if (existing) {
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

  const releaseYear = igdb.firstReleaseAt
    ? igdb.firstReleaseAt.getUTCFullYear()
    : null;
  let publisher = igdb.publisher;
  let developer = igdb.developer;
  let metacritic: number | undefined;
  let enrichedFrom = "igdb";
  if (!publisher || !developer) {
    const rawg = await fetchRawgFallback(igdb.name);
    publisher = publisher ?? rawg.publisher;
    developer = developer ?? rawg.developer;
    metacritic = rawg.metacritic;
    if (rawg.publisher || rawg.developer) enrichedFrom = "igdb+rawg";
  }

  const data = {
    slug: igdb.slug,
    name: igdb.name,
    callNumber: callNumberFor(igdb.igdbId, igdb.platforms.map((p) => p.name), releaseYear),
    summary: igdb.summary,
    firstReleaseAt: igdb.firstReleaseAt,
    releaseYear,
    decade: releaseYear ? `${Math.floor(releaseYear / 10) * 10}s` : null,
    coverUrl: igdb.coverUrl,
    artworkUrls: JSON.stringify(igdb.artworkUrls),
    screenshotUrls: JSON.stringify(igdb.screenshotUrls),
    rating: igdb.rating,
    aggregatedRating: igdb.aggregatedRating,
    totalRating: igdb.totalRating,
    ratingCount: igdb.ratingCount,
    metacritic,
    publisher,
    developer,
    ageRatings: JSON.stringify(igdb.ageRatings),
    websites: JSON.stringify(igdb.websites),
    gameModes: JSON.stringify(igdb.gameModes),
    themes: JSON.stringify(igdb.themes),
    playerPerspectives: JSON.stringify(igdb.playerPerspectives),
    franchise: igdb.franchise,
    igdbStatus: igdb.status,
    statusLabel: igdb.status === 5 ? "offline" : "delisted",
    enrichedFrom,
    lastSyncedAt: new Date(),
  };

  const game = await prisma.game.upsert({
    where: { igdbId: igdb.igdbId },
    update: data,
    create: { igdbId: igdb.igdbId, ...data },
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
