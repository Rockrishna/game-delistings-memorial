import Link from "next/link";
import { notFound } from "next/navigation";
import UShell from "@/components/shell/UShell";
import { getRecord, getTotalCount } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const g = await getRecord(slug);
  if (!g) return { title: "Record not found" };
  const bits = [g.year, g.publisher, g.platforms.join(", ")].filter(Boolean);
  return {
    title: g.title,
    description: `${g.title} (${bits.join(" · ") || "delisted game"}) — catalog record ${g.callNumber} in the Delisted Games Tracker.`,
    openGraph: {
      title: g.title,
      description: g.summary?.slice(0, 200) ?? `Catalog record for the delisted game ${g.title}.`,
      images: g.coverUrl ? [{ url: g.coverUrl }] : undefined,
    },
  };
}

export default async function RecordPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [g, total] = await Promise.all([getRecord(slug), getTotalCount()]);
  if (!g) notFound();

  const meta: Array<[string, string]> = [
    ["Storefronts", g.platforms.join(" · ") || "—"],
    ["Genres", g.genres.join(", ") || "—"],
    ["Publisher", g.publisher ?? "Unknown"],
    ["Developer", g.developer ?? "Unknown"],
    ["First release", g.year != null ? String(g.year) : "—"],
    ["Decade", g.decade ?? "—"],
    ["IGDB rating", g.rating != null ? `${g.rating} / 100` : "unrated"],
    ["Status", g.statusLabel],
  ];
  if (g.franchise) meta.push(["Franchise", g.franchise]);
  if (g.gameModes.length) meta.push(["Game modes", g.gameModes.join(", ")]);
  if (g.themes.length) meta.push(["Themes", g.themes.join(", ")]);
  if (g.perspectives.length) meta.push(["Perspective", g.perspectives.join(", ")]);
  if (g.metacritic != null) meta.push(["Metacritic", `${g.metacritic} / 100`]);

  const igdbUrl = `https://www.igdb.com/games/${g.slug}`;
  const rawgUrl = g.rawgSlug ? `https://rawg.io/games/${g.rawgSlug}` : null;
  // Merge IGDB's official websites with RAWG's external links (store pages,
  // official site, Reddit, Metacritic), de-duplicated by URL.
  const seenUrls = new Set<string>();
  const externalLinks = [...g.websites, ...g.rawgLinks].filter((l) => {
    if (!l.url || seenUrls.has(l.url)) return false;
    seenUrls.add(l.url);
    return true;
  });

  return (
    <UShell total={total}>
      <div style={{ padding: "24px 28px 8px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <div className="font-mono" style={{ fontSize: 26, fontWeight: 700, letterSpacing: "0.04em", color: "var(--accent)" }}>
            {g.callNumber}
          </div>
          <Link href="/cataloguing" className="strap" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>
            what&rsquo;s this number? ↗
          </Link>
        </div>
        <h2 className="font-serif" style={{ fontSize: "clamp(26px, 6vw, 42px)", fontWeight: 600, margin: "8px 0 2px" }}>{g.title}</h2>
        <div className="font-serif" style={{ color: "var(--ink-2)", fontSize: 15 }}>
          {g.developer ?? "Unknown developer"} · {g.year ?? "—"} · published by {g.publisher ?? "Unknown"}
        </div>
      </div>

      <div className="stack-mobile" style={{ display: "grid", gridTemplateColumns: "320px 1fr 260px", borderTop: "1px solid var(--rule)" }}>
        <div style={{ padding: 24, borderRight: "1px solid var(--rule)" }}>
          {/* maxWidth keeps the cover postcard-sized when columns stack on phones */}
          <div className={`cover ${g.coverUrl ? "has-img" : ""}`} style={{ aspectRatio: "3/4", maxWidth: 300, marginInline: "auto" }}>
            {g.coverUrl ? (
              <img src={g.coverUrl} alt={`${g.title} cover`} width={264} height={374} fetchPriority="high" />
            ) : null}
            <div className="label">FRONTISPIECE</div>
            <div className="corner-tag">{g.callNumber}</div>
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="chip solid">{g.statusLabel}</span>
            {g.enrichedFrom ? <span className="chip">{g.enrichedFrom}</span> : null}
          </div>

          <div className="bar-row" style={{ marginTop: 24 }} role="img" aria-label={`IGDB rating ${g.rating ?? "unrated"} out of 100`}>
            <span className="bar-name">Rating</span>
            <span className="bar-track"><span className="bar-fill accent" style={{ width: `${g.rating ?? 0}%` }} /></span>
            <span className="bar-count">{g.rating ?? "—"}</span>
          </div>
          {g.medianRating != null ? (
            <div className="bar-row" role="img" aria-label={`Catalogue median rating ${g.medianRating} out of 100`}>
              <span className="bar-name">Median</span>
              <span className="bar-track"><span className="bar-fill" style={{ width: `${g.medianRating}%` }} /></span>
              <span className="bar-count">{g.medianRating}</span>
            </div>
          ) : null}
        </div>

        <div style={{ padding: "24px 28px", borderRight: "1px solid var(--rule)" }}>
          <div className="strap">CATALOG RECORD</div>
          <dl style={{ display: "grid", gridTemplateColumns: "120px 1fr", rowGap: 10, columnGap: 18, margin: "10px 0 0", fontSize: 14 }}>
            {meta.map(([k, v]) => (
              <div key={k} style={{ display: "contents" }}>
                <dt className="strap" style={{ fontSize: 10 }}>{k.toUpperCase()}</dt>
                <dd className="font-serif" style={{ margin: 0 }}>{v}</dd>
              </div>
            ))}
          </dl>

          {g.ageRatings.length ? (
            <>
              <hr className="hr" style={{ margin: "22px 0" }} />
              <div className="strap">AGE RATINGS</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {g.ageRatings.map((a, idx) => (
                  <span key={idx} className="chip">{a.category} · {a.rating}</span>
                ))}
              </div>
            </>
          ) : null}

          <hr className="hr" style={{ margin: "22px 0" }} />
          <div className="strap">SUMMARY</div>
          <p className="font-serif" style={{ color: "var(--ink-2)", marginTop: 6, maxWidth: 640, fontSize: 14 }}>
            {g.summary ?? "No summary available for this title."}
          </p>

          {g.adjacent.length ? (
            <>
              <hr className="hr" style={{ margin: "22px 0" }} />
              <div className="strap">ADJACENT CARDS · SAME PUBLISHER / DECADE</div>
              <div className="cardgrid tight" style={{ marginTop: 10 }}>
                {g.adjacent.map((x) => (
                  <Link key={x.slug} href={`/record/${x.slug}`} className="indexcard" style={{ padding: 8 }}>
                    <div className={`cover ${x.coverUrl ? "has-img" : ""}`} style={{ aspectRatio: "3/4" }}>
                      {x.coverUrl ? (
                        <img src={x.coverUrl} alt={`${x.title} cover`} width={264} height={374} loading="lazy" decoding="async" />
                      ) : null}
                    </div>
                    <div className="font-serif" style={{ fontWeight: 600, fontSize: 12, marginTop: 6, lineHeight: 1.2 }}>{x.title}</div>
                    <div className="strap" style={{ fontSize: 9, marginTop: 2 }}>{x.callNumber}</div>
                  </Link>
                ))}
              </div>
            </>
          ) : null}
        </div>

        <aside style={{ padding: "24px 20px" }}>
          <div style={{ border: "1.5px solid var(--ink)", padding: 16, background: "var(--paper-2)" }}>
            <div className="strap accent">DATABASE ENTRIES</div>
            <div className="font-serif muted" style={{ fontSize: 13, margin: "6px 0 12px" }}>
              The canonical database entries this record is sourced from.
            </div>
            <a
              href={igdbUrl}
              target="_blank"
              rel="noreferrer"
              className="font-serif"
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "var(--ink)", color: "var(--paper)", fontSize: 13, fontWeight: 600 }}
            >
              <span>↗ View on IGDB</span>
              <span className="font-mono" style={{ opacity: 0.7 }}>↗</span>
            </a>
            {rawgUrl ? (
              <a
                href={rawgUrl}
                target="_blank"
                rel="noreferrer"
                className="font-serif"
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, padding: "10px 12px", border: "1px solid var(--ink)", color: "var(--ink)", fontSize: 13, fontWeight: 600 }}
              >
                <span>↗ View on RAWG</span>
                <span className="font-mono" style={{ opacity: 0.7 }}>↗</span>
              </a>
            ) : null}
            <div className="font-mono muted" style={{ fontSize: 10, marginTop: 10, letterSpacing: "0.08em" }}>
              IGDB ID · {g.igdbId ?? "—"}{g.rawgId ? ` · RAWG ID · ${g.rawgId}` : ""}
            </div>
          </div>

          {externalLinks.length ? (
            <div style={{ marginTop: 16 }}>
              <div className="strap">EXTERNAL LINKS</div>
              <div className="font-serif muted" style={{ fontSize: 11, marginTop: 2 }}>
                Store pages &amp; official links via IGDB and RAWG.
              </div>
              <ul className="font-serif" style={{ listStyle: "none", padding: 0, margin: "8px 0 0", fontSize: 13 }}>
                {externalLinks.slice(0, 12).map((w, idx) => (
                  <li key={idx} style={{ padding: "6px 0", borderBottom: "1px dashed var(--rule-soft)", display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <a href={w.url} target="_blank" rel="noreferrer">↗ {w.category}</a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div style={{ marginTop: 18 }}>
            <div className="strap">THIS RECORD</div>
            <div className="font-mono muted" style={{ fontSize: 10, marginTop: 6 }}>
              call no. · {g.callNumber}
              <br />
              entry created {g.createdAt.slice(0, 10)}
              <br />
              last synced {g.lastSyncedAt ? g.lastSyncedAt.slice(0, 10) : "—"}
            </div>
            <div className="font-serif muted" style={{ fontSize: 12, marginTop: 8 }}>
              Search any part of the call number (store, year, or digits) in the ⌕ bar to find this record. <Link href="/cataloguing" className="accent">How the numbering works ↗</Link>
            </div>
          </div>
        </aside>
      </div>
    </UShell>
  );
}
