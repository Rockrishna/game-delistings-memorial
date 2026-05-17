import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type GameCard = {
  id: string;
  slug: string;
  callNumber: string;
  title: string;
  year: number | null;
  decade: string | null;
  platforms: string[];
  publisher: string | null;
  developer: string | null;
  genres: string[];
  rating: number | null;
  statusLabel: string;
  coverUrl: string | null;
};

const gameInclude = {
  platforms: { include: { platform: true } },
  genres: { include: { genre: true } },
} satisfies Prisma.GameInclude;

type GameWithRels = Prisma.GameGetPayload<{ include: typeof gameInclude }>;

// Friendly storefront/family buckets the UI groups platforms into.
const PLATFORM_FAMILIES: Array<{ name: string; match: (n: string) => boolean }> = [
  { name: "Steam", match: (n) => /windows|\bpc\b|mac|linux|dos|steam/.test(n) },
  { name: "PlayStation", match: (n) => /playstation|^ps[0-9 ]|vita|psp/.test(n) },
  { name: "Xbox", match: (n) => /xbox/.test(n) },
  { name: "Nintendo", match: (n) => /nintendo|wii|switch|game ?boy|famicom|gamecube|virtual boy|3ds|\bds\b/.test(n) },
  { name: "iOS", match: (n) => /\bios\b|iphone|ipad/.test(n) },
  { name: "Android", match: (n) => /android/.test(n) },
  { name: "Epic", match: (n) => /epic/.test(n) },
];

export function platformFamily(name: string): string {
  const n = name.toLowerCase();
  for (const fam of PLATFORM_FAMILIES) if (fam.match(n)) return fam.name;
  return "Other";
}

function ratingBucket(rating: number | null): string {
  if (rating == null) return "Unrated";
  if (rating >= 90) return "≥ 90";
  if (rating >= 80) return "80–89";
  if (rating >= 70) return "70–79";
  if (rating >= 60) return "60–69";
  return "< 60";
}

function toCard(g: GameWithRels): GameCard {
  return {
    id: g.id,
    slug: g.slug,
    callNumber: g.callNumber,
    title: g.name,
    year: g.releaseYear,
    decade: g.decade,
    platforms: [...new Set(g.platforms.map((p) => platformFamily(p.platform.name)))],
    publisher: g.publisher,
    developer: g.developer,
    genres: g.genres.map((x) => x.genre.name),
    rating: g.rating == null ? null : Math.round(g.rating),
    statusLabel: g.statusLabel,
    coverUrl: g.coverUrl,
  };
}

/* ---------------- Overview ---------------- */

export async function getOverview() {
  const games = await prisma.game.findMany({
    select: {
      decade: true,
      publisher: true,
      platforms: { select: { platform: { select: { name: true } } } },
    },
  });

  const total = games.length;
  const byFamily = new Map<string, number>();
  const decades = new Set<string>();
  const publishers = new Set<string>();

  for (const g of games) {
    if (g.decade) decades.add(g.decade);
    if (g.publisher) publishers.add(g.publisher);
    const fams = new Set(g.platforms.map((p) => platformFamily(p.platform.name)));
    for (const f of fams) byFamily.set(f, (byFamily.get(f) ?? 0) + 1);
  }

  const byPlatform = [...byFamily.entries()]
    .filter(([name]) => name !== "Other")
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      count,
      pct: total ? Math.round((count / total) * 100) : 0,
    }));

  return {
    total,
    byPlatform,
    drawers: byPlatform.length,
    decadesCovered: decades.size,
    publishers: publishers.size,
  };
}

/* ---------------- Catalog ---------------- */

export type CatalogQuery = {
  search?: string;
  platform?: string[];
  decade?: string[];
  genre?: string[];
  publisher?: string[];
  rating?: string[];
  sort?: "title" | "rating" | "year";
  page?: number;
  pageSize?: number;
};

export type Facets = {
  Platform: Array<{ name: string; count: number }>;
  Decade: Array<{ name: string; count: number }>;
  Genre: Array<{ name: string; count: number }>;
  Publisher: Array<{ name: string; count: number }>;
  Rating: Array<{ name: string; count: number }>;
};

function matchesQuery(card: GameCard, q: CatalogQuery): boolean {
  if (q.search) {
    const s = q.search.toLowerCase();
    const hay = [card.title, card.publisher, card.developer, ...card.genres]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!hay.includes(s)) return false;
  }
  if (q.platform?.length && !q.platform.some((p) => card.platforms.includes(p)))
    return false;
  if (q.decade?.length && (!card.decade || !q.decade.includes(card.decade)))
    return false;
  if (q.genre?.length && !q.genre.some((g) => card.genres.includes(g)))
    return false;
  if (q.publisher?.length && (!card.publisher || !q.publisher.includes(card.publisher)))
    return false;
  if (q.rating?.length && !q.rating.includes(ratingBucket(card.rating)))
    return false;
  return true;
}

