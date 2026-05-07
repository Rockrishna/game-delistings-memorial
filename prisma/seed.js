/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
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
    ["Action", "Adventure", "RPG", "Shooter", "Horror", "Fighting"].map(
      (name) =>
        prisma.genre.upsert({
          where: { slug: name.toLowerCase() },
          update: { name },
          create: { slug: name.toLowerCase(), name },
        })
    )
  );

  const games = [
    {
      slug: "the-last-of-us-part-ii",
      name: "The Last of Us Part II",
      summary:
        "An action-adventure game set in post-apocalyptic America following Ellie's journey.",
      firstReleaseAt: new Date("2020-06-19"),
      coverUrl:
        "https://images.igdb.com/igdb/image/upload/t_cover_big/co2h23.jpg",
      platformSlugs: ["playstation"],
      genreSlugs: ["action", "adventure"],
      events: [
        {
          type: "RECENT",
          delistDate: new Date("2024-02-01"),
          reason: "Storefront publishing change",
          sourceUrl: "https://www.playstation.com/",
        },
      ],
    },
    {
      slug: "persona-5",
      name: "Persona 5",
      summary:
        "A stylish turn-based RPG where high school students lead double lives as Phantom Thieves.",
      firstReleaseAt: new Date("2016-09-15"),
      coverUrl:
        "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7f.jpg",
      platformSlugs: ["playstation", "steam"],
      genreSlugs: ["rpg", "adventure"],
      events: [
        {
          type: "RECENT",
          delistDate: new Date("2024-01-20"),
          reason: "License refresh period",
          sourceUrl: "https://store.steampowered.com/",
        },
      ],
    },
    {
      slug: "cyberpunk-2077",
      name: "Cyberpunk 2077",
      summary:
        "Open-world action-adventure RPG set in Night City, featuring deep progression and choices.",
      firstReleaseAt: new Date("2020-12-10"),
      coverUrl:
        "https://images.igdb.com/igdb/image/upload/t_cover_big/co7497.jpg",
      platformSlugs: ["playstation", "xbox", "steam"],
      genreSlugs: ["rpg", "action"],
      events: [
        {
          type: "UPCOMING",
          delistDate: new Date("2026-08-30"),
          announcedAt: new Date("2026-05-01"),
          reason: "Marketplace agreement expiry",
          sourceUrl: "https://www.xbox.com/",
        },
      ],
    },
    {
      slug: "pt",
      name: "P.T.",
      summary:
        "Playable teaser for a canceled survival horror project and a notable delisting case.",
      firstReleaseAt: new Date("2014-08-12"),
      coverUrl:
        "https://images.igdb.com/igdb/image/upload/t_cover_big/co20v6.jpg",
      platformSlugs: ["playstation"],
      genreSlugs: ["horror", "adventure"],
      events: [
        {
          type: "DELISTED",
          delistDate: new Date("2015-04-29"),
          reason: "Permanent removal",
          sourceUrl: "https://www.konami.com/",
        },
      ],
    },
  ];

  for (const item of games) {
    const game = await prisma.game.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        summary: item.summary,
        firstReleaseAt: item.firstReleaseAt,
        coverUrl: item.coverUrl,
      },
      create: {
        slug: item.slug,
        name: item.name,
        summary: item.summary,
        firstReleaseAt: item.firstReleaseAt,
        coverUrl: item.coverUrl,
      },
    });

    await prisma.gamePlatform.deleteMany({ where: { gameId: game.id } });
    await prisma.gameGenre.deleteMany({ where: { gameId: game.id } });
    await prisma.delistingEvent.deleteMany({ where: { gameId: game.id } });

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

    await prisma.delistingEvent.createMany({
      data: item.events.map((event) => ({
        gameId: game.id,
        type: event.type,
        delistDate: event.delistDate,
        announcedAt: event.announcedAt ?? null,
        reason: event.reason ?? null,
        sourceUrl: event.sourceUrl ?? null,
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
