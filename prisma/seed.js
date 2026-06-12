/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Mirror the helpers in src/lib/sync-catalog.ts so seeded rows carry the same
// derived call numbers and decades as IGDB-synced ones.
function callNumberFor(igdbId) {
  const klass = Math.floor(igdbId / 10);
  const item = igdbId % 10;
  return `DG.${klass}.${item}`;
}

function decadeFor(year) {
  if (!year) return null;
  return `${Math.floor(year / 10) * 10}s`;
}

async function main() {
  // Platform names are chosen so platformFamily() in src/lib/catalog.ts maps
  // each to the right storefront family (Steam, PlayStation, Xbox, Nintendo).
  const platforms = await Promise.all(
    [
      { slug: "steam", name: "Steam", abbreviation: "PC" },
      { slug: "playstation", name: "PlayStation", abbreviation: "PS" },
      { slug: "xbox", name: "Xbox", abbreviation: "XBOX" },
      { slug: "nintendo", name: "Nintendo", abbreviation: "NS" },
      { slug: "epic", name: "Epic Games Store", abbreviation: "EGS" },
    ].map((platform) =>
      prisma.platform.upsert({
        where: { slug: platform.slug },
        update: platform,
        create: platform,
      })
    )
  );

  const genres = await Promise.all(
    [
      { slug: "action", name: "Action" },
      { slug: "adventure", name: "Adventure" },
      { slug: "rpg", name: "Role-playing (RPG)" },
      { slug: "shooter", name: "Shooter" },
      { slug: "horror", name: "Horror" },
    ].map((genre) =>
      prisma.genre.upsert({
        where: { slug: genre.slug },
        update: { name: genre.name },
        create: genre,
      })
    )
  );

  // A handful of recognisable, genuinely-delisted titles. Attribute fields
  // (gameModes/themes/playerPerspectives) are stored as JSON strings, matching
  // how the sync pipeline persists them.
  const games = [
    {
      igdbId: 26432,
      slug: "the-last-of-us-part-ii",
      name: "The Last of Us Part II",
      summary:
        "An action-adventure game set in post-apocalyptic America following Ellie's journey.",
      releaseYear: 2020,
      coverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2h23.jpg",
      rating: 93,
      publisher: "Sony Interactive Entertainment",
      developer: "Naughty Dog",
      gameModes: ["Single player"],
      themes: ["Action", "Drama", "Survival"],
      playerPerspectives: ["Third person"],
      statusLabel: "delisted",
      platformSlugs: ["playstation"],
      genreSlugs: ["action", "adventure"],
    },
    {
      igdbId: 19560,
      slug: "persona-5",
      name: "Persona 5",
      summary:
        "A stylish turn-based RPG where high school students lead double lives as Phantom Thieves.",
      releaseYear: 2016,
      coverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7f.jpg",
      rating: 92,
      publisher: "Atlus",
      developer: "Atlus",
      gameModes: ["Single player"],
      themes: ["Fantasy", "Drama"],
      playerPerspectives: ["Third person", "Bird view / Isometric"],
      statusLabel: "delisted",
      platformSlugs: ["playstation"],
      genreSlugs: ["rpg", "adventure"],
    },
    {
      igdbId: 1877,
      slug: "cyberpunk-2077",
      name: "Cyberpunk 2077",
      summary:
        "Open-world action-adventure RPG set in Night City, featuring deep progression and choices.",
      releaseYear: 2020,
      coverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co7497.jpg",
      rating: 80,
      publisher: "CD Projekt",
      developer: "CD Projekt Red",
      gameModes: ["Single player"],
      themes: ["Science fiction", "Action"],
      playerPerspectives: ["First person"],
      statusLabel: "offline",
      platformSlugs: ["playstation", "xbox", "steam"],
      genreSlugs: ["rpg", "action", "shooter"],
    },
    {
      igdbId: 8954,
      slug: "pt",
      name: "P.T.",
      summary:
        "Playable teaser for a canceled survival horror project and a notable delisting case.",
      releaseYear: 2014,
      coverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co20v6.jpg",
      rating: 89,
      publisher: "Konami",
      developer: "Kojima Productions",
      gameModes: ["Single player"],
      themes: ["Horror"],
      playerPerspectives: ["First person"],
      statusLabel: "delisted",
      platformSlugs: ["playstation"],
      genreSlugs: ["horror", "adventure"],
    },
  ];

  for (const item of games) {
    const data = {
      name: item.name,
      callNumber: callNumberFor(item.igdbId),
      summary: item.summary,
      firstReleaseAt: new Date(`${item.releaseYear}-01-01`),
      releaseYear: item.releaseYear,
      decade: decadeFor(item.releaseYear),
      coverUrl: item.coverUrl,
      rating: item.rating,
      publisher: item.publisher,
      developer: item.developer,
      gameModes: JSON.stringify(item.gameModes),
      themes: JSON.stringify(item.themes),
      playerPerspectives: JSON.stringify(item.playerPerspectives),
      statusLabel: item.statusLabel,
      nsfw: false,
      enrichedFrom: "seed",
      lastSyncedAt: new Date(),
    };

    const game = await prisma.game.upsert({
      where: { slug: item.slug },
      update: { igdbId: item.igdbId, ...data },
      create: { igdbId: item.igdbId, slug: item.slug, ...data },
    });

    // Replace relation rows so re-running the seed is idempotent.
    await prisma.gamePlatform.deleteMany({ where: { gameId: game.id } });
    await prisma.gameGenre.deleteMany({ where: { gameId: game.id } });

    await prisma.gamePlatform.createMany({
      data: item.platformSlugs.map((slug) => ({
        gameId: game.id,
        platformId: platforms.find((platform) => platform.slug === slug).id,
      })),
    });

    await prisma.gameGenre.createMany({
      data: item.genreSlugs.map((slug) => ({
        gameId: game.id,
        genreId: genres.find((genre) => genre.slug === slug).id,
      })),
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed complete.");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
