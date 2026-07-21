import { cache } from "react";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function parseJsonArray<T>(value: string | null): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

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
  gameModes: string[];
  themes: string[];
  perspectives: string[];
  franchise: string | null;
  rating: number | null;
  statusLabel: string;
  coverUrl: string | null;
  hasCover: boolean;
  nsfw: boolean;
};

const gameInclude = {
  platforms: { include: { platform: true } },
  genres: { include: { genre: true } },
} satisfies Prisma.GameInclude;

type GameWithRels = Prisma.GameGetPayload<{ include: typeof gameInclude }>;

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
    gameModes: parseJsonArray<string>(g.gameModes),
    themes: parseJsonArray<string>(g.themes),
    perspectives: parseJsonArray<string>(g.playerPerspectives),
    franchise: g.franchise,
    rating: g.rating == null ? null : Math.round(g.rating),
    statusLabel: g.statusLabel,
    coverUrl: g.coverUrl,
    hasCover: !!g.coverUrl,
    nsfw: g.nsfw,
  };
}

/* ---------------- In-memory card cache ----------------
 * The catalogue only changes when a sync runs, yet every surface (catalog,
 * overview, insights, the API behind search and infinite scroll) used to
 * re-read the whole games table per request. All read paths now share one
 * cached load; the TTL keeps long-lived instances from going stale and the
 * sync route invalidates explicitly.
 */
const CARD_CACHE_TTL_MS = 5 * 60 * 1000;
let cardCache: { at: number; cards: GameCard[] } | null = null;
let cardCacheInFlight: Promise<GameCard[]> | null = null;

export function invalidateCatalogCache() {
  cardCache = null;
}

async function getAllCards(): Promise<GameCard[]> {
  if (cardCache && Date.now() - cardCache.at < CARD_CACHE_TTL_MS) {
    return cardCache.cards;
  }
  // Coalesce concurrent misses into a single DB read.
  if (cardCacheInFlight) return cardCacheInFlight;
  cardCacheInFlight = (async () => {
    try {
      const rows = await prisma.game.findMany({ include: gameInclude });
      const cards = rows.map(toCard);
      cardCache = { at: Date.now(), cards };
      return cards;
    } finally {
      cardCacheInFlight = null;
    }
  })();
  return cardCacheInFlight;
}

/* ---------------- Overview ---------------- */

export async function getOverview() {
  const games = await getAllCards();

  const total = games.length;
  const byFamily = new Map<string, number>();
  const decades = new Set<string>();
  const publishers = new Set<string>();
  const developers = new Set<string>();
  let yearMin: number | null = null;
  let yearMax: number | null = null;

  for (const g of games) {
    if (g.decade) decades.add(g.decade);
    if (g.publisher) publishers.add(g.publisher);
    if (g.developer) developers.add(g.developer);
    if (g.year != null) {
      yearMin = yearMin == null ? g.year : Math.min(yearMin, g.year);
      yearMax = yearMax == null ? g.year : Math.max(yearMax, g.year);
    }
    for (const f of g.platforms) byFamily.set(f, (byFamily.get(f) ?? 0) + 1);
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
    developers: developers.size,
    yearMin,
    yearMax,
  };
}

/* ---------------- Catalog ---------------- */

export type CatalogQuery = {
  search?: string;
  platform?: string[];
  decade?: string[];
  genre?: string[];
  publisher?: string[];
  developer?: string[];
  mode?: string[];
  theme?: string[];
  perspective?: string[];
  rating?: string[];
  hasCover?: boolean;
  // How the selected facet groups combine: "all" = AND (narrow), "any" = OR
  // (broaden). Free-text search and the cover filter are always AND.
  match?: "all" | "any";
  // When false/omitted, NSFW (sexual/porn) titles are removed from the result
  // rows and facet counts. They remain in the data behind insights/overview —
  // this only governs the browsing view.
  includeNsfw?: boolean;
  sort?: "title" | "rating" | "year" | "year-asc";
  page?: number;
  pageSize?: number;
};

export type FacetKey =
  | "Platform"
  | "Decade"
  | "Genre"
  | "Publisher"
  | "Developer"
  | "Mode"
  | "Theme"
  | "Perspective"
  | "Rating";

export type Facets = Record<FacetKey, Array<{ name: string; count: number }>>;

