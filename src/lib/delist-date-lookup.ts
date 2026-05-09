import { env } from "@/lib/env";

/**
 * Best-effort resolution of a game's actual delist date, with provenance.
 *
 * Tier order:
 *   1. Wikipedia — public MediaWiki API, no auth. Searches for the
 *      article matching the title, then scans the prose extract for
 *      "delisted" / "removed from sale" / "discontinued" / "shut down"
 *      patterns followed by a date. High confidence when found.
 *   2. SteamDB  — currently a stub. SteamDB has no public API and their
 *      ToS disallows scraping the app pages, so we don't ship a
 *      scraper. The function exists as a hook so a future contributor
 *      with permission (or an alternative price-tracker like ITAD with
 *      an API key) can plug in here without touching callers.
 *   3. IGDB     — falls back to IGDB's `updated_at` ("when the row was
 *      last edited"), which is what the bulk sync was already using.
 *      Surfaced in the UI with an explicit "approximate" disclaimer.
 *
 * Wikipedia requires a User-Agent identifying the application; configure
 * via the WIKIPEDIA_USER_AGENT env var (recommended format from MediaWiki:
 * "AppName/version (contact-email) Runtime/version").
 */

export type DelistDateSource = "wikipedia" | "steamdb" | "igdb";

export type ResolvedDelistDate = {
  date: Date;
  source: DelistDateSource;
};

const DEFAULT_USER_AGENT =
  "delisted-games-tracker/1.0 (https://delisted-games-tracker.vercel.app)";

const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";

export async function resolveDelistDate(opts: {
  igdbName: string;
  igdbSlug?: string;
  igdbUpdatedAtSeconds?: number;
  fallback?: Date;
}): Promise<ResolvedDelistDate> {
  // 1) Wikipedia
  try {
    const wiki = await wikipediaDelistDate(opts.igdbName);
    if (wiki) return { date: wiki, source: "wikipedia" };
  } catch (error) {
    // network / parse problems shouldn't take down sync
    console.warn(`[delist-date] wikipedia lookup failed for ${opts.igdbName}:`, error);
  }

  // 2) SteamDB — stub. See file header for rationale.
  try {
    const steamdb = await steamDbDelistDate(opts.igdbName);
    if (steamdb) return { date: steamdb, source: "steamdb" };
  } catch (error) {
    console.warn(`[delist-date] steamdb lookup failed for ${opts.igdbName}:`, error);
  }

  // 3) IGDB updated_at proxy
  const igdbDate = opts.igdbUpdatedAtSeconds
    ? new Date(opts.igdbUpdatedAtSeconds * 1000)
    : opts.fallback ?? new Date();
  return { date: igdbDate, source: "igdb" };
}

/**
 * Hit the MediaWiki API for the best-matching article, fetch its plain-text
 * extract, and run regexes for the most common delist phrasing. Conservative
 * by design — returns null on the slightest ambiguity rather than guessing.
 */
async function wikipediaDelistDate(name: string): Promise<Date | null> {
  const userAgent = env.WIKIPEDIA_USER_AGENT || DEFAULT_USER_AGENT;
  const headers = { "User-Agent": userAgent };

  // 1. Title search
  const searchUrl = new URL(WIKIPEDIA_API);
  searchUrl.searchParams.set("action", "query");
  searchUrl.searchParams.set("list", "search");
  searchUrl.searchParams.set("srsearch", `${name} video game`);
  searchUrl.searchParams.set("srlimit", "1");
  searchUrl.searchParams.set("format", "json");
  searchUrl.searchParams.set("origin", "*");

  const searchRes = await fetch(searchUrl.toString(), { headers, cache: "no-store" });
  if (!searchRes.ok) return null;
  const searchPayload = (await searchRes.json()) as {
    query?: { search?: Array<{ title: string; snippet: string }> };
  };
  const top = searchPayload.query?.search?.[0];
  if (!top) return null;

  // Skip if the search snippet doesn't even mention the game's title — the
  // top result is something tangentially related and we shouldn't trust it.
  const lowerName = name.toLowerCase();
  if (!top.title.toLowerCase().includes(lowerName.split(":")[0]?.trim() || lowerName)) {
    return null;
  }

  // 2. Article extract
  const articleUrl = new URL(WIKIPEDIA_API);
  articleUrl.searchParams.set("action", "query");
  articleUrl.searchParams.set("prop", "extracts");
  articleUrl.searchParams.set("explaintext", "1");
  articleUrl.searchParams.set("titles", top.title);
  articleUrl.searchParams.set("format", "json");
  articleUrl.searchParams.set("origin", "*");
  articleUrl.searchParams.set("redirects", "1");

  const articleRes = await fetch(articleUrl.toString(), { headers, cache: "no-store" });
  if (!articleRes.ok) return null;
  const articlePayload = (await articleRes.json()) as {
    query?: { pages?: Record<string, { extract?: string }> };
  };
  const pages = articlePayload.query?.pages;
  if (!pages) return null;
  const text = Object.values(pages)[0]?.extract ?? "";
  if (!text) return null;

  return parseDelistDateFromProse(text);
}

/**
 * Match the most common forms of delist phrasing in Wikipedia article prose
 * and return the first plausible date. Patterns ordered most-specific first
 * to give us the best chance of grabbing the right date when the article
 * mentions multiple events (release, expansion, delist).
 */
export function parseDelistDateFromProse(text: string): Date | null {
  const datePart = "(\\w+\\s+\\d{1,2},\\s+\\d{4}|\\d{1,2}\\s+\\w+\\s+\\d{4})";

  const patterns = [
    new RegExp(`(?:was|were)\\s+(?:officially\\s+)?delisted\\s+(?:from\\s+sale\\s+)?(?:on\\s+)?${datePart}`, "i"),
    new RegExp(`removed\\s+from\\s+(?:sale|the\\s+\\w+\\s+store|steam)\\s+(?:on\\s+)?${datePart}`, "i"),
    new RegExp(`servers?\\s+(?:were\\s+)?shut\\s+down\\s+(?:on\\s+)?${datePart}`, "i"),
    new RegExp(`(?:was|were)\\s+discontinued\\s+(?:on\\s+)?${datePart}`, "i"),
    new RegExp(`pulled\\s+from\\s+sale\\s+(?:on\\s+)?${datePart}`, "i"),
    new RegExp(`taken\\s+offline\\s+(?:on\\s+)?${datePart}`, "i"),
    new RegExp(`delisted\\s+(?:from\\s+sale\\s+)?(?:on\\s+)?${datePart}`, "i"),
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const parsed = new Date(match[1]);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  }
  return null;
}

/**
 * Stub for the SteamDB tier. See the file header for why we don't ship a
 * SteamDB scraper. Returns null so callers fall through to Wikipedia/IGDB.
 *
 * To plug in a real SteamDB-equivalent later (with permission or via
 * ITAD's API), implement the lookup here and return a Date when found.
 */
async function steamDbDelistDate(_name: string): Promise<Date | null> {
  return null;
}
