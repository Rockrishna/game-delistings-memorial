import { DelistingType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getIgdbCacheStats } from "@/lib/igdb";

export type PlatformBadge = "steam" | "playstation" | "xbox" | "nintendo" | "epic" | "default";
export type EventStatus = "recent" | "upcoming" | "delisted";

function asStatus(type: DelistingType): EventStatus {
  if (type === DelistingType.RECENT) return "recent";
  if (type === DelistingType.UPCOMING) return "upcoming";
  return "delisted";
}

function asPlatformBadge(slug: string): PlatformBadge {
  const normalized = slug.toLowerCase();
  if (normalized.includes("steam")) return "steam";
  if (normalized.includes("playstation") || normalized === "ps") return "playstation";
  if (normalized.includes("xbox")) return "xbox";
  if (normalized.includes("nintendo")) return "nintendo";
  if (normalized.includes("epic")) return "epic";
  return "default";
}

/**
 * Translate a friendly family slug (the values used by the timeline filter
 * dropdown — "playstation", "nintendo", etc.) into a Prisma `where` clause
 * for the Platform table.
 *
 * IGDB platforms have version-specific slugs ("ps4", "nintendo-3ds",
 * "win", …), so an exact-equals on `Platform.slug` matches nothing for a
 * family-level dropdown value. We expand each family to a set of name
 * substrings that captures every IGDB-named platform we'd reasonably
 * expect to fall under it.
 *
 * Returns `null` when the slug isn't a known family — in that case the
 * caller should fall back to an exact slug match (so individual IGDB
 * slugs like ?platform=ps4 still work).
 */
function platformFamilyWhere(family: string): Prisma.PlatformWhereInput | null {
  switch (family.toLowerCase()) {
    case "playstation":
      return {
        OR: [{ name: { contains: "PlayStation", mode: "insensitive" } }],
      };
    case "xbox":
      return { OR: [{ name: { contains: "Xbox", mode: "insensitive" } }] };
    case "nintendo":
      return {
        OR: [
          { name: { contains: "Nintendo", mode: "insensitive" } },
          { name: { contains: "Wii", mode: "insensitive" } },
          { name: { contains: "Famicom", mode: "insensitive" } },
          { name: { contains: "Game Boy", mode: "insensitive" } },
          { name: { contains: "GameCube", mode: "insensitive" } },
          { name: { equals: "Switch", mode: "insensitive" } },
          { name: { equals: "Virtual Boy", mode: "insensitive" } },
        ],
      };
    case "pc":
    case "steam":
      return {
        OR: [
          { name: { contains: "PC", mode: "insensitive" } },
          { name: { equals: "Mac", mode: "insensitive" } },
          { name: { equals: "Linux", mode: "insensitive" } },
          { name: { contains: "DOS", mode: "insensitive" } },
        ],
      };
    case "mobile":
      return {
        OR: [
          { name: { equals: "iOS", mode: "insensitive" } },
          { name: { equals: "Android", mode: "insensitive" } },
          { name: { contains: "Mobile", mode: "insensitive" } },
          { name: { contains: "Phone", mode: "insensitive" } },
          { name: { contains: "BlackBerry", mode: "insensitive" } },
        ],
      };
    case "web":
      return {
        OR: [
          { name: { contains: "Web", mode: "insensitive" } },
          { name: { contains: "Browser", mode: "insensitive" } },
          { name: { contains: "Stadia", mode: "insensitive" } },
        ],
      };
    default:
      return null;
  }
}

const eventInclude = {
  game: {
    include: {
      platforms: { include: { platform: true } },
      genres: { include: { genre: true } },
    },
  },
} satisfies Prisma.DelistingEventInclude;

