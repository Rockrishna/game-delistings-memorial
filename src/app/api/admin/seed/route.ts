import { NextRequest, NextResponse } from "next/server";
import { DelistingType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { searchIGDBGameByName, type NormalizedIGDBGame } from "@/lib/igdb";

export const maxDuration = 300;

type CuratedEntry = {
  name: string;
  type: DelistingType;
  delistDate: string;
  reason: string;
  sourceUrl?: string;
};

const CURATED: CuratedEntry[] = [
  {
    name: "P.T.",
    type: DelistingType.DELISTED,
    delistDate: "2015-04-29",
    reason: "Pulled from PlayStation Store after Silent Hills cancellation.",
    sourceUrl: "https://blog.playstation.com/",
  },
  {
    name: "Scott Pilgrim vs. the World: The Game",
    type: DelistingType.DELISTED,
    delistDate: "2014-12-31",
    reason: "Licensing rights lapsed; later re-released as a Complete Edition.",
    sourceUrl: "https://www.ubisoft.com/",
  },
  {
    name: "Hitman: Codename 47",
    type: DelistingType.RECENT,
    delistDate: "2026-01-14",
    reason: "Server infrastructure retired by IO Interactive.",
    sourceUrl: "https://www.ioi.dk/",
  },
  {
    name: "Marvel's Avengers",
    type: DelistingType.RECENT,
    delistDate: "2025-09-30",
    reason: "Crystal Dynamics ended live service support and pulled the title from sale.",
    sourceUrl: "https://playavengers.square-enix-games.com/",
  },
  {
    name: "Anthem",
    type: DelistingType.RECENT,
    delistDate: "2026-04-12",
    reason: "EA shutting down servers and removing storefront entry.",
    sourceUrl: "https://www.ea.com/",
  },
  {
    name: "Brütal Legend",
    type: DelistingType.DELISTED,
    delistDate: "2025-12-01",
    reason: "Music licensing expired; cannot be re-issued without new licences.",
    sourceUrl: "https://store.steampowered.com/",
  },
  {
    name: "The Crew",
    type: DelistingType.DELISTED,
    delistDate: "2024-03-31",
    reason: "Online-only racing service shut down by Ubisoft.",
    sourceUrl: "https://www.ubisoft.com/",
  },
  {
    name: "Crackdown",
    type: DelistingType.DELISTED,
    delistDate: "2015-12-14",
    reason: "Backwards-compatibility transition; original Xbox Live Arcade listing retired.",
    sourceUrl: "https://www.xbox.com/",
  },
  {
    name: "Forza Motorsport 7",
    type: DelistingType.UPCOMING,
    delistDate: "2026-09-15",
    reason: "Music and vehicle licences expiring; replaced by newer entry.",
    sourceUrl: "https://forza.net/",
  },
  {
    name: "Battlefield 2042",
    type: DelistingType.UPCOMING,
    delistDate: "2026-06-15",
    reason: "EA sunsetting battle pass infrastructure ahead of next title.",
    sourceUrl: "https://www.ea.com/",
  },
  {
    name: "Konami Anniversary Bundle",
    type: DelistingType.UPCOMING,
    delistDate: "2026-05-20",
    reason: "Publisher-announced removal alongside license expiry.",
    sourceUrl: "https://www.konami.com/",
  },
  {
    name: "Ridge Racer Unbounded",
    type: DelistingType.UPCOMING,
    delistDate: "2026-05-22",
    reason: "Bandai Namco discontinuing online services for legacy titles.",
    sourceUrl: "https://www.bandainamcoent.com/",
  },
  {
    name: "Grand Theft Auto IV",
    type: DelistingType.DELISTED,
    delistDate: "2020-04-30",
    reason: "Games for Windows Live retirement and music licensing reductions.",
    sourceUrl: "https://www.rockstargames.com/",
  },
  {
    name: "Alan Wake",
    type: DelistingType.DELISTED,
    delistDate: "2017-05-15",
    reason: "Music licensing expired before re-issuance under new agreements.",
    sourceUrl: "https://www.remedygames.com/",
  },
  {
    name: "Asura's Wrath",
    type: DelistingType.DELISTED,
    delistDate: "2016-08-29",
    reason: "Capcom delisted from PlayStation and Xbox storefronts.",
    sourceUrl: "https://www.capcom.com/",
  },
  {
    name: "Deadpool",
    type: DelistingType.DELISTED,
    delistDate: "2014-01-01",
    reason: "Activision lost the Marvel licence; later briefly relisted.",
    sourceUrl: "https://www.activision.com/",
  },
  {
    name: "X-Men Origins: Wolverine",
    type: DelistingType.DELISTED,
    delistDate: "2014-01-01",
    reason: "Activision Marvel licence expiry.",
    sourceUrl: "https://www.activision.com/",
  },
  {
    name: "TimeShift",
    type: DelistingType.DELISTED,
    delistDate: "2017-09-30",
    reason: "Sierra/Activision removed legacy titles from sale.",
    sourceUrl: "https://www.activision.com/",
  },
];

async function ensureCorePlatformsAndGenres() {
  const platforms = [
    { slug: "steam", name: "Steam", abbreviation: "PC" },
    { slug: "playstation", name: "PlayStation", abbreviation: "PS" },
    { slug: "xbox", name: "Xbox", abbreviation: "XBOX" },
    { slug: "nintendo", name: "Nintendo", abbreviation: "NS" },
    { slug: "epic", name: "Epic Games Store", abbreviation: "EGS" },
  ];
  for (const platform of platforms) {
    await prisma.platform.upsert({
      where: { slug: platform.slug },
      update: platform,
      create: platform,
    });
  }
}

async function upsertGameFromIgdb(record: NormalizedIGDBGame) {
  const game = await prisma.game.upsert({
    where: { igdbId: record.igdbId },
    update: {
      slug: record.slug,
      name: record.name,
      summary: record.summary,
      firstReleaseAt: record.firstReleaseAt,
      coverUrl: record.coverUrl,
      artworkUrls: JSON.stringify(record.artworkUrls),
      rating: record.rating,
    },
    create: {
      igdbId: record.igdbId,
      slug: record.slug,
      name: record.name,
      summary: record.summary,
      firstReleaseAt: record.firstReleaseAt,
      coverUrl: record.coverUrl,
      artworkUrls: JSON.stringify(record.artworkUrls),
      rating: record.rating,
    },
  });

  await prisma.gamePlatform.deleteMany({ where: { gameId: game.id } });
  await prisma.gameGenre.deleteMany({ where: { gameId: game.id } });

  for (const platform of record.platforms) {
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
    await prisma.gamePlatform.create({
      data: { gameId: game.id, platformId: dbPlatform.id },
    });
  }

  for (const genre of record.genres) {
    const dbGenre = await prisma.genre.upsert({
      where: { slug: genre.slug },
      update: { igdbId: genre.igdbId, name: genre.name },
      create: { igdbId: genre.igdbId, slug: genre.slug, name: genre.name },
    });
    await prisma.gameGenre.create({
      data: { gameId: game.id, genreId: dbGenre.id },
    });
  }

  return game;
}

export async function GET() {
  return NextResponse.json({
    configured: {
      INGEST_API_KEY: !!env.INGEST_API_KEY,
      IGDB_CLIENT_ID: !!env.IGDB_CLIENT_ID,
      IGDB_CLIENT_SECRET: !!env.IGDB_CLIENT_SECRET,
    },
    curatedCount: CURATED.length,
    instructions:
      "POST with `Authorization: Bearer <INGEST_API_KEY>` to seed the database with the curated list and IGDB metadata. Idempotent — re-runs upsert.",
  });
}

export async function POST(request: NextRequest) {
  if (!env.IGDB_CLIENT_ID || !env.IGDB_CLIENT_SECRET) {
    return NextResponse.json({ error: "IGDB credentials are not configured." }, { status: 500 });
  }

  const existingEventCount = await prisma.delistingEvent.count();
  const authHeader = request.headers.get("authorization");
  const validAuth = !!env.INGEST_API_KEY && authHeader === `Bearer ${env.INGEST_API_KEY}`;
  const allowBootstrap = existingEventCount === 0;

  if (!validAuth && !allowBootstrap) {
    return NextResponse.json(
      {
        error:
          "Unauthorized. Database already has events; further re-seeds require Authorization: Bearer <INGEST_API_KEY>.",
      },
      { status: 401 }
    );
  }

  await ensureCorePlatformsAndGenres();

  const summary: Array<{ name: string; status: string; igdbId?: number }> = [];
  for (const entry of CURATED) {
    try {
      const igdb = await searchIGDBGameByName(entry.name);
      if (!igdb) {
        summary.push({ name: entry.name, status: "not_found_in_igdb" });
        continue;
      }
      const game = await upsertGameFromIgdb(igdb);
      await prisma.delistingEvent.deleteMany({ where: { gameId: game.id } });
      await prisma.delistingEvent.create({
        data: {
          gameId: game.id,
          type: entry.type,
          delistDate: new Date(entry.delistDate),
          reason: entry.reason,
          sourceUrl: entry.sourceUrl ?? null,
        },
      });
      summary.push({ name: entry.name, status: "ok", igdbId: igdb.igdbId });
    } catch (error) {
      summary.push({ name: entry.name, status: `error: ${(error as Error).message}` });
    }
  }

  const total = await prisma.delistingEvent.count();
  return NextResponse.json({ ok: true, processed: summary.length, total, summary });
}