function matchesQuery(card: GameCard, q: CatalogQuery): boolean {
  // Always-AND constraints: free-text search and the cover-art filter.
  if (q.search) {
    const s = q.search.toLowerCase();
    const hay = [
      card.title,
      card.publisher,
      card.developer,
      card.franchise,
      ...card.genres,
      ...card.themes,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!hay.includes(s)) return false;
  }
  if (q.hasCover && !card.hasCover) return false;

  // Facet groups combine by AND ("all") or OR ("any").
  const groups: boolean[] = [];
  if (q.platform?.length) groups.push(q.platform.some((p) => card.platforms.includes(p)));
  if (q.decade?.length) groups.push(!!card.decade && q.decade.includes(card.decade));
  if (q.genre?.length) groups.push(q.genre.some((g) => card.genres.includes(g)));
  if (q.publisher?.length) groups.push(!!card.publisher && q.publisher.includes(card.publisher));
  if (q.developer?.length) groups.push(!!card.developer && q.developer.includes(card.developer));
  if (q.mode?.length) groups.push(q.mode.some((m) => card.gameModes.includes(m)));
  if (q.theme?.length) groups.push(q.theme.some((t) => card.themes.includes(t)));
  if (q.perspective?.length) groups.push(q.perspective.some((p) => card.perspectives.includes(p)));
  if (q.rating?.length) groups.push(q.rating.includes(ratingBucket(card.rating)));

  if (!groups.length) return true;
  return q.match === "any" ? groups.some(Boolean) : groups.every(Boolean);
}