export async function getHomePageData() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    recent,
    lead,
    totalEvents,
    last30DaysCount,
    allEvents,
    ratingAgg,
    topRatedRows,
    gamesWithMetadata,
    platformsTracked,
    genresTracked,
    igdbCache,
  ] = await Promise.all([
    prisma.delistingEvent.findMany({
      where: { type: DelistingType.DELISTED },
      include: eventInclude,
      orderBy: { delistDate: "desc" },
      take: 9,
    }),
    prisma.delistingEvent.findFirst({
      where: { type: DelistingType.DELISTED },
      include: eventInclude,
      orderBy: { delistDate: "desc" },
    }),
    prisma.delistingEvent.count(),
    prisma.delistingEvent.count({
      where: {
        type: DelistingType.DELISTED,
        delistDate: { gte: thirtyDaysAgo },
      },
    }),
    prisma.delistingEvent.findMany({
      where: { type: DelistingType.DELISTED },
      include: { game: { include: { platforms: { include: { platform: true } } } } },
    }),
    prisma.game.aggregate({
      where: { rating: { not: null } },
      _avg: { rating: true },
    }),
    // Top-rated delisted games to feature on the home page
    prisma.delistingEvent.findMany({
      where: { type: DelistingType.DELISTED, game: { rating: { not: null } } },
      include: eventInclude,
      orderBy: { game: { rating: "desc" } },
      take: 6,
    }),
    prisma.game.count({ where: { igdbId: { not: null } } }),
    prisma.platform.count(),
    prisma.genre.count(),
    getIgdbCacheStats(),
  ]);

  const platformCounts = new Map<string, number>();
  const genreCounts = new Map<string, number>();
  for (const event of allEvents) {
    for (const platform of event.game.platforms) {
      const name = platform.platform.name;
      platformCounts.set(name, (platformCounts.get(name) ?? 0) + 1);
    }
  }

  // Genre counts pulled from a lighter query to avoid bloating allEvents
  const allGenres = await prisma.gameGenre.findMany({
    include: { genre: { select: { name: true } } },
  });
  for (const row of allGenres) {
    const name = row.genre.name;
    genreCounts.set(name, (genreCounts.get(name) ?? 0) + 1);
  }

  const topPlatform = topEntry(platformCounts) ?? "—";
  const topGenre = topEntry(genreCounts) ?? "—";
  const averageRating = ratingAgg._avg.rating ? Math.round(ratingAgg._avg.rating) : null;

  return {
    stats: {
      total: totalEvents,
      recent: recent.length,
      last30Days: last30DaysCount,
      topPlatform,
      topGenre,
      averageRating,
      gamesWithMetadata,
      platformsTracked,
      genresTracked,
      igdbRequestsCached: igdbCache.totalRequests,
      lastIgdbSyncAt: igdbCache.lastSyncAt,
    },
    lead: lead ? mapLead(lead) : null,
    recent: recent.map(mapEventCard),
    topRated: topRatedRows.map(mapEventCard),
  };
}

function topEntry(map: Map<string, number>): string | null {
  let best: [string, number] | null = null;
  for (const entry of map.entries()) {
    if (!best || entry[1] > best[1]) best = entry;
  }
  return best ? best[0] : null;
}

export async function getTimelineData({
  search,
  platform,
  sort,
}: {
  search?: string;
  platform?: string;
  sort?: "newest" | "oldest" | "alphabetical";
}) {
  const where: Prisma.DelistingEventWhereInput = {
    game: {
      is: {
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { summary: { contains: search, mode: "insensitive" as const } },
                {
                  genres: {
                    some: { genre: { name: { contains: search, mode: "insensitive" as const } } },
                  },
                },
              ],
            }
          : {}),
        ...(platform
          ? {
              platforms: {
                some: {
                  platform:
                    platformFamilyWhere(platform) ?? {
                      slug: { equals: platform.toLowerCase() },
                    },
                },
              },
            }
          : {}),
      },
    },
  };

  const orderBy: Prisma.DelistingEventOrderByWithRelationInput[] =
    sort === "oldest"
      ? [{ delistDate: "asc" }]
      : sort === "alphabetical"
      ? [{ game: { name: "asc" } }]
      : [{ delistDate: "desc" }];

  const events = await prisma.delistingEvent.findMany({
    where,
    include: eventInclude,
    orderBy,
    take: 150,
  });

  const grouped = new Map<string, { id: string; month: string; year: number; sortKey: number; games: ReturnType<typeof mapTimelineItem>[] }>();
  for (const event of events) {
    const keyDate = event.delistDate;
    const month = keyDate.toLocaleString("en-US", { month: "long" });
    const year = keyDate.getUTCFullYear();
    const key = `${year}-${String(keyDate.getUTCMonth() + 1).padStart(2, "0")}`;
    if (!grouped.has(key)) {
      grouped.set(key, { id: key, month, year, sortKey: Date.UTC(year, keyDate.getUTCMonth(), 1), games: [] });
    }
    grouped.get(key)!.games.push(mapTimelineItem(event));
  }

  return [...grouped.values()].sort((a, b) => (sort === "oldest" ? a.sortKey - b.sortKey : b.sortKey - a.sortKey));
}

export async function getMortuaryData(search?: string) {
  const rows = await prisma.delistingEvent.findMany({
    where: {
      type: DelistingType.DELISTED,
      game: search
        ? {
            is: {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                {
                  genres: {
                    some: { genre: { name: { contains: search, mode: "insensitive" as const } } },
                  },
                },
              ],
            },
          }
        : undefined,
    },
    include: eventInclude,
    orderBy: { delistDate: "desc" },
    take: 100,
  });

  return rows.map((event) => ({
    id: event.game.id,
    title: event.game.name,
    releaseYear: event.game.firstReleaseAt?.getUTCFullYear() ?? null,
    platforms: event.game.platforms.map((platform) => platform.platform.name),
    platformBadges: event.game.platforms.map((platform) => asPlatformBadge(platform.platform.slug)),
    genres: event.game.genres.map((genre) => genre.genre.name),
    delistDate: event.delistDate.toISOString(),
    delistDateSource: event.delistDateSource ?? null,
    coverUrl: event.game.coverUrl,
    rating: event.game.rating ?? null,
  }));
}

