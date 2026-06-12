import Link from "next/link";
import UShell from "@/components/shell/UShell";
import { getInsights } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Insights",
  description:
    "Charts and patterns drawn from the catalogue of delisted games: platforms, decades, genres, publishers, and ratings.",
};

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

const enc = encodeURIComponent;

function BarList({
  rows,
  hrefFor,
}: {
  rows: Array<{ name: string; count: number }>;
  hrefFor: (name: string) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <>
      {rows.map((r) => (
        <Link key={r.name} href={hrefFor(r.name)} className="bar-row">
          <span className="bar-name">{r.name}</span>
          <span className="bar-track">
            <span className="bar-fill accent" style={{ width: `${(r.count / max) * 100}%` }} />
          </span>
          <span className="bar-count">{r.count}</span>
        </Link>
      ))}
    </>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div
      className="font-serif muted"
      style={{
        fontStyle: "italic",
        fontSize: 13,
        padding: "18px 0",
        border: "1px dashed var(--rule)",
        textAlign: "center",
        color: "var(--ink-3)",
      }}
    >
      {label}
    </div>
  );
}

function Section({
  strap,
  title,
  children,
  note,
}: {
  strap: string;
  title: string;
  children: React.ReactNode;
  note?: string;
}) {
  return (
    <div style={{ padding: "24px 36px", borderTop: "1px solid var(--rule)" }}>
      <div className="strap">{strap}</div>
      <h3 className="font-serif" style={{ fontSize: 22, fontWeight: 600, margin: "4px 0 16px" }}>
        {title}
      </h3>
      {children}
      {note ? (
        <div className="marginalia" style={{ fontSize: 13, marginTop: 14 }}>{note}</div>
      ) : null}
    </div>
  );
}