export async function getCatalog(q: CatalogQuery) {
  const rows = await prisma.game.findMany({ include: gameInclude });
  const cards = rows.map(toCard);

  const filtered = cards.filter((c) => matchesQuery(c, q));

  const sort = q.sort ?? "title";
  filtered.sort((a, b) => {
    if (sort === "rating") return (b.rating ?? -1) - (a.rating ?? -1);
    if (sort === "year") return (b.year ?? 0) - (a.year ?? 0);
    return a.title.localeCompare(b.title);
  });

  const page = Math.max(1, q.page ?? 1);
  const pageSize = Math.min(120, Math.max(1, q.pageSize ?? 24));
  const start = (page - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  return {
    total: filtered.length,
    page,
    pageSize,
    pages: Math.max(1, Math.ceil(filtered.length / pageSize)),
    rows: pageRows,
    facets: buildFacets(cards),
  };
}

function buildFacets(cards: GameCard[]): Facets {
  const platform = new Map<string, number>();
  const decade = new Map<string, number>();
  const genre = new Map<string, number>();
  const publisher = new Map<string, number>();
  const rating = new Map<string, number>();

  for (const c of cards) {
    for (const p of c.platforms) if (p !== "Other") platform.set(p, (platform.get(p) ?? 0) + 1);
    if (c.decade) decade.set(c.decade, (decade.get(c.decade) ?? 0) + 1);
    for (const g of c.genres) genre.set(g, (genre.get(g) ?? 0) + 1);
    if (c.publisher) publisher.set(c.publisher, (publisher.get(c.publisher) ?? 0) + 1);
    rating.set(ratingBucket(c.rating), (rating.get(ratingBucket(c.rating)) ?? 0) + 1);
  }

  const sortByCount = (m: Map<string, number>, limit?: number) => {
    const arr = [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
    return limit ? arr.slice(0, limit) : arr;
  };
  const ratingOrder = ["≥ 90", "80–89", "70–79", "60–69", "< 60", "Unrated"];

  return {
    Platform: sortByCount(platform),
    Decade: [...decade.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([name, count]) => ({ name, count })),
    Genre: sortByCount(genre, 24),
    Publisher: sortByCount(publisher, 24),
    Rating: ratingOrder
      .filter((r) => rating.has(r))
      .map((name) => ({ name, count: rating.get(name) ?? 0 })),
  };
}

/* ---------------- Insights ---------------- */

export async function getInsights() {
  const rows = await prisma.game.findMany({ include: gameInclude });
  const cards = rows.map(toCard);
  const total = cards.length;

  const familyCounts = new Map<string, number>();
  const decadeCounts = new Map<string, number>();
  const genreCounts = new Map<string, number>();
  const publisherCounts = new Map<string, number>();
  const ratings: number[] = [];

  const heatDecades = ["1990s", "2000s", "2010s", "2020s"];
  const heatFamilies = ["Steam", "PlayStation", "Xbox", "Nintendo", "iOS", "Android"];
  const heat: Record<string, Record<string, number>> = {};
  for (const f of heatFamilies) heat[f] = Object.fromEntries(heatDecades.map((d) => [d, 0]));

  for (const c of cards) {
    if (c.decade) decadeCounts.set(c.decade, (decadeCounts.get(c.decade) ?? 0) + 1);
    for (const g of c.genres) genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1);
    if (c.publisher) publisherCounts.set(c.publisher, (publisherCounts.get(c.publisher) ?? 0) + 1);
    if (c.rating != null) ratings.push(c.rating);
    for (const fam of c.platforms) {
      if (fam === "Other") continue;
      familyCounts.set(fam, (familyCounts.get(fam) ?? 0) + 1);
      if (heat[fam] && c.decade && heat[fam][c.decade] != null) heat[fam][c.decade] += 1;
    }
  }

  ratings.sort((a, b) => a - b);
  const median = ratings.length
    ? ratings[Math.floor(ratings.length / 2)]
    : null;

  const topPlatform = [...familyCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
  const topDecade = [...decadeCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

  const topGenre = [...genreCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
  const topPublisher = [...publisherCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
  const earliestDecade = [...decadeCounts.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  )[0] ?? null;
  const acclaimed = ratings.filter((r) => r >= 80).length;
  const lowRated = ratings.filter((r) => r < 60).length;

  const enc = encodeURIComponent;
  const attributePatterns = [
    topGenre && {
      count: topGenre[1],
      title: `${topGenre[0]} dominated`,
      blurb: `The genre with the most withdrawn titles in the catalogue.`,
      href: `/catalog?genre=${enc(topGenre[0])}`,
    },
    topPlatform && {
      count: topPlatform[1],
      title: `${topPlatform[0]} casualties`,
      blurb: `More games left this storefront than any other.`,
      href: `/catalog?platform=${enc(topPlatform[0])}`,
    },
    topDecade && {
      count: topDecade[1],
      title: `The ${topDecade[0]} were hit hardest`,
      blurb: `The release decade that lost the most titles.`,
      href: `/catalog?decade=${enc(topDecade[0])}`,
    },
    topPublisher && {
      count: topPublisher[1],
      title: `${topPublisher[0]} lost the most`,
      blurb: `The publisher with the largest delisted back-catalogue.`,
      href: `/catalog?publisher=${enc(topPublisher[0])}`,
    },
    {
      count: acclaimed,
      title: `Acclaimed yet pulled`,
      blurb: `Delisted games that still scored 80+ on IGDB.`,
      href: `/catalog?rating=${enc("≥ 90")}&rating=${enc("80–89")}`,
    },
    earliestDecade && {
      count: earliestDecade[1],
      title: `Legacy losses · ${earliestDecade[0]}`,
      blurb: `The oldest cohort of withdrawn titles still on record.`,
      href: `/catalog?decade=${enc(earliestDecade[0])}`,
    },
    {
      count: lowRated,
      title: `Quietly forgotten`,
      blurb: `Lower-rated titles (under 60) that slipped away.`,
      href: `/catalog?rating=${enc("< 60")}`,
    },
  ].filter(Boolean) as Array<{
    count: number;
    title: string;
    blurb: string;
    href: string;
  }>;

  const histBuckets = [
    { bucket: "0–20", lo: 0, hi: 20 },
    { bucket: "20–40", lo: 20, hi: 40 },
    { bucket: "40–60", lo: 40, hi: 60 },
    { bucket: "60–70", lo: 60, hi: 70 },
    { bucket: "70–80", lo: 70, hi: 80 },
    { bucket: "80–90", lo: 80, hi: 90 },
    { bucket: "90–100", lo: 90, hi: 101 },
  ].map((b) => ({
    bucket: b.bucket,
    count: ratings.filter((r) => r >= b.lo && r < b.hi).length,
  }));

  return {
    total,
    topPlatform: topPlatform
      ? { name: topPlatform[0], count: topPlatform[1], pct: Math.round((topPlatform[1] / total) * 100) }
      : null,
    topDecade: topDecade
      ? { name: topDecade[0], count: topDecade[1], pct: Math.round((topDecade[1] / total) * 100) }
      : null,
    medianRating: median,
    heatmap: {
      platforms: heatFamilies,
      decades: heatDecades,
      values: heatFamilies.map((f) => heatDecades.map((d) => heat[f][d])),
    },
    byGenre: [...genreCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 9)
      .map(([name, count]) => ({ name, count })),
    byPublisher: [...publisherCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count })),
    ratingHist: histBuckets,
    attributePatterns,
  };
}

/* ---------------- Record ---------------- */

function parseJsonArray<T>(value: string | null): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export async function getRecord(slug: string) {
  const g = await prisma.game.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    include: gameInclude,
  });
  if (!g) return null;

  const insights = await prisma.game.aggregate({
    where: { rating: { not: null } },
    _avg: { rating: true },
  });
  const medianRating = insights._avg.rating ? Math.round(insights._avg.rating) : null;

  const adjacent = await prisma.game.findMany({
    where: {
      id: { not: g.id },
      OR: [
        g.publisher ? { publisher: g.publisher } : {},
        g.decade ? { decade: g.decade } : {},
      ],
    },
    include: gameInclude,
    take: 4,
    orderBy: { rating: "desc" },
  });

  const card = toCard(g);
  return {
    ...card,
    summary: g.summary,
    igdbId: g.igdbId,
    aggregatedRating: g.aggregatedRating == null ? null : Math.round(g.aggregatedRating),
    metacritic: g.metacritic,
    enrichedFrom: g.enrichedFrom,
    lastSyncedAt: g.lastSyncedAt?.toISOString() ?? null,
    createdAt: g.createdAt.toISOString(),
    ageRatings: parseJsonArray<{ category: string; rating: string }>(g.ageRatings),
    websites: parseJsonArray<{ category: string; url: string }>(g.websites),
    screenshots: parseJsonArray<string>(g.screenshotUrls),
    medianRating,
    adjacent: adjacent.map(toCard),
  };
}

export async function getTotalCount(): Promise<number> {
  return prisma.game.count();
}

export async function getAllRecordSlugs(): Promise<string[]> {
  const rows = await prisma.game.findMany({ select: { slug: true } });
  return rows.map((r) => r.slug);
}
