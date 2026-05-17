import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const IGDB_API_URL = "https://api.igdb.com/v4";

type IGDBCompany = {
  company?: { name?: string };
  publisher?: boolean;
  developer?: boolean;
};

type IGDBAgeRating = { category?: number; rating?: number };
type IGDBWebsite = { category?: number; url?: string };

type IGDBGame = {
  id: number;
  name: string;
  slug: string;
  summary?: string;
  first_release_date?: number;
  rating?: number;
  rating_count?: number;
  aggregated_rating?: number;
  total_rating?: number;
  total_rating_count?: number;
  status?: number;
  updated_at?: number;
  cover?: { image_id: string };
  artworks?: Array<{ image_id: string }>;
  screenshots?: Array<{ image_id: string }>;
  platforms?: Array<{ id: number; name: string; abbreviation?: string; slug?: string }>;
  genres?: Array<{ id: number; name: string; slug?: string }>;
  involved_companies?: IGDBCompany[];
  age_ratings?: IGDBAgeRating[];
  websites?: IGDBWebsite[];
};

type IGDBGameStatus = {
  id: number;
  description?: string;
  checksum?: string;
};

// IGDB v4 enum → label maps. Kept small and explicit; unknown values pass
// through as `cat:<n>` so we never silently drop data.
const AGE_RATING_CATEGORY: Record<number, string> = {
  1: "ESRB",
  2: "PEGI",
  3: "CERO",
  4: "USK",
  5: "GRAC",
  6: "CLASS_IND",
  7: "ACB",
};

const AGE_RATING_VALUE: Record<number, string> = {
  1: "Three",
  2: "Seven",
  3: "Twelve",
  4: "Sixteen",
  5: "Eighteen",
  6: "RP",
  7: "EC",
  8: "E",
  9: "E10+",
  10: "T",
  11: "M",
  12: "AO",
};

const WEBSITE_CATEGORY: Record<number, string> = {
  1: "Official",
  2: "Wikia",
  3: "Wikipedia",
  4: "Facebook",
  5: "Twitter",
  6: "Twitch",
  8: "Instagram",
  9: "YouTube",
  10: "iPhone",
  11: "iPad",
  12: "Android",
  13: "Steam",
  14: "Reddit",
  15: "Itch",
  16: "EpicGames",
  17: "GOG",
  18: "Discord",
};

let tokenCache: { value: string; expiresAt: number } | null = null;