export async function getCatalog(q: CatalogQuery) {
  const all = await getAllCards();
  // NSFW titles drop out of the browsable view (rows + facets) unless the
  // visitor opted in. Insights/overview never call this, so the data stays
  // whole for aggregates.
  const cards = q.includeNsfw ? all : all.filter((c) => !c.nsfw);

  const filtered = cards.filter((c) => matchesQuery(c, q));

  const sort = q.sort ?? "title";
  filtered.sort((a, b) => {
    if (sort === "rating") return (b.rating ?? -1) - (a.rating ?? -1);
    if (sort === "year") return (b.year ?? 0) - (a.year ?? 0);
    if (sort === "year-asc") return (a.year ?? 9999) - (b.year ?? 9999);
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

function tally(map: Map<string, number>, key: string | null | undefined) {
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + 1);
}

function buildFacets(cards: GameCard[]): Facets {
  const platform = new Map<string, number>();
  const decade = new Map<string, number>();
  const genre = new Map<string, number>();
  const publisher = new Map<string, number>();
  const developer = new Map<string, number>();
  const mode = new Map<string, number>();
  const theme = new Map<string, number>();
  const perspective = new Map<string, number>();
  const rating = new Map<string, number>();

  for (const c of cards) {
    for (const p of c.platforms) if (p !== "Other") tally(platform, p);
    tally(decade, c.decade);
    for (const g of c.genres) tally(genre, g);
    tally(publisher, c.publisher);
    tally(developer, c.developer);
    for (const m of c.gameModes) tally(mode, m);
    for (const t of c.themes) tally(theme, t);
    for (const pp of c.perspectives) tally(perspective, pp);
    tally(rating, ratingBucket(c.rating));
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
    Genre: sortByCount(genre, 30),
    Publisher: sortByCount(publisher, 40),
    Developer: sortByCount(developer, 40),
    Mode: sortByCount(mode),
    Theme: sortByCount(theme, 30),
    Perspective: sortByCount(perspective),
    Rating: ratingOrder
      .filter((r) => rating.has(r))
      .map((name) => ({ name, count: rating.get(name) ?? 0 })),
  };
}

/* ---------------- Insights ---------------- */

export async function getInsights() {
  const cards = await getAllCards();
  const total = cards.length;

  const familyCounts = new Map<string, number>();
  const decadeCounts = new Map<string, number>();
  const genreCounts = new Map<string, number>();
  const publisherCounts = new Map<string, number>();
  const developerCounts = new Map<string, number>();
  const modeCounts = new Map<string, number>();
  const themeCounts = new Map<string, number>();
  const perspectiveCounts = new Map<string, number>();
  const franchiseCounts = new Map<string, number>();
  const ratings: number[] = [];
  const ratingSumByDecade = new Map<string, { sum: number; n: number }>();
  let withCover = 0;

  const heatDecades = ["1990s", "2000s", "2010s", "2020s"];
  const heatFamilies = ["Steam", "PlayStation", "Xbox", "Nintendo", "iOS", "Android"];
  const heat: Record<string, Record<string, number>> = {};
  for (const f of heatFamilies) heat[f] = Object.fromEntries(heatDecades.map((d) => [d, 0]));

  for (const c of cards) {
    tally(decadeCounts, c.decade);
    for (const g of c.genres) tally(genreCounts, g);
    tally(publisherCounts, c.publisher);
    tally(developerCounts, c.developer);
    for (const m of c.gameModes) tally(modeCounts, m);
    for (const t of c.themes) tally(themeCounts, t);
    for (const pp of c.perspectives) tally(perspectiveCounts, pp);
    tally(franchiseCounts, c.franchise);
    if (c.hasCover) withCover += 1;
    if (c.rating != null) {
      ratings.push(c.rating);
      if (c.decade) {
        const e = ratingSumByDecade.get(c.decade) ?? { sum: 0, n: 0 };
        e.sum += c.rating;
        e.n += 1;
        ratingSumByDecade.set(c.decade, e);
      }
    }
    for (const fam of c.platforms) {
      if (fam === "Other") continue;
      tally(familyCounts, fam);
      if (heat[fam] && c.decade && heat[fam][c.decade] != null) heat[fam][c.decade] += 1;
    }
  }

  ratings.sort((a, b) => a - b);
  const median = ratings.length ? ratings[Math.floor(ratings.length / 2)] : null;

  const top = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
  const topPlatform = top(familyCounts);
  const topDecade = top(decadeCounts);
  const topGenre = top(genreCounts);
  const topPublisher = top(publisherCounts);
  const earliestDecade =
    [...decadeCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))[0] ?? null;
  const acclaimed = ratings.filter((r) => r >= 80).length;
  const lowRated = ratings.filter((r) => r < 60).length;

  const enc = encodeURIComponent;
  const attributePatterns = [
    topGenre && { count: topGenre[1], title: `Top genre · ${topGenre[0]}`, blurb: `More delisted titles are ${topGenre[0]} than any other genre.`, href: `/catalog?genre=${enc(topGenre[0])}` },
    topPlatform && { count: topPlatform[1], title: `Top storefront · ${topPlatform[0]}`, blurb: `More delisted games came from ${topPlatform[0]} than any other storefront.`, href: `/catalog?platform=${enc(topPlatform[0])}` },
    topDecade && { count: topDecade[1], title: `Top decade · ${topDecade[0]}`, blurb: `The release decade with the most delisted titles.`, href: `/catalog?decade=${enc(topDecade[0])}` },
    topPublisher && { count: topPublisher[1], title: `Top publisher · ${topPublisher[0]}`, blurb: `The publisher with the largest delisted back-catalogue.`, href: `/catalog?publisher=${enc(topPublisher[0])}` },
    { count: acclaimed, title: `Highly rated · 80+`, blurb: `Delisted games that still scored 80 or more on IGDB.`, href: `/catalog?rating=${enc("≥ 90")}&rating=${enc("80–89")}` },
    earliestDecade && { count: earliestDecade[1], title: `Oldest cohort · ${earliestDecade[0]}`, blurb: `The earliest release decade still on record.`, href: `/catalog?decade=${enc(earliestDecade[0])}` },
    { count: lowRated, title: `Low rated · under 60`, blurb: `Delisted titles that scored under 60 on IGDB.`, href: `/catalog?rating=${enc("< 60")}` },
  ].filter(Boolean) as Array<{ count: number; title: string; blurb: string; href: string }>;

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

  const ranked = (m: Map<string, number>, n: number) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, count]) => ({ name, count }));

  const allDecades = [...decadeCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  const topAcclaimed = cards
    .filter((c) => c.rating != null)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 12)
    .map((c) => ({
      slug: c.slug,
      title: c.title,
      callNumber: c.callNumber,
      rating: c.rating,
      year: c.year,
      publisher: c.publisher,
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
    coverPct: total ? Math.round((withCover / total) * 100) : 0,
    heatmap: {
      platforms: heatFamilies,
      decades: heatDecades,
      values: heatFamilies.map((f) => heatDecades.map((d) => heat[f][d])),
    },
    byPlatform: [...familyCounts.entries()]
      .filter(([n]) => n !== "Other")
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count })),
    byDecade: allDecades.map(([name, count]) => ({ name, count })),
    byGenre: ranked(genreCounts, 9),
    byPublisher: ranked(publisherCounts, 8),
    byDeveloper: ranked(developerCounts, 10),
    byMode: ranked(modeCounts, 8),
    byTheme: ranked(themeCounts, 12),
    byPerspective: ranked(perspectiveCounts, 8),
    byFranchise: ranked(franchiseCounts, 10),
    ratingByDecade: allDecades.map(([name]) => {
      const e = ratingSumByDecade.get(name);
      return { name, avg: e && e.n ? Math.round(e.sum / e.n) : 0 };
    }),
    ratingHist: histBuckets,
    topAcclaimed,
    attributePatterns,
  };
}

/* ---------------- Record ---------------- */

// React cache() dedupes the generateMetadata + page-body calls within one
// request into a single set of queries.
export const getRecord = cache(async function getRecord(
  slug: string,
  opts?: { includeNsfw?: boolean }
) {
  const g = await prisma.game.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    include: gameInclude,
  });
  if (!g) return null;

  const all = await getAllCards();
  const rated = all
    .map((c) => c.rating)
    .filter((r): r is number => r != null)
    .sort((a, b) => a - b);
  const medianRating = rated.length ? rated[Math.floor(rated.length / 2)] : null;

  const adjacent = await prisma.game.findMany({
    where: {
      id: { not: g.id },
      // Keep NSFW suggestions out of the related-records strip unless opted in.
      ...(opts?.includeNsfw ? {} : { nsfw: false }),
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
});

export async function getTotalCount(): Promise<number> {
  return (await getAllCards()).length;
}

export async function getAllRecordSlugs(): Promise<string[]> {
  const rows = await prisma.game.findMany({ select: { slug: true } });
  return rows.map((r) => r.slug);
}
