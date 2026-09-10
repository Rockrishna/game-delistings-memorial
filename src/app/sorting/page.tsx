import Link from "next/link";
import UShell from "@/components/shell/UShell";
import { getCatalog, getTotalCount, type SortKey } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Shelf order and call numbers",
  description:
    "How the catalogue puts titles in A–Z order — symbols, then numbers, then letters — how case, accents and digits are handled, where blank values file, and how a STORE · YEAR · ID call number is built.",
};

/* The example shelf drawn in the graphic. `key` marks the part of the title
   that decides its place, so it can be picked out in the accent colour. */
const SHELF: Array<{ before: string; key: string; after: string; note: string }> = [
  { before: "", key: "#", after: "IDARB", note: "symbols file first" },
  { before: "", key: "2", after: " Fast 2 Furious", note: "then numbers" },
  { before: "Alpha ", key: "P", after: "rotocol", note: "then letters, A → Z" },
  { before: "alpha ", key: "w", after: "aves", note: "case is ignored: a = A" },
  { before: "Final Fantasy ", key: "2", after: "", note: "digits count as numbers…" },
  { before: "Final Fantasy ", key: "10", after: "", note: "…so 2 files before 10" },
  { before: "Pok", key: "é", after: "mon Snap", note: "accents fold: é = e" },
  { before: "", key: "The", after: " Last of Us", note: "articles are kept: files under T" },
  { before: "Zoo Tycoon ", key: "2", after: "", note: "…and so on to Z" },
];

/* Cabinet codes, one per storefront, as they appear in a call number. Moved
   here from the old standalone /cataloguing page: filing and shelf order are
   two halves of the same question and were never worth two pages. */
const STORE_CODES: Array<[string, string]> = [
  ["STE", "Steam / PC"],
  ["PLA", "PlayStation"],
  ["XBO", "Xbox"],
  ["NIN", "Nintendo"],
  ["IOS", "iOS / App Store"],
  ["AND", "Android"],
  ["EPI", "Epic Games Store"],
  ["GEN", "Other / unclassified"],
];

const ROW_H = 36;
const TOP = 44;
const SVG_W = 860;
const SVG_H = TOP + SHELF.length * ROW_H + 26;

/* Bracketed zones down the left gutter: [label, first row, last row]. */
const ZONES: Array<[string, number, number]> = [
  ["SYMBOLS", 0, 0],
  ["NUMBERS", 1, 1],
  ["LETTERS", 2, SHELF.length - 1],
];

function ShelfGraphic() {
  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      width="100%"
      role="img"
      aria-label="An example shelf in sort order: #IDARB, 2 Fast 2 Furious, Alpha Protocol, alpha waves, Final Fantasy 2, Final Fantasy 10, Pokémon Snap, The Last of Us, Zoo Tycoon 2. Symbols file first, then numbers, then letters A to Z."
      style={{ display: "block", fontFamily: "var(--serif)" }}
    >
      {/* Column headings */}
      <text x="150" y="26" fill="var(--ink-3)" fontSize="12.5" letterSpacing="1.6">
        IN SHELF ORDER
      </text>
      <text x={SVG_W - 8} y="26" fill="var(--ink-3)" fontSize="12.5" letterSpacing="1.6" textAnchor="end">
        WHAT DECIDES THE PLACE
      </text>
      <line x1="150" y1={TOP - 10} x2={SVG_W} y2={TOP - 10} stroke="var(--ink)" strokeWidth="1.5" />

      {SHELF.map((row, i) => {
        const y = TOP + i * ROW_H;
        return (
          <g key={row.before + row.key + row.after}>
            {i % 2 === 1 ? (
              <rect x="150" y={y} width={SVG_W - 150} height={ROW_H} fill="var(--paper-2)" />
            ) : null}
            <line x1="150" y1={y + ROW_H} x2={SVG_W} y2={y + ROW_H} stroke="var(--rule-soft)" strokeWidth="1" />
            <text x="162" y={y + 24} fill="var(--ink-4)" fontSize="12">
              {String(i + 1).padStart(2, "0")}
            </text>
            <text x="196" y={y + 24} fill="var(--ink)" fontSize="17">
              {row.before}
              <tspan fill="var(--accent)" fontWeight="700">{row.key}</tspan>
              {row.after}
            </text>
            <text x={SVG_W - 8} y={y + 23} fill="var(--ink-3)" fontSize="13" textAnchor="end">
              {row.note}
            </text>
          </g>
        );
      })}

      {/* Left gutter: a bracket per zone. */}
      {ZONES.map(([label, from, to]) => {
        const y1 = TOP + from * ROW_H + 6;
        const y2 = TOP + (to + 1) * ROW_H - 6;
        const mid = (y1 + y2) / 2;
        return (
          <g key={label}>
            <path
              d={`M 132 ${y1} L 138 ${y1} L 138 ${y2} L 132 ${y2}`}
              fill="none"
              stroke="var(--ink-3)"
              strokeWidth="1.5"
            />
            <text x="122" y={mid + 4} fill="var(--ink-2)" fontSize="12.5" letterSpacing="1.4" textAnchor="end">
              {label}
            </text>
          </g>
        );
      })}

      {/* The direction of travel. */}
      <text x="122" y={SVG_H - 8} fill="var(--ink-4)" fontSize="12" textAnchor="end">
        ↓ A to Z
      </text>
    </svg>
  );
}

