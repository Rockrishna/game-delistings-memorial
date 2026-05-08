import { env } from "@/lib/env";

const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const IGDB_API_URL = "https://api.igdb.com/v4";

type IGDBGame = {
  id: number;
  name: string;
  slug: string;
  summary?: string;
  first_release_date?: number;
  rating?: number;
  cover?: { image_id: string };
  artworks?: Array<{ image_id: string }>;
  platforms?: Array<{ id: number; name: string; abbreviation?: string; slug?: string }>;
  genres?: Array<{ id: number; name: string; slug?: string }>;
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
  if (!response.ok) {
    throw new Error(`Failed to obtain Twitch token (${response.status}).`);
  }

  const payload = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };
  tokenCache = {
    value: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in - 120) * 1000,
  };
  return payload.access_token;
}

export async function queryIGDB<T>(endpoint: string, body: string): Promise<T[]> {
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
    throw new Error(`IGDB query failed (${response.status}) for ${endpoint}.`);
  }

  return (await response.json()) as T[];
}

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

export async function searchIGDBGameByName(name: string): Promise<NormalizedIGDBGame | null> {
  const escaped = name.replace(/"/g, '\\"');
  const query = `fields name,slug,summary,first_release_date,rating,cover.image_id,artworks.image_id,platforms.id,platforms.name,platforms.abbreviation,platforms.slug,genres.id,genres.name,genres.slug; search "${escaped}"; where version_parent = null & category = (0,4,8,9); limit 1;`;
  const rows = await queryIGDB<IGDBGame>("games", query);
  if (!rows.length) return null;
  return mapIGDBRow(rows[0]);
}

function mapIGDBRow(row: IGDBGame): NormalizedIGDBGame {
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

export async function fetchIGDBGamesByIds(ids: number[]) {
  if (!ids.length) {
    return [];
  }

  const query = `fields name,slug,summary,first_release_date,rating,cover.image_id,artworks.image_id,platforms.id,platforms.name,platforms.abbreviation,platforms.slug,genres.id,genres.name,genres.slug; where id = (${ids.join(
    ","
  )}); limit ${ids.length};`;

  const rows = await queryIGDB<IGDBGame>("games", query);
  return rows.map<NormalizedIGDBGame>((row) => ({
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
  }));
}
