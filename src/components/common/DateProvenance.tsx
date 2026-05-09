/**
 * Inline provenance label for a delistDate.
 *
 * The catalogue's date data has three tiers:
 *   wikipedia — a real human-edited delist date pulled from the
 *               Wikipedia article. Crisp.
 *   steamdb   — reserved for a future SteamDB-equivalent integration.
 *               Currently unused.
 *   igdb      — IGDB.updated_at proxy. "When IGDB last edited this row,"
 *               which is at best a coarse approximation of the actual
 *               delist date. We surface this with an explicit
 *               disclaimer rather than hide it.
 *   null      — older rows that pre-date the source field; treated as
 *               igdb for display purposes.
 */

type Variant = "compact" | "inline" | "full";

const STYLES: Record<Variant, string> = {
  // Tiny chip — meant to sit alongside a date in card layouts
  compact: "font-typewriter text-[8px] uppercase tracking-[0.18em]",
  // Same size as surrounding small caps in detail rows
  inline: "font-typewriter text-[9px] uppercase tracking-[0.16em]",
  // The fullest form — for the lead/hero where there's room
  full: "font-typewriter text-[10px] uppercase tracking-[0.18em]",
};

export default function DateProvenance({
  source,
  variant = "inline",
}: {
  source?: string | null;
  variant?: Variant;
}) {
  const effective = source ?? "igdb";
  const cls = STYLES[variant];

  if (effective === "wikipedia") {
    return (
      <span className={`${cls} text-[color:var(--ink-3)]`} title="Date sourced from Wikipedia.">
        via Wikipedia
      </span>
    );
  }
  if (effective === "steamdb") {
    return (
      <span className={`${cls} text-[color:var(--ink-3)]`} title="Date sourced from SteamDB.">
        via SteamDB
      </span>
    );
  }
  // IGDB or null — be honest about the limitation.
  return (
    <span
      className={`${cls} text-[color:var(--accent)]`}
      title="IGDB doesn't expose actual delist dates; this is the date IGDB last edited the row, which is approximate."
    >
      Approximate · via IGDB
    </span>
  );
}
