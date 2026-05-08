/* eslint-disable no-console */
/**
 * Build-time seed: populates the database with curated delisting events,
 * resolving each title against IGDB so we ship real cover art and metadata.
 *
 * Idempotent: if any DelistingEvent already exists, the script is a no-op.
 * Used in Vercel buildCommand to ensure production DB is never empty.
 */

const { PrismaClient, DelistingType } = require("@prisma/client");

const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const IGDB_API_URL = "https://api.igdb.com/v4";

const CURATED = [
  { name: "P.T.", type: "DELISTED", delistDate: "2015-04-29", reason: "Pulled from PlayStation Store after Silent Hills cancellation.", sourceUrl: "https://blog.playstation.com/" },
  { name: "Scott Pilgrim vs. the World: The Game", type: "DELISTED", delistDate: "2014-12-31", reason: "Licensing rights lapsed; later re-released as a Complete Edition.", sourceUrl: "https://www.ubisoft.com/" },
  { name: "Hitman: Codename 47", type: "RECENT", delistDate: "2026-01-14", reason: "Server infrastructure retired by IO Interactive.", sourceUrl: "https://www.ioi.dk/" },
  { name: "Marvel's Avengers", type: "RECENT", delistDate: "2025-09-30", reason: "Crystal Dynamics ended live service support and pulled the title from sale.", sourceUrl: "https://playavengers.square-enix-games.com/" },
  { name: "Anthem", type: "RECENT", delistDate: "2026-04-12", reason: "EA shutting down servers and removing storefront entry.", sourceUrl: "https://www.ea.com/" },
  { name: "Brütal Legend", type: "DELISTED", delistDate: "2025-12-01", reason: "Music licensing expired; cannot be re-issued without new licences.", sourceUrl: "https://store.steampowered.com/" },
  { name: "The Crew", type: "DELISTED", delistDate: "2024-03-31", reason: "Online-only racing service shut down by Ubisoft.", sourceUrl: "https://www.ubisoft.com/" },
  { name: "Crackdown", type: "DELISTED", delistDate: "2015-12-14", reason: "Backwards-compatibility transition; original Xbox Live Arcade listing retired.", sourceUrl: "https://www.xbox.com/" },
  { name: "Forza Motorsport 7", type: "UPCOMING", delistDate: "2026-09-15", reason: "Music and vehicle licences expiring; replaced by newer entry.", sourceUrl: "https://forza.net/" },
  { name: "Battlefield 2042", type: "UPCOMING", delistDate: "2026-06-15", reason: "EA sunsetting battle pass infrastructure ahead of next title.", sourceUrl: "https://www.ea.com/" },
  { name: "Konami Anniversary Bundle", type: "UPCOMING", delistDate: "2026-05-20", reason: "Publisher-announced removal alongside license expiry.", sourceUrl: "https://www.konami.com/" },
  { name: "Ridge Racer Unbounded", type: "UPCOMING", delistDate: "2026-05-22", reason: "Bandai Namco discontinuing online services for legacy titles.", sourceUrl: "https://www.bandainamcoent.com/" },
  { name: "Grand Theft Auto IV", type: "DELISTED", delistDate: "2020-04-30", reason: "Games for Windows Live retirement and music licensing reductions.", sourceUrl: "https://www.rockstargames.com/" },
  { name: "Alan Wake", type: "DELISTED", delistDate: "2017-05-15", reason: "Music licensing expired before re-issuance under new agreements.", sourceUrl: "https://www.remedygames.com/" },
  { name: "Asura's Wrath", type: "DELISTED", delistDate: "2016-08-29", reason: "Capcom delisted from PlayStation and Xbox storefronts.", sourceUrl: "https://www.capcom.com/" },
  { name: "Deadpool", type: "DELISTED", delistDate: "2014-01-01", reason: "Activision lost the Marvel licence; later briefly relisted.", sourceUrl: "https://www.activision.com/" },
  { name: "X-Men Origins: Wolverine", type: "DELISTED", delistDate: "2014-01-01", reason: "Activision Marvel licence expiry.", sourceUrl: "https://www.activision.com/" },
  { name: "TimeShift", type: "DELISTED", delistDate: "2017-09-30", reason: "Sierra/Activision removed legacy titles from sale.", sourceUrl: "https://www.activision.com/" },
];

const CORE_PLATFORMS = [
  { slug: "steam", name: "Steam", abbreviation: "PC" },
  { slug: "playstation", name: "PlayStation", abbreviation: "PS" },
  { slug: "xbox", name: "Xbox", abbreviation: "XBOX" },
  { slug: "nintendo", name: "Nintendo", abbreviation: "NS" },
  { slug: "epic", name: "Epic Games Store", abbreviation: "EGS" },
];

let tokenCache = null;

async function getAccessToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.value;
  const id = process.env.IGDB_CLIENT_ID;
  const secret = process.env.IGDB_CLIENT_SECRET;
  if (!id || !secret) throw new Error("IGDB credentials missing");
  const url = new URL(TWITCH_TOKEN_URL);
  url.searchParams.set("client_id", id);
  url.searchParams.set("client_secret", secret);
  url.searchParams.set("grant_type", "client_credentials");
  const response = await fetch(url.toString(), { method: "POST" });
  if (!response.ok) throw new Error(`Twitch token failed (${response.status})`);
  const payload = await response.json();
  tokenCache = { value: payload.access_token, expiresAt: Date.now() + (payload.expires_in - 120) * 1000 };
  return payload.access_token;
}

