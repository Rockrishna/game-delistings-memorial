import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { fetchIGDBGamesByIds } from "@/lib/igdb";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

export async function POST(request: NextRequest) {
  if (!env.INGEST_API_KEY) {
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

    for (const item of games) {
      const game = await prisma.game.upsert({
        where: { igdbId: item.igdbId },
        update: {
          slug: item.slug,
          name: item.name,
          summary: item.summary,
          firstReleaseAt: item.firstReleaseAt,
          coverUrl: item.coverUrl,
          artworkUrls: JSON.stringify(item.artworkUrls),
          rating: item.rating,
        },
        create: {
          igdbId: item.igdbId,
          slug: item.slug,
          name: item.name,
          summary: item.summary,
          firstReleaseAt: item.firstReleaseAt,
          coverUrl: item.coverUrl,
          artworkUrls: JSON.stringify(item.artworkUrls),
          rating: item.rating,
        },
      });

      await prisma.gamePlatform.deleteMany({ where: { gameId: game.id } });
      await prisma.gameGenre.deleteMany({ where: { gameId: game.id } });

      for (const platform of item.platforms) {
        const dbPlatform = await prisma.platform.upsert({
          where: { slug: platform.slug },
          update: {
            igdbId: platform.igdbId,
            name: platform.name,
            abbreviation: platform.abbreviation,
          },
          create: {
            igdbId: platform.igdbId,
            slug: platform.slug,
            name: platform.name,
            abbreviation: platform.abbreviation,
          },
        });
        await prisma.gamePlatform.create({
          data: {
            gameId: game.id,
            platformId: dbPlatform.id,
          },
        });
      }

      for (const genre of item.genres) {
        const dbGenre = await prisma.genre.upsert({
          where: { slug: genre.slug },
          update: {
            igdbId: genre.igdbId,
            name: genre.name,
          },
          create: {
            igdbId: genre.igdbId,
            slug: genre.slug,
            name: genre.name,
          },
        });
        await prisma.gameGenre.create({
          data: {
            gameId: game.id,
            genreId: dbGenre.id,
          },
        });
      }
    }

    return NextResponse.json({ ok: true, ingested: games.length });
  } catch (error) {
    return NextResponse.json(
      { error: "IGDB ingestion failed.", details: (error as Error).message },
      { status: 500 }
    );
  }
}
