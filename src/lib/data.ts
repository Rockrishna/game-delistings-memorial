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

const eventInclude = {
  game: {
    include: {
      platforms: { include: { platform: true } },
      genres: { include: { genre: true } },
    },
  },
} satisfies Prisma.DelistingEventInclude;

export async function getHomePageData() {
  const yearStart = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
  const [recent, upcoming, lead, totalEvents, thisYearCount, allEvents, gamesWithMetadata, platformsTracked, genresTracked, igdbCache] = await Promise.all([
    prisma.delistingEvent.findMany({
      where: { type: DelistingType.RECENT },
      include: eventInclude,
      orderBy: { delistDate: "desc" },
      take: 9,
    }),
    prisma.delistingEvent.findMany({
      where: { type: DelistingType.UPCOMING },
      include: eventInclude,
      orderBy: { delistDate: "asc" },
      take: 6,
    }),
    prisma.delistingEvent.findFirst({
      where: { type: DelistingType.RECENT },
      include: eventInclude,
      orderBy: { delistDate: "desc" },
    }),
    prisma.delistingEvent.count(),
    prisma.delistingEvent.count({
      where: {
        type: { in: [DelistingType.RECENT, DelistingType.DELISTED] },
        delistDate: { gte: yearStart },
      },
    }),
    prisma.delistingEvent.findMany({
      include: { game: { include: { platforms: { include: { platform: true } } } } },
    }),
    prisma.game.count({ where: { igdbId: { not: null } } }),
    prisma.platform.count(),
    prisma.genre.count(),
    getIgdbCacheStats(),
  ]);

  const causeCounts = new Map<string, number>();
  const platformCounts = new Map<string, number>();
  for (const event of allEvents) {
    if (event.reason) {
      const key = normaliseCause(event.reason);
      causeCounts.set(key, (causeCounts.get(key) ?? 0) + 1);
    }
    for (const platform of event.game.platforms) {
      const name = platform.platform.name;
      platformCounts.set(name, (platformCounts.get(name) ?? 0) + 1);
    }
  }

  const topCause = topEntry(causeCounts) ?? "Undisclosed";
  const topPlatform = topEntry(platformCounts) ?? "—";

  return {
    stats: {
      recent: recent.length,
      upcoming: upcoming.length,
      total: totalEvents,
      thisYear: thisYearCount,
      topCause,
      topPlatform,
      gamesWithMetadata,
      platformsTracked,
      genresTracked,
      igdbRequestsCached: igdbCache.totalRequests,
      lastIgdbSyncAt: igdbCache.lastSyncAt,
    },
    lead: lead ? mapLead(lead) : null,
    recent: recent.map(mapEventCard),
    upcoming: upcoming.map(mapEventCard),
  };
}

function normaliseCause(reason: string): string {
  const trimmed = reason.trim();
  if (!trimmed) return "Undisclosed";
  const lower = trimmed.toLowerCase();
  if (lower.includes("license") || lower.includes("licence")) return "License Expiry";
  if (lower.includes("server") || lower.includes("shutdown")) return "Service Shutdown";
  if (lower.includes("publish")) return "Publisher Decision";
  if (lower.includes("storefront") || lower.includes("store closure")) return "Storefront Closure";
  if (lower.includes("replace") || lower.includes("definitive") || lower.includes("re-release"))
    return "Replaced";
  if (lower.includes("agreement") || lower.includes("contract")) return "Agreement Lapse";
  return trimmed.length > 28 ? `${trimmed.slice(0, 25).trim()}…` : trimmed;
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
                  platform: { slug: { equals: platform.toLowerCase() } },
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
    reason: event.reason,
    coverUrl: event.game.coverUrl,
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
    status: latestEvent ? asStatus(latestEvent.type) : "recent",
    delistDate: latestEvent?.delistDate.toISOString(),
    reason: latestEvent?.reason,
    sourceUrl: latestEvent?.sourceUrl,
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
    status: asStatus(event.type),
    sourceUrl: event.sourceUrl,
    releaseYear: event.game.firstReleaseAt?.getUTCFullYear() ?? null,
    reason: event.reason ?? null,
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
    releaseYear: event.game.firstReleaseAt?.getUTCFullYear() ?? null,
    reason: event.reason ?? null,
    sourceUrl: event.sourceUrl ?? null,
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
    reason: event.reason ?? null,
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
  const causes = new Map<string, number>();
  const decades = new Map<string, number>();
  const genres = new Map<string, number>();

  for (const event of events) {
    for (const platform of event.game.platforms) {
      platforms.set(platform.platform.name, (platforms.get(platform.platform.name) ?? 0) + 1);
    }
    if (event.reason) {
      const key = normaliseCause(event.reason);
      causes.set(key, (causes.get(key) ?? 0) + 1);
    }
    if (event.game.firstReleaseAt) {
      const year = event.game.firstReleaseAt.getUTCFullYear();
      const decade = `${Math.floor(year / 10) * 10}s`;
      decades.set(decade, (decades.get(decade) ?? 0) + 1);
    }
    for (const genre of event.game.genres) {
      genres.set(genre.genre.name, (genres.get(genre.genre.name) ?? 0) + 1);
    }
  }

  function sortMap(map: Map<string, number>) {
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  }

  return {
    Platform: sortMap(platforms),
    Cause: sortMap(causes),
    Decade: sortMap(decades),
    Genre: sortMap(genres),
  };
}
