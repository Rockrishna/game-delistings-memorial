import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

const RAWG_API_URL = "https://api.rawg.io/api";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export type RawgFallback = {
  publisher?: string;
  developer?: string;
  metacritic?: number;
};

type RawgListResponse = {
  results?: Array<{ id: number; name: string; slug: string; metacritic?: number }>;
};

type RawgDetail = {
  metacritic?: number;
  developers?: Array<{ name: string }>;
  publishers?: Array<{ name: string }>;
};

// RAWG responses are cached in the shared IgdbRequest table (endpoint
// "rawg") so the enrichment sweep never re-bills RAWG for the same title.
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
        expiresAt: new Date(now + THIRTY_DAYS_MS),
      },
      update: {
        response: JSON.stringify(body),
        fetchedAt: new Date(now),
        expiresAt: new Date(now + THIRTY_DAYS_MS),
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
 * Best-effort lookup of publisher / developer / metacritic for a title that
 * IGDB returned sparse data for. Returns {} when RAWG is unconfigured or has
 * no confident match. Only ever used to *fill gaps*, never to overwrite IGDB.
 */
export async function fetchRawgFallback(name: string): Promise<RawgFallback> {
  if (!env.RAWG_API_KEY || !name) return {};

  const key = name.toLowerCase().trim();
  const list = await rawgGet<RawgListResponse>(
    `/games?search=${encodeURIComponent(name)}&page_size=5`,
    `rawg:search:${key}`
  );
  const candidates = list?.results ?? [];
  if (!candidates.length) return {};

  // Prefer an exact name match; otherwise the first result.
  const best =
    candidates.find((c) => c.name.toLowerCase() === key) ?? candidates[0];

  const detail = await rawgGet<RawgDetail>(
    `/games/${best.id}`,
    `rawg:detail:${best.id}`
  );
  if (!detail) {
    return typeof best.metacritic === "number"
      ? { metacritic: best.metacritic }
      : {};
  }

  return {
    publisher: detail.publishers?.[0]?.name,
    developer: detail.developers?.[0]?.name,
    metacritic:
      typeof detail.metacritic === "number" ? detail.metacritic : undefined,
  };
}