async function igdbSearch(name) {
  const token = await getAccessToken();
  const escaped = name.replace(/"/g, '\\"');
  const body = `fields name,slug,summary,first_release_date,rating,cover.image_id,artworks.image_id,platforms.id,platforms.name,platforms.abbreviation,platforms.slug,genres.id,genres.name,genres.slug; search "${escaped}"; limit 5;`;
  const response = await fetch(`${IGDB_API_URL}/games`, {
    method: "POST",
    headers: {
      "Client-ID": process.env.IGDB_CLIENT_ID,
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body,
  });
  if (!response.ok) throw new Error(`IGDB query failed (${response.status})`);
  const rows = await response.json();
  if (!rows.length) return null;
  const lower = name.toLowerCase();
  const exact = rows.find((r) => r.name.toLowerCase() === lower);
  return exact ?? rows[0];
}

function imageUrl(id, size = "t_cover_big") {
  return `https://images.igdb.com/igdb/image/upload/${size}/${id}.jpg`;
}

function toSlug(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function main() {
  if (!process.env.PRISMA_DATABASE_URL && !process.env.DATABASE_URL) {
    console.log("[seed] Skipping — no database URL configured.");
    return;
  }

  const prisma = new PrismaClient();
  try {
    const existing = await prisma.delistingEvent.count();
    if (existing > 0) {
      console.log(`[seed] Skipping — DB already has ${existing} events.`);
      return;
    }

    if (!process.env.IGDB_CLIENT_ID || !process.env.IGDB_CLIENT_SECRET) {
      console.log("[seed] Skipping — IGDB credentials not configured at build time.");
      return;
    }

    console.log("[seed] Bootstrapping with curated delistings + IGDB metadata…");

    for (const platform of CORE_PLATFORMS) {
      await prisma.platform.upsert({
        where: { slug: platform.slug },
        update: platform,
        create: platform,
      });
    }

    for (const entry of CURATED) {
      try {
        const igdb = await igdbSearch(entry.name);
        if (!igdb) {
          console.log(`[seed] - ${entry.name}: not found in IGDB`);
          continue;
        }
        const slug = igdb.slug || toSlug(igdb.name);
        const game = await prisma.game.upsert({
          where: { igdbId: igdb.id },
          update: {
            slug,
            name: igdb.name,
            summary: igdb.summary,
            firstReleaseAt: igdb.first_release_date ? new Date(igdb.first_release_date * 1000) : undefined,
            coverUrl: igdb.cover?.image_id ? imageUrl(igdb.cover.image_id) : undefined,
            artworkUrls: JSON.stringify((igdb.artworks ?? []).map((a) => imageUrl(a.image_id, "t_screenshot_huge"))),
            rating: igdb.rating,
          },
          create: {
            igdbId: igdb.id,
            slug,
            name: igdb.name,
            summary: igdb.summary,
            firstReleaseAt: igdb.first_release_date ? new Date(igdb.first_release_date * 1000) : undefined,
            coverUrl: igdb.cover?.image_id ? imageUrl(igdb.cover.image_id) : undefined,
            artworkUrls: JSON.stringify((igdb.artworks ?? []).map((a) => imageUrl(a.image_id, "t_screenshot_huge"))),
            rating: igdb.rating,
          },
        });

        await prisma.gamePlatform.deleteMany({ where: { gameId: game.id } });
        await prisma.gameGenre.deleteMany({ where: { gameId: game.id } });

        for (const platform of igdb.platforms ?? []) {
          const platformSlug = platform.slug || toSlug(platform.name);
          const dbPlatform = await prisma.platform.upsert({
            where: { slug: platformSlug },
            update: { igdbId: platform.id, name: platform.name, abbreviation: platform.abbreviation },
            create: { igdbId: platform.id, slug: platformSlug, name: platform.name, abbreviation: platform.abbreviation },
          });
          await prisma.gamePlatform.create({ data: { gameId: game.id, platformId: dbPlatform.id } });
        }

        for (const genre of igdb.genres ?? []) {
          const genreSlug = genre.slug || toSlug(genre.name);
          const dbGenre = await prisma.genre.upsert({
            where: { slug: genreSlug },
            update: { igdbId: genre.id, name: genre.name },
            create: { igdbId: genre.id, slug: genreSlug, name: genre.name },
          });
          await prisma.gameGenre.create({ data: { gameId: game.id, genreId: dbGenre.id } });
        }

        await prisma.delistingEvent.deleteMany({ where: { gameId: game.id } });
        await prisma.delistingEvent.create({
          data: {
            gameId: game.id,
            type: DelistingType[entry.type],
            delistDate: new Date(entry.delistDate),
            reason: entry.reason,
            sourceUrl: entry.sourceUrl ?? null,
          },
        });

        console.log(`[seed] + ${entry.name} (igdb=${igdb.id})`);
      } catch (error) {
        console.log(`[seed] ! ${entry.name}: ${error.message}`);
      }
    }

    const after = await prisma.delistingEvent.count();
    console.log(`[seed] Done. ${after} events in DB.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error("[seed] FATAL:", error.message);
  // Don't fail the build if seeding has issues — site can still render an empty state.
  process.exit(0);
});