export async function getGameDetailById(id: string) {
  const game = await prisma.game.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: {
      platforms: { include: { platform: true } },
      genres: { include: { genre: true } },
      events: { orderBy: { delistDate: "desc" } },
    },
  });
  if (!game) return null;

  const latestEvent = game.events[0] ?? null;
  return {
    id: game.id,
    slug: game.slug,
    title: game.name,
    summary: game.summary,
    releaseDate: game.firstReleaseAt?.toISOString(),
    coverUrl: game.coverUrl,
    platforms: game.platforms.map((platform) => platform.platform.name),
    platformBadges: game.platforms.map((platform) => asPlatformBadge(platform.platform.slug)),
    genres: game.genres.map((genre) => genre.genre.name),
    status: latestEvent ? asStatus(latestEvent.type) : "delisted",
    delistDate: latestEvent?.delistDate.toISOString(),
    delistDateSource: latestEvent?.delistDateSource ?? null,
    sourceUrl: latestEvent?.sourceUrl,
    rating: game.rating ?? null,
  };
}

function mapEventCard(event: Prisma.DelistingEventGetPayload<{ include: typeof eventInclude }>) {
  return {
    id: event.game.id,
    slug: event.game.slug,
    title: event.game.name,
    coverUrl: event.game.coverUrl,
    platforms: event.game.platforms.map((platform) => platform.platform.name),
    platformBadges: event.game.platforms.map((platform) => asPlatformBadge(platform.platform.slug)),
    delistDate: event.delistDate.toISOString(),
    delistDateSource: event.delistDateSource ?? null,
    status: asStatus(event.type),
    sourceUrl: event.sourceUrl,
    releaseYear: event.game.firstReleaseAt?.getUTCFullYear() ?? null,
    rating: event.game.rating ?? null,
    daysFromNow: Math.round((event.delistDate.getTime() - Date.now()) / 86_400_000),
  };
}

function mapLead(event: Prisma.DelistingEventGetPayload<{ include: typeof eventInclude }>) {
  return {
    id: event.game.id,
    slug: event.game.slug,
    title: event.game.name,
    summary: event.game.summary ?? null,
    coverUrl: event.game.coverUrl,
    platforms: event.game.platforms.map((platform) => platform.platform.name),
    genres: event.game.genres.map((genre) => genre.genre.name),
    delistDate: event.delistDate.toISOString(),
    delistDateSource: event.delistDateSource ?? null,
    releaseYear: event.game.firstReleaseAt?.getUTCFullYear() ?? null,
    sourceUrl: event.sourceUrl ?? null,
    rating: event.game.rating ?? null,
  };
}

function mapTimelineItem(event: Prisma.DelistingEventGetPayload<{ include: typeof eventInclude }>) {
  return {
    id: event.game.id,
    slug: event.game.slug,
    title: event.game.name,
    coverUrl: event.game.coverUrl,
    platforms: event.game.platforms.map((platform) => platform.platform.name),
    platformBadges: event.game.platforms.map((platform) => asPlatformBadge(platform.platform.slug)),
    status: asStatus(event.type),
    delistDate: event.delistDate.toISOString(),
    delistDateSource: event.delistDateSource ?? null,
    rating: event.game.rating ?? null,
    releaseYear: event.game.firstReleaseAt?.getUTCFullYear() ?? null,
    daysFromNow: Math.round((event.delistDate.getTime() - Date.now()) / 86_400_000),
  };
}

export async function getMortuaryFacets() {
  const events = await prisma.delistingEvent.findMany({
    where: { type: DelistingType.DELISTED },
    include: {
      game: {
        include: { platforms: { include: { platform: true } }, genres: { include: { genre: true } } },
      },
    },
  });

  const platforms = new Map<string, number>();
  const decades = new Map<string, number>();
  const genres = new Map<string, number>();
  const ratings = new Map<string, number>();

  for (const event of events) {
    for (const platform of event.game.platforms) {
      platforms.set(platform.platform.name, (platforms.get(platform.platform.name) ?? 0) + 1);
    }
    if (event.game.firstReleaseAt) {
      const year = event.game.firstReleaseAt.getUTCFullYear();
      const decade = `${Math.floor(year / 10) * 10}s`;
      decades.set(decade, (decades.get(decade) ?? 0) + 1);
    }
    for (const genre of event.game.genres) {
      genres.set(genre.genre.name, (genres.get(genre.genre.name) ?? 0) + 1);
    }
    const ratingBucket = ratingToBucket(event.game.rating);
    if (ratingBucket) {
      ratings.set(ratingBucket, (ratings.get(ratingBucket) ?? 0) + 1);
    }
  }

  function sortMap(map: Map<string, number>) {
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  }

  return {
    Platform: sortMap(platforms),
    Genre: sortMap(genres),
    Decade: sortMap(decades),
    Rating: sortMap(ratings),
  };
}

function ratingToBucket(rating: number | null): string | null {
  if (rating == null) return "Unrated";
  if (rating >= 90) return "90+";
  if (rating >= 80) return "80–89";
  if (rating >= 70) return "70–79";
  if (rating >= 60) return "60–69";
  if (rating >= 50) return "50–59";
  return "<50";
}
