import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

const RAWG_API_URL = "https://api.rawg.io/api";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type RawgLink = { category: string; url: string };

// Full RAWG payload: publisher/developer/metacritic for gap-filling, plus the
// RAWG game id/slug (→ rawg.io/games/<slug>) and external links to render.
export type RawgData = {
  publisher?: string;
  developer?: string;
  metacritic?: number;
  rawgId?: number;
  rawgSlug?: string;
  links: RawgLink[];
};

// Legacy subset still consumed by the attribute backfill sweep.
export type RawgFallback = {
  publisher?: string;
  developer?: string;
  metacritic?: number;
};

type RawgListResponse = {
  results?: Array<{
    id: number;
    name: string;
    slug: string;
    released?: string | null;
    metacritic?: number;
  }>;
};

type RawgDetail = {
  id: number;
  slug: string;
  name: string;
  metacritic?: number;
  website?: string;
  reddit_url?: string;
  metacritic_url?: string;
  developers?: Array<{ name: string }>;
  publishers?: Array<{ name: string }>;
  stores?: Array<{ store: { id: number; name: string } }>;
};

type RawgStores = {
  results?: Array<{ store_id: number; url: string }>;
};

// Collapse to comparable form so "Vipunk: Shield of Valhalla" only ever matches
// the same game, never an unrelated first search hit.
function normName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// RAWG responses are cached in the shared IgdbRequest table (endpoint "rawg")
// so the enrichment sweep never re-bills RAWG for the same title.
async function rawgGet<T>(path: string, cacheKey: string): Promise<T | null> {
  if (!env.RAWG_API_KEY) return null;
  const now = Date.now();

  try {
    const cached = await prisma.igdbRequest.findUnique({ where: { cacheKey } });
    if (cached && (!cached.expiresAt || cached.expiresAt.getTime() > now)) {
      return JSON.parse(cached.response) as T;
    }
  } catch {
    /* fall through to live request */
  }

  const sep = path.includes("?") ? "&" : "?";
  const url = `${RAWG_API_URL}${path}${sep}key=${encodeURIComponent(env.RAWG_API_KEY)}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    console.error(`[rawg] ${path} FAILED status=${response.status}`);
    return null;
  }
  const body = (await response.json()) as T;

  try {
    await prisma.igdbRequest.upsert({
      where: { cacheKey },
      create: {
        cacheKey,
        endpoint: "rawg",
        query: path,
        response: JSON.stringify(body),
        expiresAt: new Date(now + CACHE_TTL_MS),
      },
      update: {
        response: JSON.stringify(body),
        fetchedAt: new Date(now),
        expiresAt: new Date(now + CACHE_TTL_MS),
        endpoint: "rawg",
        query: path,
      },
    });
  } catch {
    /* cache write failure shouldn't fail the call */
  }

  return body;
}

/**
 * Strict RAWG lookup. Only returns data when a candidate's name matches the
 * query exactly (after normalisation) — optionally disambiguated by release
 * year — so a loose "first result" can never mis-attribute a publisher or
 * developer (the bug that credited unrelated titles to e.g. Sony). Returns
 * null when RAWG is unconfigured or has no confident match, so callers can
 * leave the field blank rather than wrong.
 */
export async function fetchRawg(
  name: string,
  year?: number | null
): Promise<RawgData | null> {
  if (!env.RAWG_API_KEY || !name) return null;

  const target = normName(name);
  const list = await rawgGet<RawgListResponse>(
    `/games?search=${encodeURIComponent(name)}&page_size=6`,
    `rawg:search:${name.toLowerCase().trim()}`
  );
  const candidates = list?.results ?? [];

  const exact = candidates.filter((c) => normName(c.name) === target);
  if (!exact.length) return null;
  // Several same-named games → prefer the one whose release year matches.
  const best =
    exact.length > 1 && year != null
      ? exact.find((c) => c.released && Number(c.released.slice(0, 4)) === year) ?? exact[0]
      : exact[0];

  const detail = await rawgGet<RawgDetail>(`/games/${best.id}`, `rawg:detail:${best.id}`);
  if (!detail) {
    return {
      rawgId: best.id,
      rawgSlug: best.slug,
      metacritic: typeof best.metacritic === "number" ? best.metacritic : undefined,
      links: [],
    };
  }

  const links: RawgLink[] = [];
  if (detail.website) links.push({ category: "Official site", url: detail.website });

  // Store pages (the actual per-game URL) come from the /stores sub-resource;
  // map each store_id to a readable name via the detail payload.
  const stores = await rawgGet<RawgStores>(`/games/${best.id}/stores`, `rawg:stores:${best.id}`);
  const storeNameById = new Map<number, string>();
  for (const s of detail.stores ?? []) storeNameById.set(s.store.id, s.store.name);
  for (const s of stores?.results ?? []) {
    if (s.url) links.push({ category: storeNameById.get(s.store_id) ?? "Store", url: s.url });
  }

  if (detail.reddit_url) links.push({ category: "Reddit", url: detail.reddit_url });
  if (detail.metacritic_url) links.push({ category: "Metacritic", url: detail.metacritic_url });

  return {
    publisher: detail.publishers?.[0]?.name,
    developer: detail.developers?.[0]?.name,
    metacritic: typeof detail.metacritic === "number" ? detail.metacritic : undefined,
    rawgId: detail.id,
    rawgSlug: detail.slug,
    links,
  };
}

/**
 * Publisher / developer / metacritic subset, used by the sync sweep and the
 * attribute backfill. Now strict (see fetchRawg) — only ever fills a gap with
 * a confident match, never overwrites IGDB.
 */
export async function fetchRawgFallback(name: string): Promise<RawgFallback> {
  const full = await fetchRawg(name);
  if (!full) return {};
  return {
    publisher: full.publisher,
    developer: full.developer,
    metacritic: full.metacritic,
  };
}
