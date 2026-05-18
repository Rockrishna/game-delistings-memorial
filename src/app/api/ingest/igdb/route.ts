import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { fetchIGDBGamesByIds } from "@/lib/igdb";
import { callNumberFor } from "@/lib/sync-catalog";

export const maxDuration = 60;

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

export async function GET() {
  return NextResponse.json({
    configured: {
      IGDB_CLIENT_ID: !!env.IGDB_CLIENT_ID,
      IGDB_CLIENT_SECRET: !!env.IGDB_CLIENT_SECRET,
      INGEST_API_KEY: !!env.INGEST_API_KEY,
    },
  });
}

export async function POST(request: NextRequest) {
  if (!env.INGEST_API_KEY) {
    console.error("[ingest/igdb] INGEST_API_KEY is not configured");
    return NextResponse.json({ error: "INGEST_API_KEY is not configured." }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || authHeader !== `Bearer ${env.INGEST_API_KEY}`) {
    return unauthorized();
  }

  const body = (await request.json().catch(() => null)) as { igdbIds?: number[] } | null;
  const ids = body?.igdbIds ?? [];
  if (!Array.isArray(ids) || ids.some((id) => !Number.isInteger(id))) {
    return NextResponse.json({ error: "igdbIds must be an array of integers." }, { status: 400 });
  }

  try {
    const games = await fetchIGDBGamesByIds(ids);
    console.log(`[ingest/igdb] Fetched ${games.length} games from IGDB for ids: ${ids.join(",")}`);

    for (const item of games) {
      const releaseYear = item.firstReleaseAt
        ? item.firstReleaseAt.getUTCFullYear()
        : null;
      const data = {
        slug: item.slug,
        name: item.name,
        callNumber: callNumberFor(item.igdbId),
        summary: item.summary,
        firstReleaseAt: item.firstReleaseAt,
        releaseYear,
        decade: releaseYear ? `${Math.floor(releaseYear / 10) * 10}s` : null,
        coverUrl: item.coverUrl,
        artworkUrls: JSON.stringify(item.artworkUrls),
        screenshotUrls: JSON.stringify(item.screenshotUrls),
        rating: item.rating,
        aggregatedRating: item.aggregatedRating,
        totalRating: item.totalRating,
        ratingCount: item.ratingCount,
        publisher: item.publisher,
        developer: item.developer,
        ageRatings: JSON.stringify(item.ageRatings),
        websites: JSON.stringify(item.websites),
        gameModes: JSON.stringify(item.gameModes),
        themes: JSON.stringify(item.themes),
        playerPerspectives: JSON.stringify(item.playerPerspectives),
        franchise: item.franchise,
        igdbStatus: item.status,
        statusLabel: item.status === 5 ? "offline" : "delisted",
        enrichedFrom: "igdb",
        lastSyncedAt: new Date(),
      };

      const game = await prisma.game.upsert({
        where: { igdbId: item.igdbId },
        update: data,
        create: { igdbId: item.igdbId, ...data },
      });

      await prisma.gamePlatform.deleteMany({ where: { gameId: game.id } });
      await prisma.gameGenre.deleteMany({ where: { gameId: game.id } });

      for (const platform of item.platforms) {
        const dbPlatform = await prisma.platform.upsert({
          where: { slug: platform.slug },
          update: {
            igdbId: platform.igdbId ?? null,
            name: platform.name,
            abbreviation: platform.abbreviation,
          },
          create: {
            igdbId: platform.igdbId ?? null,
            slug: platform.slug,
            name: platform.name,
            abbreviation: platform.abbreviation,
          },
        });
        await prisma.gamePlatform.create({
          data: { gameId: game.id, platformId: dbPlatform.id },
        });
      }

      for (const genre of item.genres) {
        const dbGenre = await prisma.genre.upsert({
          where: { slug: genre.slug },
          update: { igdbId: genre.igdbId ?? null, name: genre.name },
          create: { igdbId: genre.igdbId ?? null, slug: genre.slug, name: genre.name },
        });
        await prisma.gameGenre.create({
          data: { gameId: game.id, genreId: dbGenre.id },
        });
      }
    }

    console.log(`[ingest/igdb] Successfully ingested ${games.length} games`);
    return NextResponse.json({ ok: true, ingested: games.length });
  } catch (error) {
    console.error("[ingest/igdb] Ingestion failed:", (error as Error).message, (error as Error).stack);
    return NextResponse.json(
      { error: "IGDB ingestion failed.", details: (error as Error).message },
      { status: 500 }
    );
  }
}