async function getAccessToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.value;
  }
  if (!env.IGDB_CLIENT_ID || !env.IGDB_CLIENT_SECRET) {
    throw new Error("IGDB credentials are not configured.");
  }
  const url = new URL(TWITCH_TOKEN_URL);
  url.searchParams.set("client_id", env.IGDB_CLIENT_ID);
  url.searchParams.set("client_secret", env.IGDB_CLIENT_SECRET);
  url.searchParams.set("grant_type", "client_credentials");
  const response = await fetch(url.toString(), { method: "POST", cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to obtain Twitch token (${response.status}).`);
  const payload = (await response.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    value: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in - 120) * 1000,
  };
  return payload.access_token;
}

const GAME_FIELDS = [
  "name",
  "slug",
  "summary",
  "first_release_date",
  "rating",
  "rating_count",
  "aggregated_rating",
  "total_rating",
  "total_rating_count",
  "status",
  "updated_at",
  "cover.image_id",
  "artworks.image_id",
  "screenshots.image_id",
  "platforms.id",
  "platforms.name",
  "platforms.abbreviation",
  "platforms.slug",
  "genres.id",
  "genres.name",
  "genres.slug",
  "involved_companies.company.name",
  "involved_companies.publisher",
  "involved_companies.developer",
  "age_ratings.category",
  "age_ratings.rating",
  "websites.category",
  "websites.url",
];

function imageUrlFromId(imageId: string, size = "t_cover_big") {
  return `https://images.igdb.com/igdb/image/upload/${size}/${imageId}.jpg`;
}

export type NormalizedIGDBGame = {
  igdbId: number;
  slug: string;
  name: string;
  summary?: string;
  firstReleaseAt?: Date;
  rating?: number;
  ratingCount?: number;
  aggregatedRating?: number;
  totalRating?: number;
  coverUrl?: string;
  artworkUrls: string[];
  screenshotUrls: string[];
  publisher?: string;
  developer?: string;
  ageRatings: Array<{ category: string; rating: string }>;
  websites: Array<{ category: string; url: string }>;
  platforms: Array<{ igdbId: number; name: string; abbreviation?: string; slug: string }>;
  genres: Array<{ igdbId: number; name: string; slug: string }>;
};

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pickCompany(companies: IGDBCompany[] | undefined, kind: "publisher" | "developer") {
  if (!companies?.length) return undefined;
  const match = companies.find((c) => c[kind] && c.company?.name);
  return match?.company?.name;
}

function normalizeRow(row: IGDBGame): NormalizedIGDBGame {
  return {
    igdbId: row.id,
    slug: row.slug || toSlug(row.name),
    name: row.name,
    summary: row.summary,
    firstReleaseAt: row.first_release_date
      ? new Date(row.first_release_date * 1000)
      : undefined,
    rating: row.rating,
    ratingCount: row.rating_count,
    aggregatedRating: row.aggregated_rating,
    totalRating: row.total_rating,
    coverUrl: row.cover?.image_id ? imageUrlFromId(row.cover.image_id) : undefined,
    artworkUrls: (row.artworks ?? []).map((a) => imageUrlFromId(a.image_id, "t_screenshot_huge")),
    screenshotUrls: (row.screenshots ?? []).map((s) =>
      imageUrlFromId(s.image_id, "t_screenshot_huge")
    ),
    publisher: pickCompany(row.involved_companies, "publisher"),
    developer: pickCompany(row.involved_companies, "developer"),
    ageRatings: (row.age_ratings ?? [])
      .filter((a) => a.category != null && a.rating != null)
      .map((a) => ({
        category: AGE_RATING_CATEGORY[a.category as number] ?? `cat:${a.category}`,
        rating: AGE_RATING_VALUE[a.rating as number] ?? `r:${a.rating}`,
      })),
    websites: (row.websites ?? [])
      .filter((w) => w.url)
      .map((w) => ({
        category: WEBSITE_CATEGORY[w.category as number] ?? "Link",
        url: w.url as string,
      })),
    platforms: (row.platforms ?? []).map((platform) => ({
      igdbId: platform.id,
      name: platform.name,
      abbreviation: platform.abbreviation,
      slug: platform.slug || toSlug(platform.name),
    })),
    genres: (row.genres ?? []).map((genre) => ({
      igdbId: genre.id,
      name: genre.name,
      slug: genre.slug || toSlug(genre.name),
    })),
  };
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * ONE_DAY_MS;

/**
 * Read-through, write-through cache for any IGDB request. The cacheKey is
 * the dedupe identity; ttlMs is freshness. Cache table lives in Postgres
 * (model IgdbRequest) so all serverless instances + cold starts share it.
 */
async function cachedRequest<T>(opts: {
  cacheKey: string;
  endpoint: string;
  body: string;
  ttlMs: number;
}): Promise<{ rows: T[]; fromCache: boolean }> {
  const { cacheKey, endpoint, body, ttlMs } = opts;
  const now = Date.now();

  try {
    const cached = await prisma.igdbRequest.findUnique({ where: { cacheKey } });
    if (cached && (!cached.expiresAt || cached.expiresAt.getTime() > now)) {
      return { rows: JSON.parse(cached.response) as T[], fromCache: true };
    }
  } catch {
    /* DB unreachable; fall through to live request */
  }

  const token = await getAccessToken();
  const response = await fetch(`${IGDB_API_URL}/${endpoint}`, {
    method: "POST",
    headers: {
      "Client-ID": env.IGDB_CLIENT_ID!,
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body,
    cache: "no-store",
  });
  if (!response.ok) {
    const responseBody = await response.text().catch(() => "<no body>");
    console.error(
      `[igdb] ${endpoint} FAILED status=${response.status} body=${body} response=${responseBody.slice(0, 500)}`
    );
    throw new Error(
      `IGDB query failed (${response.status}) for ${endpoint}: ${responseBody.slice(0, 200)}`
    );
  }
  const rows = (await response.json()) as T[];

  try {
    await prisma.igdbRequest.upsert({
      where: { cacheKey },
      create: {
        cacheKey,
        endpoint,
        query: body,
        response: JSON.stringify(rows),
        expiresAt: new Date(now + ttlMs),
      },
      update: {
        response: JSON.stringify(rows),
        fetchedAt: new Date(now),
        expiresAt: new Date(now + ttlMs),
        endpoint,
        query: body,
      },
    });
  } catch {
    /* cache write failure shouldn't fail the API call */
  }

  return { rows, fromCache: false };
}

/**
 * Compose an apicalypse query body manually. IGDB v4's parser rejects the
 * comma-joined output of the apicalypse Builder, so we compose by hand.
 */
type QueryParts = {
  fields?: string[];
  where?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

function composeApicalypse(parts: QueryParts): string {
  const lines: string[] = [];
  if (parts.fields && parts.fields.length) lines.push(`fields ${parts.fields.join(", ")};`);
  if (parts.search) lines.push(`search "${parts.search.replace(/"/g, '\\"')}";`);
  if (parts.where) lines.push(`where ${parts.where};`);
  if (typeof parts.limit === "number") lines.push(`limit ${parts.limit};`);
  if (typeof parts.offset === "number" && parts.offset > 0) lines.push(`offset ${parts.offset};`);
  return lines.join(" ");
}

async function buildAndQuery<T>(
  endpoint: string,
  cacheKey: string,
  ttlMs: number,
  parts: QueryParts
): Promise<T[]> {
  const body = composeApicalypse(parts);
  if (!body) throw new Error(`empty apicalypse body for ${endpoint}`);
  const { rows } = await cachedRequest<T>({ cacheKey, endpoint, body, ttlMs });
  return rows;
}

/**
 * Search IGDB by name and return the single best candidate, biased toward a
 * delisted/offline match so the user-search fallback doesn't pick the wrong
 * same-named title.
 */
export async function searchIGDBGameByName(name: string): Promise<
  (NormalizedIGDBGame & { status?: number; updatedAtSeconds?: number }) | null
> {
  const rows = await buildAndQuery<IGDBGame>(
    "games",
    `games:search:${name.toLowerCase()}:enriched:l10`,
    THIRTY_DAYS_MS,
    { fields: GAME_FIELDS, search: name, limit: 10 }
  );
  if (!rows.length) return null;
  const lower = name.toLowerCase();
  const delistedSet = new Set(DELISTED_STATUS_IDS.map((entry) => entry.id));
  const isDelisted = (row: IGDBGame) =>
    typeof row.status === "number" && delistedSet.has(row.status);

  const exactDelisted = rows.find((row) => row.name.toLowerCase() === lower && isDelisted(row));
  const anyDelisted = rows.find(isDelisted);
  const exact = rows.find((row) => row.name.toLowerCase() === lower);
  const row = exactDelisted ?? anyDelisted ?? exact ?? rows[0];
  return { ...normalizeRow(row), status: row.status, updatedAtSeconds: row.updated_at };
}

export async function fetchIGDBGamesByIds(
  ids: number[]
): Promise<Array<NormalizedIGDBGame & { status?: number; updatedAtSeconds?: number }>> {
  if (!ids.length) return [];
  const sortedIds = [...ids].sort((a, b) => a - b);
  const rows = await buildAndQuery<IGDBGame>(
    "games",
    `games:ids:${sortedIds.join(",")}:enriched`,
    THIRTY_DAYS_MS,
    {
      fields: GAME_FIELDS,
      where: `id = (${sortedIds.join(",")})`,
      limit: sortedIds.length,
    }
  );
  return rows.map((row) => ({
    ...normalizeRow(row),
    status: row.status,
    updatedAtSeconds: row.updated_at,
  }));
}

/** Fetch the IGDB game_status lookup table. Tiny and rarely changes. */
export async function listGameStatuses(): Promise<IGDBGameStatus[]> {
  return buildAndQuery<IGDBGameStatus>(
    "game_statuses",
    "game_statuses:all",
    THIRTY_DAYS_MS,
    { fields: ["*"], limit: 50 }
  );
}

/**
 * IGDB v4 `Game.status` enum values that mean "no longer for sale":
 *   5 = offline, 8 = delisted.
 */
const DELISTED_STATUS_IDS: Array<{ id: number; label: string }> = [
  { id: 5, label: "Offline" },
  { id: 8, label: "Delisted" },
];

export async function getDelistedStatusIds(): Promise<{
  ids: number[];
  matched: Array<{ id: number; label: string }>;
  all: IGDBGameStatus[];
}> {
  let all: IGDBGameStatus[] = [];
  try {
    all = await listGameStatuses();
  } catch {
    /* swallow — we only need the IDs */
  }
  return {
    ids: DELISTED_STATUS_IDS.map((row) => row.id),
    matched: DELISTED_STATUS_IDS,
    all,
  };
}

/**
 * Page through /v4/games filtered to a set of status IDs. Each page is
 * cached separately so resuming a partial sync doesn't re-bill IGDB.
 */
export async function fetchGamesByStatus(opts: {
  statusIds: number[];
  offset: number;
  limit: number;
  since?: number;
}): Promise<{
  games: Array<NormalizedIGDBGame & { status?: number }>;
  rawUpdatedAt: Map<number, number>;
}> {
  const { statusIds, offset, limit, since } = opts;
  if (!statusIds.length) return { games: [], rawUpdatedAt: new Map() };
  const sorted = [...statusIds].sort((a, b) => a - b);

  const whereClauses = [`status = (${sorted.join(",")})`];
  if (typeof since === "number" && since > 0) {
    whereClauses.push(`updated_at > ${Math.floor(since)}`);
  }
  const cacheKey = `games:status:${sorted.join(",")}${since ? `:since${Math.floor(since)}` : ""}:o${offset}:l${limit}:enriched`;

  const rows = await buildAndQuery<IGDBGame>("games", cacheKey, 7 * ONE_DAY_MS, {
    fields: GAME_FIELDS,
    where: whereClauses.join(" & "),
    limit,
    offset,
  });

  const rawUpdatedAt = new Map<number, number>();
  for (const row of rows) {
    if (row.updated_at) rawUpdatedAt.set(row.id, row.updated_at);
  }

  return {
    games: rows.map((row) => ({ ...normalizeRow(row), status: row.status })),
    rawUpdatedAt,
  };
}

/** Stats over the IGDB request cache itself — surfaced in the UI. */
export async function getIgdbCacheStats() {
  try {
    const [totalRequests, lastSync, latestEndpointGroups] = await Promise.all([
      prisma.igdbRequest.count(),
      prisma.igdbRequest.findFirst({
        orderBy: { fetchedAt: "desc" },
        select: { fetchedAt: true },
      }),
      prisma.igdbRequest.groupBy({
        by: ["endpoint"],
        _count: { _all: true },
      }),
    ]);

    return {
      totalRequests,
      lastSyncAt: lastSync?.fetchedAt.toISOString() ?? null,
      byEndpoint: latestEndpointGroups.map((row) => ({
        endpoint: row.endpoint,
        count: row._count._all,
      })),
    };
  } catch {
    return {
      totalRequests: 0,
      lastSyncAt: null,
      byEndpoint: [] as Array<{ endpoint: string; count: number }>,
    };
  }
}