/* One segment of a call number, drawn as a card. */
function Seg({ value, label, note }: { value: string; label: string; note: string }) {
  return (
    <div style={{ border: "1.5px solid var(--ink)", padding: "14px 16px", background: "var(--paper-2)", flex: "1 1 160px", display: "flex", flexDirection: "column" }}>
      <div className="font-mono" style={{ fontSize: 26, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.04em" }}>{value}</div>
      <div className="strap" style={{ marginTop: 8 }}>{label}</div>
      <div className="font-serif" style={{ color: "var(--ink-2)", fontSize: 13, marginTop: 4, lineHeight: 1.45 }}>{note}</div>
    </div>
  );
}

function Block({ strap, title, children }: { strap: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "26px 0", borderTop: "1px solid var(--rule)" }}>
      <div className="strap">{strap}</div>
      <h3 className="font-serif" style={{ fontSize: 22, fontWeight: 600, margin: "4px 0 12px" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

const P: React.CSSProperties = { color: "var(--ink-2)", fontSize: 15, lineHeight: 1.6, marginTop: 12 };

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono" style={{ background: "var(--paper-2)", padding: "1px 5px" }}>
      {children}
    </span>
  );
}

const ORDERS: Array<{ sort: SortKey; label: string; option: string; blurb: string }> = [
  { sort: "title", label: "Title", option: "sort by title", blurb: "A–Z shelf order. The default everywhere." },
  { sort: "rating", label: "Rating", option: "sort by rating", blurb: "Highest IGDB score first; unrated records last." },
  { sort: "year", label: "Newest", option: "sort by newest", blurb: "Most recent release year first. Drives the overview stream." },
  { sort: "year-asc", label: "Oldest", option: "sort by oldest", blurb: "Earliest release year first." },
];

export default async function SortingPage() {
  const [total, samples] = await Promise.all([
    getTotalCount(),
    // All four reads share the one in-memory card cache, so this is a single
    // pass over the catalogue, sorted four ways.
    Promise.all(ORDERS.map((o) => getCatalog({ sort: o.sort, pageSize: 4 }))),
  ]);

  // Live counts for the "blanks file last" section: how many records carry no
  // rating, and how many no release year (a record with no year has no decade).
  const first = samples[0];
  const unrated = first.facets.Rating.find((r) => r.name === "Unrated")?.count ?? 0;
  const dated = first.facets.Decade.reduce((n, d) => n + d.count, 0);
  const undated = Math.max(0, first.total - dated);

  return (
    <UShell total={total}>
      <div className="page-prose" style={{ maxWidth: 960 }}>
        <div className="strap">SHELF ORDER</div>
        <h2 className="font-serif" style={{ fontSize: 34, margin: "6px 0 4px", fontWeight: 600 }}>
          How titles are sorted and filed
        </h2>
        <p className="font-serif" style={{ color: "var(--ink-2)", fontSize: 15, margin: 0, lineHeight: 1.6 }}>
          Every record has a{" "}
          <Link href="#call-numbers" className="accent">call number</Link> that says
          where it is <strong>filed</strong>. Shelf order is a different thing:
          it is the order the {total.toLocaleString()} cards are{" "}
          <strong>shown</strong>{" "}
          in. By default that is A–Z by title, and the rules below settle what
          &ldquo;A–Z&rdquo; means for a title starting with a symbol, a digit,
          an accent, or the word <Mono>The</Mono>.
        </p>

        <div style={{ border: "1.5px solid var(--ink)", background: "var(--paper)", padding: "18px 20px", marginTop: 24 }}>
          <div className="strap" style={{ marginBottom: 10 }}>AN EXAMPLE SHELF</div>
          <div className="scroll-x">
            <div style={{ minWidth: 620 }}>
              <ShelfGraphic />
            </div>
          </div>
        </div>

        <Block strap="RULE ONE" title="Symbols, then numbers, then letters">
          <p className="font-serif" style={P}>
            Titles are compared character by character, and characters run in
            that order: punctuation and symbols first, then digits, then
            letters. So <Mono>#IDARB</Mono> and <Mono>&apos;Splosion Man</Mono>{" "}
            sit at the very front of the catalogue, ahead of{" "}
            <Mono>2 Fast 2 Furious</Mono>, which in turn sits ahead of{" "}
            <Mono>Alpha Protocol</Mono>.
          </p>
        </Block>

        <Block strap="RULE TWO" title="Case and accents don't move a title">
          <p className="font-serif" style={P}>
            Sorting is blind to capitals and to accent marks:{" "}
            <Mono>alpha</Mono>, <Mono>Alpha</Mono> and <Mono>ALPHA</Mono> all
            file in the same place, and <Mono>Pokémon</Mono> files exactly where{" "}
            <Mono>Pokemon</Mono> would. A record is never stranded at the bottom
            of the list because its title happens to be lower-case or carries a
            diacritic.
          </p>
        </Block>

        <Block strap="RULE THREE" title="Digits are read as numbers, not as text">
          <p className="font-serif" style={P}>
            A run of digits is compared by value, so <Mono>Final Fantasy 2</Mono>{" "}
            comes before <Mono>Final Fantasy 10</Mono>. Plain text sorting would
            put them the other way round, because the character{" "}
            <Mono>1</Mono> is lower than <Mono>2</Mono>. Numbered series
            therefore read in the order they were released rather than in
            dictionary order.
          </p>
        </Block>

        <Block strap="RULE FOUR" title="Titles file exactly as printed">
          <p className="font-serif" style={P}>
            A leading <Mono>The</Mono>, <Mono>A</Mono> or <Mono>An</Mono> is not
            set aside the way an old library catalogue would set it aside. The
            title is filed as it is written, so{" "}
            <Mono>The Last of Us</Mono> sits under <strong>T</strong>, not under{" "}
            <strong>L</strong>. The reason is searchability: what you type into
            the search bar is what is printed on the card.
          </p>
        </Block>

        <Block strap="RULE FIVE" title="Blanks always file last">
          <p className="font-serif" style={P}>
            Not every record is complete. When a record has no IGDB rating or no
            known release year, it does not sort as a zero — it drops to the end
            of the list, and it stays at the end whichever direction the sort
            runs. Sorting by <Mono>oldest</Mono> never opens on a wall of
            undated records.
          </p>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 16 }}>
            {[
              ["NO RATING", unrated, "file last when sorting by rating"],
              ["NO RELEASE YEAR", undated, "file last when sorting by year"],
            ].map(([label, count, note]) => (
              <div key={label as string} style={{ borderTop: "1px solid var(--ink)", paddingTop: 8, flex: "1 1 220px" }}>
                <div className="strap" style={{ fontSize: 9 }}>{label}</div>
                <div className="font-serif" style={{ fontSize: 30, fontWeight: 600, lineHeight: 1.1, marginTop: 4 }}>
                  {(count as number).toLocaleString()}
                </div>
                <div className="font-serif" style={{ color: "var(--ink-3)", fontSize: 12, marginTop: 2 }}>{note}</div>
              </div>
            ))}
          </div>
        </Block>

        <Block strap="RULE SIX" title="Ties are broken, so pages never shuffle">
          <p className="font-serif" style={P}>
            Two records can share a rating or a release year — thousands do. When
            they tie, the title decides, and if the titles are identical too, the
            call number does. Nothing is left to chance, so page 7 of a result
            holds the same 24 cards every time you ask for it, and the JSON
            export of a query matches what you saw on screen.
          </p>
        </Block>

        <Block strap="THE FOUR ORDERS" title="What the sort control does">
          <p className="font-serif" style={P}>
            The sort menu in the{" "}
            <Link href="/catalog" className="accent">catalogue</Link> toolbar offers
            four orders. Each applies to the <strong>whole filtered set</strong>,
            not just the page on screen: change the sort and the records
            reshuffle across every page rather than within the 24 in front of
            you. Below is the top of the catalogue under each order, as it
            stands right now.
          </p>
          <div className="sortgrid" style={{ marginTop: 18 }}>
            {ORDERS.map((o, i) => (
              <div key={o.sort} style={{ border: "1px solid var(--ink)", background: "var(--paper)", padding: "12px 14px" }}>
                <div className="font-mono accent" style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  {o.option}
                </div>
                <div className="font-serif" style={{ color: "var(--ink-3)", fontSize: 12, margin: "6px 0 10px", lineHeight: 1.45, minHeight: 34 }}>
                  {o.blurb}
                </div>
                <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {samples[i].rows.map((r, n) => (
                    <li
                      key={r.slug}
                      style={{ display: "flex", gap: 8, padding: "6px 0", borderTop: "1px dashed var(--rule-soft)" }}
                    >
                      <span className="font-mono" style={{ color: "var(--ink-4)", fontSize: 11, paddingTop: 2 }}>
                        {n + 1}
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <Link href={`/record/${r.slug}`} className="font-serif" style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.25, display: "block" }}>
                          {r.title}
                        </Link>
                        <span className="font-serif muted" style={{ fontSize: 11 }}>
                          {r.year ?? "no year"} · {r.rating != null ? `${r.rating} rated` : "unrated"}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
                <Link
                  href={`/catalog?sort=${o.sort}`}
                  className="accent font-typewriter"
                  style={{ display: "inline-block", fontSize: 10, letterSpacing: "0.1em", marginTop: 10 }}
                >
                  open in the catalogue →
                </Link>
              </div>
            ))}
          </div>
        </Block>

        {/* The former /cataloguing page, folded in. It is linked from the
            overview, the footer, the colophon and every record, all of which
            point at #call-numbers. */}
        <div
          id="call-numbers"
          className="anchor-target"
          style={{ padding: "26px 0", borderTop: "1px solid var(--rule)" }}
        >
          <div className="strap">FILING</div>
          <h3 className="font-serif" style={{ fontSize: 22, fontWeight: 600, margin: "4px 0 12px" }}>
            How the call numbers work
          </h3>
          <p className="font-serif" style={P}>
            Shelf order is temporary — it is however you asked the catalogue to
            lay the cards out this minute. A call number is permanent. Each of
            the {total.toLocaleString()} records has one, the way a library card
            catalogue files a book, and it has three parts: a cabinet, a drawer,
            and an item.
          </p>

          <div style={{ display: "flex", alignItems: "stretch", gap: 10, flexWrap: "wrap", margin: "22px 0 18px" }}>
            <Seg value="STE" label="Cabinet · storefront" note="Where it was primarily sold — here, Steam." />
            <span className="font-mono" aria-hidden="true" style={{ fontSize: 24, color: "var(--ink-3)", alignSelf: "center" }}>·</span>
            <Seg value="2014" label="Drawer · release year" note="The year the game first came out." />
            <span className="font-mono" aria-hidden="true" style={{ fontSize: 24, color: "var(--ink-3)", alignSelf: "center" }}>·</span>
            <Seg value="8234" label="Item · catalogue id" note="A permanent, unique number for the record." />
          </div>

          <p className="font-serif" style={P}>
            So <span className="font-mono accent" style={{ fontWeight: 700 }}>STE · 2014 · 8234</span>{" "}
            reads as: a Steam title, released in 2014, filed as item 8234. When
            the release year is unknown the drawer shows <Mono>----</Mono>. A game
            sold on several storefronts is filed under one primary cabinet.
          </p>

          <div style={{ marginTop: 24 }}>
            <div className="strap">CABINET CODES</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px 24px", marginTop: 14 }}>
              {STORE_CODES.map(([code, name]) => (
                <div key={code} style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                  <span className="font-mono accent" style={{ fontWeight: 700, fontSize: 15, minWidth: 42 }}>{code}</span>
                  <span className="font-serif" style={{ color: "var(--ink-2)", fontSize: 14 }}>{name}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="font-serif" style={P}>
            The search bar reads call numbers, so you can look a record up by any
            part of its number: a cabinet code like <Mono>STE</Mono>, a year like{" "}
            <Mono>2014</Mono>, or any run of digits like <Mono>823</Mono>. A
            partial number narrows the catalogue to the records whose filing
            number contains it — which are then laid out in whichever order the
            sort control is set to.
          </p>
          <p className="font-serif" style={P}>
            Filtering changes which cards are on the shelf; sorting changes the
            order they lie in. Neither one alters a call number: a record keeps
            the same STORE · YEAR · ID wherever it happens to land on screen.
          </p>
        </div>

        <div className="marginalia" style={{ margin: "24px 0 40px", fontSize: 14 }}>
          Shown in order: symbols, then numbers, then letters · case and accents
          ignored · digits read as numbers · blanks last · ties broken by title,
          then call number. Filed for good under STORE · YEAR · ID.
        </div>
      </div>
    </UShell>
  );
}
