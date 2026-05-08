import { DelistingType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { searchIGDBGameByName, type NormalizedIGDBGame } from "@/lib/igdb";

/**
 * Refresh window for non-permanent statuses. RECENT/UPCOMING entries can be
 * re-checked monthly; DELISTED entries are permanent — never re-fetched.
 */
const REFRESH_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

type CachedGame = NormalizedIGDBGame & { fromCache: boolean };

/**
 * Look up a game in the local DB first; only fall through to the IGDB API if
 * we have no cached record, or if the existing record is for a non-permanent
 * status (RECENT/UPCOMING) and is older than the refresh window.
 *
 * Cache key is the *curated* name. We match on Game.name (case-insensitive),
 * which is what's used during initial seed.
 */
export async function searchGameWithCache(
  name: string,
  contextType: DelistingType
): Promise<CachedGame | null> {
  const existing = await prisma.game.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    include: {
      platforms: { include: { platform: true } },
      genres: { include: { genre: true } },
      events: { orderBy: { delistDate: "desc" }, take: 1 },
    },
  });

  if (existing && existing.igdbId) {
    const lastSync = existing.updatedAt.getTime();
    const isDelistedPermanent =
      existing.events[0]?.type === DelistingType.DELISTED ||
      contextType === DelistingType.DELISTED;
    const fresh = Date.now() - lastSync < REFRESH_AFTER_MS;

    if (isDelistedPermanent || fresh) {
      return {
        igdbId: existing.igdbId,
        slug: existing.slug,
        name: existing.name,
        summary: existing.summary ?? undefined,
        firstReleaseAt: existing.firstReleaseAt ?? undefined,
        rating: existing.rating ?? undefined,
        coverUrl: existing.coverUrl ?? undefined,
        artworkUrls: existing.artworkUrls ? JSON.parse(existing.artworkUrls) : [],
        platforms: existing.platforms.map((row) => ({
          igdbId: row.platform.igdbId ?? 0,
          name: row.platform.name,
          abbreviation: row.platform.abbreviation ?? undefined,
          slug: row.platform.slug,
        })),
        genres: existing.genres.map((row) => ({
          igdbId: row.genre.igdbId ?? 0,
          name: row.genre.name,
          slug: row.genre.slug,
        })),
        fromCache: true,
      };
    }
  }

  const fetched = await searchIGDBGameByName(name);
  if (!fetched) return null;
  return { ...fetched, fromCache: false };
}
