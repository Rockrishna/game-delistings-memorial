import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const IGDB_API_URL = "https://api.igdb.com/v4";

type IGDBGame = {
  id: number;
  name: string;
  slug: string;
  summary?: string;
  first_release_date?: number;
  rating?: number;
  status?: number;
  updated_at?: number;
  cover?: { image_id: string };
  artworks?: Array<{ image_id: string }>;
  platforms?: Array<{ id: number; name: string; abbreviation?: string; slug?: string }>;
  genres?: Array<{ id: number; name: string; slug?: string }>;
};

type IGDBGameStatus = {
  id: number;
  // IGDB v4 only exposes description / checksum on this endpoint — there
  // is no public `name` field; querying it returns 400 Invalid Field.
  description?: string;
  checksum?: string;
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
  "status",
  "updated_at",
  "cover.image_id",
  "artworks.image_id",
  "platforms.id",
  "platforms.name",
  "platforms.abbreviation",
  "platforms.slug",
  "genres.id",
  "genres.name",
  "genres.slug",
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
  coverUrl?: string;
  artworkUrls: string[];
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
    coverUrl: row.cover?.image_id ? imageUrlFromId(row.cover.image_id) : undefined,
    artworkUrls: (row.artworks ?? []).map((art) => imageUrlFromId(art.image_id, "t_screenshot_huge")),
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
 * (model IgdbRequest) so all serverless instances + cold starts share it,
 * which means a popular query hits the IGDB API once across the whole fleet.
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
 * Compose an apicalypse query body manually. The Builder in the apicalypse
 * package strips whitespace inside `fields` lists and IGDB v4's parser then
 * rejects the comma-joined result with a 400 ("Expecting `EOF`, `;`, found
 * `,foo,bar`"). Manual composition with explicit `, ` separators sidesteps
 * the issue and keeps the apicalypse import for typing only.
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
 * Search IGDB by name and return the single best candidate. Used by the
 * user-driven `/api/search/igdb` flow: the caller wants to know whether
 * the title is delisted, so when several IGDB rows share the same name
 * (multiple games called "Anthem", etc.) we bias selection toward the
 * one tagged with a delisted status — otherwise the wrong "Anthem"
 * surfaces first and gets cached as not_delisted forever.
 *
 * Selection priority: exact-name & delisted > any delisted match
 *   > exact-name > first row.
 */
export async function searchIGDBGameByName(name: string): Promise<
  (NormalizedIGDBGame & { status?: number }) | null
> {
  const rows = await buildAndQuery<IGDBGame>(
    "games",
    // Cache key includes :l10 so old :l5-shaped cache entries from the
    // previous selection logic don't get reused for fresh lookups.
    `games:search:${name.toLowerCase()}:l10`,
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
  return { ...normalizeRow(row), status: row.status };
}

export async function fetchIGDBGamesByIds(ids: number[]): Promise<NormalizedIGDBGame[]> {
  if (!ids.length) return [];
  const sortedIds = [...ids].sort((a, b) => a - b);
  const rows = await buildAndQuery<IGDBGame>(
    "games",
    `games:ids:${sortedIds.join(",")}`,
    THIRTY_DAYS_MS,
    {
      fields: GAME_FIELDS,
      where: `id = (${sortedIds.join(",")})`,
      limit: sortedIds.length,
    }
  );
  return rows.map(normalizeRow);
}

/**
 * Fetch the IGDB game_status lookup table. Tiny (single-digit rows) and
 * rarely changes — caches for 30 days.
 */
export async function listGameStatuses(): Promise<IGDBGameStatus[]> {
  // `fields *` returns every available column on the row regardless of what
  // the schema is documented to contain — IGDB v4 game_statuses doesn't
  // expose `name` or `description`, only id + checksum, so we let the API
  // tell us what's there.
  return buildAndQuery<IGDBGameStatus>(
    "game_statuses",
    "game_statuses:all",
    THIRTY_DAYS_MS,
    { fields: ["*"], limit: 50 }
  );
}

/**
 * IGDB v4 `Game.status` enum values that mean "no longer for sale".
 *
 * Per the documented enum on the games endpoint:
 *   0 released   2 alpha   3 beta   4 early_access
 *   5 offline    6 cancelled   7 rumored   8 delisted
 *
 * We previously had this set to {2, 7} after a misread of the
 * /v4/game_statuses endpoint — that pulled alpha + rumored games into the
 * catalogue and made every legitimately-delisted title (e.g. Anthem,
 * status=8) come back as "not_delisted" through the user search. The
 * correct values are 5 (offline) and 8 (delisted).
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
  // Best-effort: still query game_statuses so the cache table records that
  // we considered it; ignore failures (the endpoint sometimes 400s when
  // querying any non-id field, depending on IGDB API version).
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
}): Promise<{ games: NormalizedIGDBGame[]; rawUpdatedAt: Map<number, number> }> {
  const { statusIds, offset, limit } = opts;
  if (!statusIds.length) return { games: [], rawUpdatedAt: new Map() };
  const sorted = [...statusIds].sort((a, b) => a - b);

  const rows = await buildAndQuery<IGDBGame>(
    "games",
    `games:status:${sorted.join(",")}:o${offset}:l${limit}`,
    7 * ONE_DAY_MS,
    {
      fields: [...GAME_FIELDS, "status", "updated_at"],
      where: `status = (${sorted.join(",")})`,
      limit,
      offset,
    }
  );

  const rawUpdatedAt = new Map<number, number>();
  for (const row of rows) {
    if (row.updated_at) rawUpdatedAt.set(row.id, row.updated_at);
  }

  return { games: rows.map(normalizeRow), rawUpdatedAt };
}

/**
 * Stats over the IGDB request cache itself — surfaced on the home page so
 * users can see how much we're hitting the live API vs. serving from
 * Postgres.
 */
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
    return { totalRequests: 0, lastSyncAt: null, byEndpoint: [] as Array<{ endpoint: string; count: number }> };
  }
}
