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
      "YEARS OF RELEASES",
      yearSpan != null ? String(yearSpan) : "—",
      o.yearMin != null && o.yearMax != null ? `${o.yearMin}–${o.yearMax}` : "—",
    ],
  ];

  const begin = [
    { t: "Browse the catalog", d: `${o.total.toLocaleString()} records · filter by anything`, a: "open the catalog →", href: "/catalog" },
    { t: "Explore the insights", d: "Charts, heatmaps, and patterns", a: "insights →", href: "/insights" },
    { t: "Search for a title", d: "By name, publisher, developer, or call number", a: "⌕ search →", href: "/catalog" },
  ];

  return (
    <UShell total={o.total}>
      <div className="stack-mobile" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", borderBottom: "1px solid var(--rule)" }}>
        <div style={{ padding: "32px 36px", borderRight: "1px solid var(--rule)" }}>
          <div className="strap" style={{ color: "var(--accent)" }}>THE COLLECTION</div>
          <div className="bignum" style={{ margin: "10px 0 4px" }}>{o.total.toLocaleString()}</div>
          <p className="font-serif" style={{ fontSize: 18, color: "var(--ink-2)", maxWidth: 520, margin: "6px 0 0" }}>
            games that are no longer sold on major digital storefronts,
            catalogued from public game databases. Each has its own record and
            a filing number.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 18, marginTop: 30 }}>
            {tiles.map(([k, v, extra]) => (
              <div key={k} style={{ borderTop: "1px solid var(--ink)", paddingTop: 8 }}>
                <div className="strap" style={{ fontSize: 9 }}>{k}</div>
                <div className="font-serif" style={{ fontSize: 34, fontWeight: 600, lineHeight: 1, marginTop: 4 }}>{v}</div>
                <div className="font-serif" style={{ color: "var(--ink-3)", fontSize: 12, marginTop: 4 }}>{extra}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: "24px 28px" }}>
          <div className="strap">SHELF I · BY STOREFRONT</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginTop: 10 }}>
            {o.byPlatform.map((p, i) => (
              <Link
                key={p.name}
                href={`/catalog?platform=${encodeURIComponent(p.name)}`}
                className="drawer"
                style={{ minHeight: 104, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "flex-start" }}
              >
                <div className="strap" style={{ fontSize: 9 }}>DRAWER {String(i + 1).padStart(2, "0")}</div>
                <div className="font-serif" style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}>{p.name}</div>
                <div className="accent font-typewriter" style={{ fontSize: 11, letterSpacing: "0.1em", marginTop: 4 }}>
                  {p.count.toLocaleString()}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: "28px 36px" }}>
        <div className="strap" style={{ marginBottom: 14 }}>WHERE TO BEGIN</div>
        <div className="cardgrid">
          {begin.map((c, i) => (
            <Link key={c.t} href={c.href} className="indexcard">
              <div className="deweycall">CARD · {String(i + 1).padStart(3, "0")}</div>
              <div className="font-serif" style={{ fontWeight: 600, fontSize: 18 }}>{c.t}</div>
              <div className="font-serif" style={{ color: "var(--ink-2)", fontSize: 13, marginTop: 4 }}>{c.d}</div>
              <div className="accent font-typewriter" style={{ fontSize: 10, letterSpacing: "0.1em", marginTop: 14 }}>{c.a}</div>
            </Link>
          ))}
        </div>
      </div>

      <div style={{ padding: "8px 36px 48px", borderTop: "1px solid var(--rule)" }}>
        <div className="strap" style={{ margin: "20px 0 14px" }}>
          MORE FROM THE CATALOGUE
        </div>
        <HomeStream />
      </div>
    </UShell>
  );
}
