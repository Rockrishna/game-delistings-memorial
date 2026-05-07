import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PlatformBadge = "steam" | "playstation" | "xbox" | "nintendo" | "epic" | "default";
export type EventStatus = "recent" | "upcoming" | "delisted";

function asStatus(type: string): EventStatus {
  if (type === "RECENT") return "recent";
  if (type === "UPCOMING") return "upcoming";
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
  const [recent, upcoming, totalEvents] = await Promise.all([
    prisma.delistingEvent.findMany({
      where: { type: "RECENT" },
      include: eventInclude,
      orderBy: { delistDate: "desc" },
      take: 6,
    }),
    prisma.delistingEvent.findMany({
      where: { type: "UPCOMING" },
      include: eventInclude,
      orderBy: { delistDate: "asc" },
      take: 6,
    }),
    prisma.delistingEvent.count(),
  ]);

  return {
    stats: {
      recent: recent.length,
      upcoming: upcoming.length,
      total: totalEvents,
    },
    recent: recent.map(mapEventCard),
    upcoming: upcoming.map(mapEventCard),
  };
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
                { name: { contains: search } },
                { summary: { contains: search } },
                {
                  genres: {
                    some: { genre: { name: { contains: search } } },
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
      type: "DELISTED",
      game: search
        ? {
            is: {
              OR: [
                { name: { contains: search } },
                {
                  genres: {
                    some: { genre: { name: { contains: search } } },
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
  };
}

function mapTimelineItem(event: Prisma.DelistingEventGetPayload<{ include: typeof eventInclude }>) {
  return {
    id: event.game.id,
    slug: event.game.slug,
    title: event.game.name,
    platforms: event.game.platforms.map((platform) => platform.platform.name),
    platformBadges: event.game.platforms.map((platform) => asPlatformBadge(platform.platform.slug)),
    status: asStatus(event.type),
    delistDate: event.delistDate.toISOString(),
  };
}
