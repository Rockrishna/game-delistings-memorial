import Link from "next/link";
import { notFound } from "next/navigation";
import UShell from "@/components/shell/UShell";
import { getRecord, getTotalCount } from "@/lib/catalog";

export const dynamic = "force-dynamic";

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

  return (
    <UShell total={total}>
      <div style={{ padding: "24px 28px 8px" }}>
        <div className="strap accent" style={{ fontSize: 11, letterSpacing: "0.16em" }}>CALL NO. {g.callNumber}</div>
        <h2 className="font-serif" style={{ fontSize: 42, fontWeight: 600, margin: "6px 0 2px" }}>{g.title}</h2>
        <div className="font-serif" style={{ fontStyle: "italic", color: "var(--ink-2)", fontSize: 15 }}>
          {g.developer ?? "Unknown developer"} · {g.year ?? "—"} · published by {g.publisher ?? "Unknown"}
        </div>
      </div>

      <div className="stack-mobile" style={{ display: "grid", gridTemplateColumns: "320px 1fr 260px", borderTop: "1px solid var(--rule)" }}>
        <div style={{ padding: 24, borderRight: "1px solid var(--rule)" }}>
          <div className={`cover ${g.coverUrl ? "has-img" : ""}`} style={{ aspectRatio: "3/4" }}>
            {g.coverUrl ? (
              <img src={g.coverUrl} alt={`${g.title} cover`} />
            ) : null}
            <div className="label">FRONTISPIECE</div>
            <div className="corner-tag">{g.callNumber}</div>
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="chip solid">{g.statusLabel}</span>
            {g.enrichedFrom ? <span className="chip">{g.enrichedFrom}</span> : null}
          </div>

          <div className="bar-row" style={{ marginTop: 24 }}>
            <span className="bar-name">Rating</span>
            <span className="bar-track"><span className="bar-fill accent" style={{ width: `${g.rating ?? 0}%` }} /></span>
            <span className="bar-count">{g.rating ?? "—"}</span>
          </div>
          {g.medianRating != null ? (
            <div className="bar-row">
              <span className="bar-name">Median</span>
              <span className="bar-track"><span className="bar-fill" style={{ width: `${g.medianRating}%` }} /></span>
              <span className="bar-count">{g.medianRating}</span>
            </div>
          ) : null}
        </div>

        <div style={{ padding: "24px 28px", borderRight: "1px solid var(--rule)" }}>
          <div className="strap">CATALOG RECORD</div>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", rowGap: 10, columnGap: 18, marginTop: 10, fontSize: 14 }}>
            {meta.map(([k, v]) => (
              <div key={k} style={{ display: "contents" }}>
                <div className="strap" style={{ fontSize: 10 }}>{k.toUpperCase()}</div>
                <div className="font-serif">{v}</div>
              </div>
            ))}
          </div>

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
                        <img src={x.coverUrl} alt={`${x.title} cover`} />
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
            <div className="strap accent">EXTERNAL ENTRY</div>
            <div className="font-serif" style={{ fontSize: 18, fontWeight: 600, marginTop: 6, lineHeight: 1.2 }}>View on IGDB</div>
            <div className="font-serif muted" style={{ fontStyle: "italic", fontSize: 13, marginTop: 4 }}>
              Open the canonical entry for cover assets, screenshots, and
              external links.
            </div>
            <a
              href={igdbUrl}
              target="_blank"
              rel="noreferrer"
              className="font-serif"
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, padding: "10px 12px", background: "var(--ink)", color: "var(--paper)", fontSize: 13, fontWeight: 600 }}
            >
              <span>↗ igdb.com/games/{g.slug}</span>
              <span className="font-mono" style={{ opacity: 0.7 }}>↗</span>
            </a>
            <div className="font-mono muted" style={{ fontSize: 10, marginTop: 8, letterSpacing: "0.08em" }}>
              IGDB ID · {g.igdbId ?? "—"} · slug · {g.slug}
            </div>
          </div>

          {g.websites.length ? (
            <div style={{ marginTop: 16 }}>
              <div className="strap">OFFICIAL LINKS</div>
              <ul className="font-serif" style={{ listStyle: "none", padding: 0, margin: "8px 0 0", fontSize: 13 }}>
                {g.websites.slice(0, 8).map((w, idx) => (
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
              last IGDB sync {g.lastSyncedAt ? g.lastSyncedAt.slice(0, 10) : "—"}
            </div>
          </div>
        </aside>
      </div>
    </UShell>
  );
}