export default async function InsightsPage() {
  const i = await getInsights();
  const heatMax = Math.max(1, ...i.heatmap.values.flat());
  const histMax = Math.max(1, ...i.ratingHist.map((b) => b.count));
  const ratedDecades = i.ratingByDecade.filter((d) => d.avg > 0);
  const avgMax = ratedDecades.length ? Math.max(...ratedDecades.map((d) => d.avg)) : 0;
  const avgMin = ratedDecades.length ? Math.min(...ratedDecades.map((d) => d.avg)) : 0;
  // Decade averages cluster (e.g. 60–75), so a 0–100 axis flattens them into a
  // straight line. Zoom the axis to just below the lowest value so differences
  // between decades are actually visible.
  const axisLo = Math.max(0, Math.floor(avgMin) - 6);
  const axisHi = Math.min(100, Math.ceil(avgMax) + 2);
  const axisSpan = Math.max(1, axisHi - axisLo);
  // Pixel drawing height for histogram bars. We size bars in px (not %)
  // because the flex column isn't a definite-height parent, so percentage
  // heights collapse to ~0 (bars render as flat lines).
  const BAR_PX = 190;

  const headline: Array<[string, string, string, string | null]> = [
    ["TOTAL", i.total.toLocaleString(), "records", null],
    [
      "TOP STOREFRONT",
      i.topPlatform?.name ?? "—",
      i.topPlatform ? `${i.topPlatform.count.toLocaleString()} · ${i.topPlatform.pct}%` : "",
      i.topPlatform ? `/catalog?platform=${enc(i.topPlatform.name)}` : null,
    ],
    [
      "TOP DECADE",
      i.topDecade?.name ?? "—",
      i.topDecade ? `${i.topDecade.count.toLocaleString()} · ${i.topDecade.pct}%` : "",
      i.topDecade ? `/catalog?decade=${enc(i.topDecade.name)}` : null,
    ],
    ["MEDIAN RATING", i.medianRating != null ? String(i.medianRating) : "—", "of rated titles", null],
    ["WITH COVER ART", `${i.coverPct}%`, "have cover art", null],
  ];

  return (
    <UShell total={i.total}>
      <div style={{ padding: "32px 36px 18px", textAlign: "center", borderBottom: "3px double var(--ink)" }}>
        <div className="strap" style={{ letterSpacing: "0.22em" }}>PATTERNS &amp; INSIGHTS</div>
        <h2 className="font-display" style={{ fontWeight: 900, fontSize: "clamp(34px, 8vw, 64px)", margin: "6px 0 4px", lineHeight: 0.95, letterSpacing: "-0.02em" }}>
          The Shape of the Loss
        </h2>
        <p className="font-serif" style={{ fontStyle: "italic", color: "var(--ink-2)", maxWidth: 680, margin: "4px auto 0", fontSize: 15 }}>
          Thirteen displays of what the catalogue has lost. Every figure links
          into the catalog, pre-filtered to that slice.
        </p>
      </div>

      <div className="statgrid" style={{ borderBottom: "1px solid var(--rule)" }}>
        {headline.map(([k, v, sub, href], idx) => {
          const inner = (
            <>
              <div className="strap" style={{ fontSize: 9 }}>{k}</div>
              <div className="font-display" style={{ fontWeight: 900, fontSize: 42, lineHeight: 1, margin: "6px 0", letterSpacing: "-0.01em" }}>{v}</div>
              <div className="font-serif" style={{ fontStyle: "italic", color: "var(--ink-2)", fontSize: 13 }}>{sub}</div>
            </>
          );
          return (
            <div key={k} style={{ padding: "20px", borderRight: idx < 4 ? "1px solid var(--rule)" : "none", textAlign: "center" }}>
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
                      href={`/catalog?platform=${enc(p)}&decade=${enc(i.heatmap.decades[ci])}`}
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

      <Section strap="DISPLAY II · BY GENRE" title="What kinds of games we have lost">
        <div className="scroll-x" style={{ border: "1px solid var(--ink)", padding: 4, background: "var(--paper-2)" }}>
          <div className="treemap">
            {i.byGenre.map((t, idx) => {
              const s = TILE_SPANS[idx] ?? { col: 3, row: 1, c: "t-soft" };
              return (
                <Link
                  key={t.name}
                  href={`/catalog?genre=${enc(t.name)}`}
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
      </Section>

      <div className="stack-mobile" style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", borderTop: "1px solid var(--rule)" }}>
        <div style={{ padding: "24px 32px", borderRight: "1px solid var(--rule)" }}>
          <div className="strap">DISPLAY III · RATING DISTRIBUTION</div>
          <h3 className="font-serif" style={{ fontSize: 22, fontWeight: 600, margin: "4px 0 6px" }}>Were they good?</h3>
          <p className="font-serif muted" style={{ fontStyle: "italic", margin: "0 0 16px", fontSize: 14 }}>
            User score, bucketed, across the {i.ratingHist.reduce((s, b) => s + b.count, 0).toLocaleString()} rated titles.
          </p>
          <div className="hist">
            {i.ratingHist.map((b, idx) => (
              <div key={b.bucket} className="hist-col">
                <div className="hist-val">{b.count}</div>
                <div
                  className={`hist-bar ${idx >= 4 ? "accent" : ""}`}
                  style={{ height: b.count ? `${Math.max(4, (b.count / histMax) * BAR_PX)}px` : "0px" }}
                />
                <div className="hist-label">{b.bucket}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: "24px 32px" }}>
          <div className="strap">DISPLAY IV · PUBLISHERS WHO LOST MOST</div>
          <h3 className="font-serif" style={{ fontSize: 22, fontWeight: 600, margin: "4px 0 14px" }}>The leaderboard of loss</h3>
          <BarList rows={i.byPublisher} hrefFor={(n) => `/catalog?publisher=${enc(n)}`} />
        </div>
      </div>

      <div style={{ padding: "24px 36px 8px", borderTop: "1px solid var(--rule)" }}>
        <div className="strap">DISPLAY V · ATTRIBUTE PATTERNS</div>
        <h3 className="font-serif" style={{ fontSize: 22, fontWeight: 600, margin: "4px 0 4px" }}>
          What the metadata tells us
        </h3>
        <p className="font-serif muted" style={{ fontStyle: "italic", margin: "0 0 18px", fontSize: 13 }}>
          Recurring shapes drawn from genre, platform, decade, publisher and
          rating. Open any one in the catalog.
        </p>
        <div className="cardgrid">
          {i.attributePatterns.map((p) => (
            <Link key={p.title} href={p.href} style={{ padding: "18px 20px", border: "1px solid var(--ink)", background: "var(--paper-2)", display: "block" }}>
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

      <div className="stack-mobile" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: "1px solid var(--rule)" }}>
        <div style={{ padding: "24px 32px", borderRight: "1px solid var(--rule)" }}>
          <div className="strap">DISPLAY VI · BY STOREFRONT</div>
          <h3 className="font-serif" style={{ fontSize: 22, fontWeight: 600, margin: "4px 0 14px" }}>Which storefronts shed the most</h3>
          <BarList rows={i.byPlatform} hrefFor={(n) => `/catalog?platform=${enc(n)}`} />
        </div>
        <div style={{ padding: "24px 32px" }}>
          <div className="strap">DISPLAY VII · BY DECADE</div>
          <h3 className="font-serif" style={{ fontSize: 22, fontWeight: 600, margin: "4px 0 14px" }}>When the lost games shipped</h3>
          <BarList rows={i.byDecade} hrefFor={(n) => `/catalog?decade=${enc(n)}`} />
        </div>
      </div>

      <Section
        strap="DISPLAY VIII · DEVELOPERS"
        title="Studios with the deepest losses"
      >
        <BarList rows={i.byDeveloper} hrefFor={(n) => `/catalog?developer=${enc(n)}`} />
      </Section>

      <div className="stack-mobile" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: "1px solid var(--rule)" }}>
        <div style={{ padding: "24px 32px", borderRight: "1px solid var(--rule)" }}>
          <div className="strap">DISPLAY IX · GAME MODES</div>
          <h3 className="font-serif" style={{ fontSize: 22, fontWeight: 600, margin: "4px 0 14px" }}>How they were played</h3>
          {i.byMode.length ? (
            <BarList rows={i.byMode} hrefFor={(n) => `/catalog?mode=${enc(n)}`} />
          ) : (
            <Empty label="Game-mode data is still being enriched." />
          )}
        </div>
        <div style={{ padding: "24px 32px" }}>
          <div className="strap">DISPLAY X · PERSPECTIVE</div>
          <h3 className="font-serif" style={{ fontSize: 22, fontWeight: 600, margin: "4px 0 14px" }}>Point of view</h3>
          {i.byPerspective.length ? (
            <BarList rows={i.byPerspective} hrefFor={(n) => `/catalog?perspective=${enc(n)}`} />
          ) : (
            <Empty label="Player-perspective data is still being enriched." />
          )}
        </div>
      </div>

      <Section strap="DISPLAY XI · THEMES" title="The moods we have lost">
        {i.byTheme.length ? (
        <div className="scroll-x" style={{ border: "1px solid var(--ink)", padding: 4, background: "var(--paper-2)" }}>
          <div className="treemap">
            {i.byTheme.map((t, idx) => {
              const s = TILE_SPANS[idx] ?? { col: 3, row: 1, c: "t-soft" };
              return (
                <Link
                  key={t.name}
                  href={`/catalog?theme=${enc(t.name)}`}
                  className={`tile ${s.c}`}
                  style={{ gridColumn: `span ${s.col}`, gridRow: `span ${s.row}` }}
                >
                  <div className="tname">{t.name}</div>
                  <div className="tcount">{t.count.toLocaleString()}</div>
                </Link>
              );
            })}
          </div>
        </div>
        ) : (
          <Empty label="Theme data is still being enriched." />
        )}
      </Section>

      <Section
        strap="DISPLAY XII · QUALITY OVER TIME"
        title="Average rating by decade"
        note={`Average user rating among rated titles, decade by decade. The axis is zoomed to ${axisLo}–${axisHi} so the differences between decades are visible.`}
      >
        {ratedDecades.length ? (
          <div className="hist">
            {ratedDecades.map((d) => (
              <div key={d.name} className="hist-col">
                <div className="hist-val">{d.avg}</div>
                <div
                  className={`hist-bar ${d.avg >= 75 ? "accent" : ""}`}
                  style={{ height: `${Math.max(6, ((d.avg - axisLo) / axisSpan) * BAR_PX)}px` }}
                />
                <div className="hist-label">{d.name}</div>
              </div>
            ))}
          </div>
        ) : (
          <Empty label="Not enough rated titles yet to chart quality over time." />
        )}
      </Section>

      {i.byFranchise.length ? (
        <Section strap="DISPLAY XIII · FRANCHISES" title="Series that lost entries">
          <BarList rows={i.byFranchise} hrefFor={(n) => `/catalog?q=${enc(n)}`} />
        </Section>
      ) : null}

      <Section
        strap="HALL OF RECORDS · TOP RATED, WITHDRAWN"
        title="The best games no longer sold"
        note="The twelve highest-rated titles in the catalogue. Proof that quality is no shield against delisting."
      >
        <div className="cardgrid">
          {i.topAcclaimed.map((g, idx) => (
            <Link
              key={g.slug}
              href={`/record/${g.slug}`}
              className="indexcard"
              style={{ padding: "14px 16px" }}
            >
              <div className="deweycall">{g.callNumber}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <div className="font-serif" style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.2 }}>
                  {idx + 1}. {g.title}
                </div>
                <div className="font-display accent" style={{ fontSize: 22, fontWeight: 900 }}>{g.rating}</div>
              </div>
              <div className="font-serif muted" style={{ fontStyle: "italic", fontSize: 11, marginTop: 4 }}>
                {g.year ?? "—"} · {g.publisher ?? "Unknown"}
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <div style={{ height: 40 }} />
    </UShell>
  );
}
