import Link from "next/link";
import UShell from "@/components/shell/UShell";
import HomeStream from "@/components/home/HomeStream";
import { getOverview } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const o = await getOverview();

  const yearSpan =
    o.yearMin != null && o.yearMax != null ? o.yearMax - o.yearMin : null;
  const tiles: Array<[string, string, string]> = [
    ["DEVELOPERS", o.developers.toLocaleString(), "distinct studios"],
    ["PUBLISHERS", o.publishers.toLocaleString(), "distinct imprints"],
    [
      "RELEASE YEARS",
      o.yearMin != null && o.yearMax != null ? `${o.yearMin}–${o.yearMax}` : "—",
      yearSpan != null ? `${yearSpan} years of releases` : "—",
    ],
  ];

  const begin = [
    { t: "Browse the catalogue", d: `Filter ${o.total.toLocaleString()} records by storefront, decade, genre, publisher, and more.`, a: "open the catalogue →", href: "/catalog" },
    { t: "Read the insights", d: "Charts and rankings across the whole collection, each one a link back into the catalogue.", a: "see the charts →", href: "/insights" },
    { t: "Understand a call number", d: "What STE · 2014 · 8234 means, and how to search by any part of it.", a: "how filing works →", href: "/cataloguing" },
    { t: "Check the shelf order", d: "Why 2 Fast 2 Furious files before Alpha Protocol, and where blanks go.", a: "shelf order →", href: "/sorting" },
  ];

  return (
    <UShell total={o.total}>
      <div className="stack-mobile" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", borderBottom: "1px solid var(--rule)" }}>
        <div style={{ padding: "32px 36px", borderRight: "1px solid var(--rule)" }}>
          <div className="strap" style={{ color: "var(--accent)" }}>THE COLLECTION</div>
          <div className="bignum" style={{ margin: "10px 0 4px" }}>{o.total.toLocaleString()}</div>
          <p className="font-serif" style={{ fontSize: 18, color: "var(--ink-2)", maxWidth: 660, margin: "6px 0 0" }}>
            games no longer sold on major digital storefronts, catalogued from
            public game databases. Each one has a record of its own and a{" "}
            <Link href="/cataloguing" className="accent">call number</Link>{" "}
            saying where it is filed.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 18, marginTop: 30 }}>
            {tiles.map(([k, v, extra]) => (
              <div key={k} style={{ borderTop: "1px solid var(--ink)", paddingTop: 8 }}>
                <div className="strap" style={{ fontSize: 9 }}>{k}</div>
                <div className="font-serif" style={{ fontSize: "clamp(22px, 2.4vw, 32px)", fontWeight: 600, lineHeight: 1.05, marginTop: 4, whiteSpace: "nowrap" }}>{v}</div>
                <div className="font-serif" style={{ color: "var(--ink-3)", fontSize: 12, marginTop: 4 }}>{extra}</div>
              </div>
            ))}
          </div>
        </div>

        {/* The drawers stack two-up and stretch to the height of the panel
            beside them (see .shelfgrid), so this half of the band fills
            instead of trailing off into empty paper on a wide screen. */}
        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column" }}>
          <div className="strap" style={{ marginBottom: 10 }}>BY STOREFRONT</div>
          <div className="shelfgrid">
            {o.byPlatform.map((p) => (
              <Link
                key={p.name}
                href={`/catalog?platform=${encodeURIComponent(p.name)}`}
                className="drawer"
                style={{ minHeight: 84, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "stretch" }}
              >
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                  <span className="font-serif" style={{ fontSize: 18, fontWeight: 600 }}>{p.name}</span>
                  <span className="accent font-typewriter" style={{ fontSize: 12, letterSpacing: "0.08em" }}>
                    {p.count.toLocaleString()}
                  </span>
                </div>
                <div className="drawer-meter" aria-hidden="true">
                  <span style={{ width: `${Math.max(2, p.pct)}%` }} />
                </div>
                <div className="font-serif" style={{ color: "var(--ink-3)", fontSize: 11, marginTop: 5 }}>
                  {p.pct}% of the catalogue
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: "28px 36px" }}>
        <div className="strap" style={{ marginBottom: 14 }}>WHERE TO BEGIN</div>
        <div className="cardgrid fitted">
          {begin.map((c) => (
            <Link
              key={c.t}
              href={c.href}
              className="indexcard"
              style={{ display: "flex", flexDirection: "column", gap: 6 }}
            >
              <div className="font-serif" style={{ fontWeight: 600, fontSize: 18, lineHeight: 1.25 }}>{c.t}</div>
              <div className="font-serif" style={{ color: "var(--ink-2)", fontSize: 13, lineHeight: 1.5, flex: 1 }}>{c.d}</div>
              <div className="accent font-typewriter" style={{ fontSize: 10, letterSpacing: "0.1em", marginTop: 8 }}>{c.a}</div>
            </Link>
          ))}
        </div>
      </div>

      <div style={{ padding: "8px 36px 48px", borderTop: "1px solid var(--rule)" }}>
        <div style={{ margin: "20px 0 14px" }}>
          <div className="strap">NEWEST RELEASES</div>
          <p className="font-serif muted" style={{ fontSize: 13, margin: "4px 0 0" }}>
            The whole shelf, most recently released first. Keep scrolling, or{" "}
            <Link href="/catalog" className="accent">open the catalogue</Link> to
            filter it.
          </p>
        </div>
        <HomeStream />
      </div>
    </UShell>
  );
}
