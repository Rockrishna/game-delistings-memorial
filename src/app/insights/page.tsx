import Link from "next/link";
import UShell from "@/components/shell/UShell";
import { getInsights } from "@/lib/catalog";

export const dynamic = "force-dynamic";

const TILE_SPANS: Array<{ col: number; row: number; c: string }> = [
  { col: 6, row: 3, c: "t-accent" },
  { col: 6, row: 2, c: "" },
  { col: 4, row: 2, c: "" },
  { col: 4, row: 2, c: "" },
  { col: 4, row: 1, c: "t-mid" },
  { col: 3, row: 1, c: "t-mid" },
  { col: 3, row: 1, c: "t-mid" },
  { col: 3, row: 1, c: "t-soft" },
  { col: 3, row: 1, c: "t-soft" },
];

export default async function InsightsPage() {
  const i = await getInsights();
  const heatMax = Math.max(1, ...i.heatmap.values.flat());
  const histMax = Math.max(1, ...i.ratingHist.map((b) => b.count));
  const pubMax = Math.max(1, ...i.byPublisher.map((p) => p.count));

  const headline: Array<[string, string, string, string | null]> = [
    ["TOTAL", i.total.toLocaleString(), "", null],
    [
      "TOP STOREFRONT",
      i.topPlatform?.name ?? "—",
      i.topPlatform ? `${i.topPlatform.count.toLocaleString()} · ${i.topPlatform.pct}%` : "",
      i.topPlatform ? `/catalog?platform=${encodeURIComponent(i.topPlatform.name)}` : null,
    ],
    [
      "TOP DECADE",
      i.topDecade?.name ?? "—",
      i.topDecade ? `${i.topDecade.count.toLocaleString()} · ${i.topDecade.pct}%` : "",
      i.topDecade ? `/catalog?decade=${encodeURIComponent(i.topDecade.name)}` : null,
    ],
    ["MEDIAN RATING", i.medianRating != null ? String(i.medianRating) : "—", "of rated titles", null],
  ];

  return (
    <UShell total={i.total}>
      <div style={{ padding: "32px 36px 18px", textAlign: "center", borderBottom: "3px double var(--ink)" }}>
        <div className="strap" style={{ letterSpacing: "0.22em" }}>PATTERNS &amp; INSIGHTS</div>
        <h2 className="font-display" style={{ fontWeight: 900, fontSize: 64, margin: "6px 0 4px", lineHeight: 0.95, letterSpacing: "-0.02em" }}>
          The Shape of the Loss
        </h2>
        <p className="font-serif" style={{ fontStyle: "italic", color: "var(--ink-2)", maxWidth: 680, margin: "4px auto 0", fontSize: 15 }}>
          Where the casualties are concentrated. Every figure links into the
          catalog, pre-filtered to that slice.
        </p>
      </div>

      <div className="stack-mobile" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderBottom: "1px solid var(--rule)" }}>
        {headline.map(([k, v, sub, href], idx) => {
          const inner = (
            <>
              <div className="strap" style={{ fontSize: 9 }}>{k}</div>
              <div className="font-display" style={{ fontWeight: 900, fontSize: 48, lineHeight: 1, margin: "6px 0", letterSpacing: "-0.01em" }}>{v}</div>
              <div className="font-serif" style={{ fontStyle: "italic", color: "var(--ink-2)", fontSize: 13 }}>{sub}</div>
            </>
          );
          return (
            <div key={k} style={{ padding: "22px", borderRight: idx < 3 ? "1px solid var(--rule)" : "none", textAlign: "center" }}>
              {href ? <Link href={href}>{inner}</Link> : inner}
            </div>
          );
        })}
      </div>

      <div style={{ padding: "30px 36px 24px" }}>
        <div className="strap">DISPLAY I · PLATFORM × DECADE</div>
        <h3 className="font-serif" style={{ fontSize: 26, fontWeight: 600, margin: "4px 0 18px" }}>Where the casualties accumulated</h3>
        <div className="scroll-x" style={{ border: "1px solid var(--ink)", padding: "24px 28px", background: "var(--paper-2)" }}>
          <div className="heat-grid" style={{ ["--cols" as string]: i.heatmap.decades.length }}>
            <div className="heat-h first">PLATFORM</div>
            {i.heatmap.decades.map((d) => (<div key={d} className="heat-h">{d}</div>))}
            {i.heatmap.platforms.map((p, ri) => (
              <div key={p} style={{ display: "contents" }}>
                <div className="heat-rl">{p}</div>
                {i.heatmap.values[ri].map((v, ci) =>
                  v === 0 ? (
                    <div key={ci} className="heat-cell zero">—</div>
                  ) : (
                    <Link
                      key={ci}
                      href={`/catalog?platform=${encodeURIComponent(p)}&decade=${encodeURIComponent(i.heatmap.decades[ci])}`}
                      className="heat-cell"
                      style={{ ["--v" as string]: v / heatMax }}
                    >
                      {v}
                    </Link>
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: "24px 36px", borderTop: "1px solid var(--rule)" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div>
            <div className="strap">DISPLAY II · BY GENRE</div>
            <h3 className="font-serif" style={{ fontSize: 26, fontWeight: 600, margin: "4px 0 16px" }}>What kinds of games we have lost</h3>
          </div>
          <span className="font-serif muted" style={{ fontStyle: "italic" }}>area ∝ count · click to filter</span>
        </div>
        <div className="scroll-x" style={{ border: "1px solid var(--ink)", padding: 4, background: "var(--paper-2)" }}>
          <div className="treemap">
            {i.byGenre.map((t, idx) => {
              const s = TILE_SPANS[idx] ?? { col: 3, row: 1, c: "t-soft" };
              return (
                <Link
                  key={t.name}
                  href={`/catalog?genre=${encodeURIComponent(t.name)}`}
                  className={`tile ${s.c}`}
                  style={{ gridColumn: `span ${s.col}`, gridRow: `span ${s.row}` }}
                >
                  <div className="tname">{t.name}</div>
                  <div className="tcount">{t.count.toLocaleString()} titles</div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="stack-mobile" style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", borderTop: "1px solid var(--rule)" }}>
        <div style={{ padding: "24px 32px", borderRight: "1px solid var(--rule)" }}>
          <div className="strap">DISPLAY III · RATING DISTRIBUTION</div>
          <h3 className="font-serif" style={{ fontSize: 22, fontWeight: 600, margin: "4px 0 16px" }}>Were they good?</h3>
          <div className="hist">
            {i.ratingHist.map((b, idx) => (
              <div key={b.bucket} className="hist-col">
                <div className="font-mono muted" style={{ fontSize: 10 }}>{b.count}</div>
                <div className={`hist-bar ${idx >= 4 ? "accent" : ""}`} style={{ height: `${(b.count / histMax) * 100}%` }} />
                <div className="font-mono muted" style={{ fontSize: 10, marginTop: 4 }}>{b.bucket}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: "24px 32px" }}>
          <div className="strap">DISPLAY IV · PUBLISHERS WHO LOST MOST</div>
          <h3 className="font-serif" style={{ fontSize: 22, fontWeight: 600, margin: "4px 0 14px" }}>The leaderboard of loss</h3>
          {i.byPublisher.map((p) => (
            <Link key={p.name} href={`/catalog?publisher=${encodeURIComponent(p.name)}`} className="bar-row">
              <span className="bar-name">{p.name}</span>
              <span className="bar-track"><span className="bar-fill accent" style={{ width: `${(p.count / pubMax) * 100}%` }} /></span>
              <span className="bar-count">{p.count}</span>
            </Link>
          ))}
        </div>
      </div>

      <div style={{ padding: "24px 36px 40px", borderTop: "1px solid var(--rule)" }}>
        <div className="strap">DISPLAY V · ATTRIBUTE PATTERNS</div>
        <h3 className="font-serif" style={{ fontSize: 22, fontWeight: 600, margin: "4px 0 4px" }}>
          What the metadata tells us
        </h3>
        <p className="font-serif muted" style={{ fontStyle: "italic", margin: "0 0 18px", fontSize: 13 }}>
          Recurring shapes in the catalogue, drawn from genre, platform,
          decade, publisher and rating. Open any one in the catalog.
        </p>
        <div className="cardgrid">
          {i.attributePatterns.map((p) => (
            <Link
              key={p.title}
              href={p.href}
              style={{ padding: "18px 20px", border: "1px solid var(--ink)", background: "var(--paper-2)", display: "block" }}
            >
              <div className="font-display" style={{ fontSize: 36, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.01em" }}>
                {p.count.toLocaleString()}
              </div>
              <div className="font-serif" style={{ fontWeight: 600, fontSize: 15, marginTop: 8 }}>{p.title}</div>
              <div className="font-serif" style={{ fontStyle: "italic", color: "var(--ink-2)", fontSize: 13, marginTop: 4 }}>{p.blurb}</div>
              <div className="accent font-typewriter" style={{ fontSize: 10, letterSpacing: "0.1em", marginTop: 12 }}>open in catalog →</div>
            </Link>
          ))}
        </div>
      </div>
    </UShell>
  );
}
