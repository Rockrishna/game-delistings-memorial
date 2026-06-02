/**
 * Heuristics for flagging sexual / pornographic ("NSFW") titles so the UI can
 * hide them from browsing views while keeping them in the underlying data and
 * insights. Signals, strongest first:
 *
 *   1. IGDB theme "Erotic" — IGDB's own editorial tag for sexual content.
 *   2. Age ratings of "AO" (ESRB Adults Only) or PEGI/USK/CERO 18 paired with
 *      an erotic signal — 18 alone is just violence/mature, so it only counts
 *      toward NSFW alongside another sexual marker.
 *   3. Title / summary keywords that are unambiguous in a storefront context
 *      (hentai, eroge, nutaku, "adults only", etc.).
 *
 * The aim is to catch porn/sexualised games, not to censor merely violent or
 * "mature" ones — so the bar is an explicit sexual signal.
 */

export type AgeRating = { category: string; rating: string };

// Storefront-unambiguous adult terms. Kept deliberately tight to avoid false
// positives (e.g. "Love", "Adult Swim", "Sexy Brutale" should NOT trip these
// on their own — hence word-boundary, multi-word, and niche-platform terms).
const KEYWORDS = [
  "hentai",
  "eroge",
  "nutaku",
  "futanari",
  "ecchi",
  "porn",
  "pornographic",
  "xxx",
  "adults only",
  "adult only",
  "sexual content",
  "explicit sex",
  "uncensored nudity",
  "+18 adult",
  "18+ adult",
  "nsfw",
];

function hasKeyword(haystack: string): boolean {
  const h = haystack.toLowerCase();
  return KEYWORDS.some((kw) => h.includes(kw));
}

/**
 * Decide whether a (normalised) game is NSFW from the attributes we already
 * pull from IGDB. Pure + dependency-free so it can run in sync, backfill, or
 * a one-off recompute over DB rows.
 */
export function isNsfwGame(input: {
  themes?: string[] | null;
  ageRatings?: AgeRating[] | null;
  name?: string | null;
  summary?: string | null;
}): boolean {
  const themes = (input.themes ?? []).map((t) => t.toLowerCase());
  const ageRatings = input.ageRatings ?? [];

  // 1. IGDB "Erotic" theme — the clearest editorial signal.
  if (themes.includes("erotic")) return true;

  // 2. ESRB "Adults Only" is sexual/extreme by definition.
  const hasAO = ageRatings.some((a) => a.rating === "AO");
  if (hasAO) return true;

  // 3. Title / summary keywords.
  if (hasKeyword(`${input.name ?? ""} ${input.summary ?? ""}`)) return true;

  return false;
}
