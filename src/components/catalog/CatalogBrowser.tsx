"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type Card = {
  slug: string;
  callNumber: string;
  title: string;
  year: number | null;
  decade: string | null;
  platforms: string[];
  publisher: string | null;
  developer: string | null;
  genres: string[];
  rating: number | null;
};

type Facets = Record<string, Array<{ name: string; count: number }>>;

type ApiResult = {
  total: number;
  page: number;
  pageSize: number;
  pages: number;
  rows: Card[];
  facets: Facets;
};

const FACET_KEYS = ["Platform", "Decade", "Genre", "Publisher", "Rating"] as const;
type FacetKey = (typeof FACET_KEYS)[number];

const PARAM: Record<FacetKey, string> = {
  Platform: "platform",
  Decade: "decade",
  Genre: "genre",
  Publisher: "publisher",
  Rating: "rating",
};

function parseAdvanced(text: string): Record<string, string[]> {
  // key:value tokens (platform:steam decade:2010s rating:"≥ 90") + free text
  const out: Record<string, string[]> = {};
  const free: string[] = [];
  const re = /(\w+):"([^"]+)"|(\w+):(\S+)|"([^"]+)"|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const key = (m[1] || m[3])?.toLowerCase();
    const val = m[2] || m[4];
    if (key && val) {
      (out[key] ||= []).push(val);
    } else {
      free.push(m[5] || m[6] || "");
    }
  }
  if (free.length) out.q = [free.join(" ")];
  return out;
}

export default function CatalogBrowser() {
  const router = useRouter();
  const sp = useSearchParams();
  const mode = sp.get("mode") === "advanced" ? "advanced" : "simple";

  const [data, setData] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [queryText, setQueryText] = useState("");

  const filters = useMemo(() => {
    const f: Record<string, string[]> = {};
    for (const key of FACET_KEYS) {
      const vals = sp.getAll(PARAM[key]).flatMap((v) => v.split(",")).filter(Boolean);
      if (vals.length) f[PARAM[key]] = vals;
    }
    const q = sp.get("q");
    if (q) f.q = [q];
    return f;
  }, [sp]);

  const page = Number(sp.get("page") || "1") || 1;
  const sort = sp.get("sort") || "title";

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    for (const [k, vals] of Object.entries(filters)) for (const v of vals) p.append(k, v);
    p.set("page", String(page));
    p.set("sort", sort);
    p.set("pageSize", "24");
    return p.toString();
  }, [filters, page, sort]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      try {
        const r = await fetch(`/api/catalog?${queryString}`);
        const d = (await r.json()) as ApiResult;
        if (!cancelled) setData(d);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [queryString]);

  const pushParams = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const p = new URLSearchParams(sp.toString());
      mutate(p);
      router.push(`/catalog?${p.toString()}`);
    },
    [router, sp]
  );

  function setMode(next: "simple" | "advanced") {
    pushParams((p) => p.set("mode", next));
  }

  function toggleFacet(key: FacetKey, value: string) {
    pushParams((p) => {
      const param = PARAM[key];
      const existing = p.getAll(param).flatMap((v) => v.split(",")).filter(Boolean);
      const next = existing.includes(value)
        ? existing.filter((v) => v !== value)
        : [...existing, value];
      p.delete(param);
      for (const v of next) p.append(param, v);
      p.set("page", "1");
    });
  }

  function clearAll() {
    pushParams((p) => {
      for (const key of FACET_KEYS) p.delete(PARAM[key]);
      p.delete("q");
      p.set("page", "1");
    });
  }

  function runAdvanced() {
    const parsed = parseAdvanced(queryText);
    pushParams((p) => {
      for (const key of FACET_KEYS) p.delete(PARAM[key]);
      p.delete("q");
      for (const [k, vals] of Object.entries(parsed)) {
        for (const v of vals) p.append(k, v);
      }
      p.set("page", "1");
      p.set("mode", "advanced");
    });
  }

  function goPage(n: number) {
    pushParams((p) => p.set("page", String(n)));
  }

  const facets = data?.facets ?? {};
  const activeChips = Object.entries(filters).flatMap(([k, vals]) =>
    vals.map((v) => ({ k, v }))
  );

  return (
    <>
      <div style={{ padding: "20px 28px 12px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="strap">THE CATALOG · {mode === "simple" ? "VISUAL INDEX" : "QUERY BUILDER"}</div>
          <h2 className="font-serif" style={{ fontSize: 30, margin: "4px 0", fontWeight: 600 }}>
            {mode === "simple"
              ? `${(data?.total ?? 0).toLocaleString()} cards filed`
              : "Build a view of the ledger"}
          </h2>
          <p className="font-serif muted" style={{ fontStyle: "italic", margin: "2px 0 0", fontSize: 13, maxWidth: 520 }}>
            {mode === "simple"
              ? "Browse covers and filter from the rail. Switch to advanced for query syntax + export."
              : "Compose any cross-section using IGDB metadata. Every URL is a permanent citation."}
          </p>
        </div>
        <div style={{ display: "flex", border: "1px solid var(--ink)" }}>
          {(["simple", "advanced"] as const).map((m, idx) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                border: 0,
                padding: "6px 14px",
                fontFamily: "var(--typewriter)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                cursor: "pointer",
                background: mode === m ? "var(--ink)" : "transparent",
                color: mode === m ? "var(--paper)" : "var(--ink-2)",
                borderRight: idx === 0 ? "1px solid var(--ink)" : "none",
              }}
            >
              {m === "simple" ? "◧ simple" : "◨ advanced"}
            </button>
          ))}
        </div>
      </div>

      {mode === "advanced" ? (
        <div style={{ padding: "18px 28px", borderTop: "1px solid var(--rule)", borderBottom: "1px solid var(--rule)", background: "var(--paper-2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", border: "1.5px solid var(--ink)", background: "var(--paper)" }}>
            <span className="accent font-mono" style={{ fontSize: 14 }}>$</span>
            <input
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runAdvanced()}
              placeholder='select * where platform:steam decade:2010s rating:"≥ 90"'
              style={{ flex: 1, background: "none", border: 0, outline: "none", fontFamily: "var(--mono)", fontSize: 14, color: "var(--ink)" }}
            />
            <button className="chip" onClick={runAdvanced}>⌘↵ run</button>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
            <span className="font-serif muted" style={{ fontStyle: "italic" }}>Try:</span>
            {['publisher:Konami', 'platform:Steam decade:2010s', 'rating:"≥ 90"', 'genre:Racing'].map((ex) => (
              <button key={ex} className="chip" onClick={() => setQueryText(ex)}>{ex}</button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 28px", borderTop: "1px solid var(--rule)", borderBottom: "1px solid var(--rule)", background: "var(--paper-2)" }}>
          <span className="font-serif muted" style={{ fontSize: 18 }}>⌕</span>
          <input
            defaultValue={filters.q?.[0] ?? ""}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const v = (e.target as HTMLInputElement).value;
                pushParams((p) => {
                  if (v) p.set("q", v);
                  else p.delete("q");
                  p.set("page", "1");
                });
              }
            }}
            placeholder="Search by title, publisher, developer…"
            style={{ flex: 1, background: "none", border: 0, outline: "none", fontFamily: "var(--serif)", fontStyle: "italic", color: "var(--ink-2)", fontSize: 15 }}
          />
          <select
            value={sort}
            onChange={(e) => pushParams((p) => p.set("sort", e.target.value))}
            className="chip"
            style={{ appearance: "none" }}
          >
            <option value="title">sort : title</option>
            <option value="rating">sort : rating</option>
            <option value="year">sort : year</option>
          </select>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr" }}>
        <aside style={{ borderRight: "1.5px solid var(--ink)", padding: "18px 20px 24px" }}>
          <div className="strap accent" style={{ marginBottom: 6 }}>
            ACTIVE FILTERS · {activeChips.length}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {activeChips.map(({ k, v }) => (
              <button
                key={`${k}:${v}`}
                className="chip accent"
                onClick={() =>
                  pushParams((p) => {
                    const cur = p.getAll(k).flatMap((x) => x.split(",")).filter(Boolean);
                    p.delete(k);
                    for (const x of cur.filter((c) => c !== v)) p.append(k, x);
                    p.set("page", "1");
                  })
                }
              >
                {k} : {v} ✕
              </button>
            ))}
            {activeChips.length ? (
              <button className="chip" onClick={clearAll}>clear all</button>
            ) : null}
          </div>

          {FACET_KEYS.map((key) => (
            <div key={key} style={{ marginBottom: 18 }}>
              <div className="strap" style={{ borderBottom: "1px solid var(--ink)", paddingBottom: 4, display: "flex", justifyContent: "space-between" }}>
                <span>{key}</span>
              </div>
              {(facets[key] ?? []).slice(0, 8).map((f) => {
                const checked = (filters[PARAM[key]] ?? []).includes(f.name);
                return (
                  <label
                    key={f.name}
                    className="font-serif"
                    style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13, color: checked ? "var(--ink)" : "var(--ink-2)", cursor: "pointer" }}
                  >
                    <span>
                      <span
                        style={{ display: "inline-block", width: 11, height: 11, border: "1px solid var(--ink-3)", marginRight: 7, verticalAlign: "middle", background: checked ? "var(--ink)" : "transparent" }}
                      />
                      <input type="checkbox" checked={checked} onChange={() => toggleFacet(key, f.name)} style={{ display: "none" }} />
                      {f.name}
                    </span>
                    <span className="font-typewriter muted" style={{ fontSize: 10 }}>{f.count.toLocaleString()}</span>
                  </label>
                );
              })}
            </div>
          ))}
        </aside>

        <section style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
            <div className="font-serif">
              <strong>{(data?.total ?? 0).toLocaleString()}</strong> records match
              {loading ? <span className="muted" style={{ fontStyle: "italic" }}> · loading…</span> : null}
            </div>
            <a className="chip" href={`/api/catalog?${queryString}&pageSize=120`} download="catalogue.json">⤓ JSON</a>
          </div>

          {mode === "simple" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, rowGap: 18 }}>
              {(data?.rows ?? []).map((g) => (
                <Link key={g.slug} href={`/record/${g.slug}`} className="indexcard" style={{ padding: 10 }}>
                  <div className="deweycall" style={{ fontSize: 9, marginBottom: 6, paddingBottom: 4 }}>{g.callNumber}</div>
                  <div className="cover" style={{ aspectRatio: "3/4" }}>
                    <div className="label" style={{ fontSize: 8 }}>{(g.platforms[0] ?? "—").slice(0, 6).toUpperCase()}</div>
                  </div>
                  <div className="font-serif" style={{ fontWeight: 600, fontSize: 13, marginTop: 8, lineHeight: 1.2 }}>{g.title}</div>
                  <div className="font-serif muted" style={{ fontStyle: "italic", fontSize: 11, marginTop: 2 }}>
                    {g.year ?? "—"} · {g.publisher ?? "Unknown"}
                  </div>
                  <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                    {g.genres.slice(0, 2).map((x) => (
                      <span key={x} className="font-typewriter muted" style={{ fontSize: 8, letterSpacing: "0.08em" }}>{x.toUpperCase()}</span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <table className="ledger">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Call no.</th>
                  <th>Title</th>
                  <th style={{ width: 150 }}>Platforms</th>
                  <th style={{ width: 130 }}>Publisher</th>
                  <th style={{ width: 60 }}>Year</th>
                  <th style={{ width: 60 }}>Rating</th>
                </tr>
              </thead>
              <tbody>
                {(data?.rows ?? []).map((g) => (
                  <tr key={g.slug}>
                    <td className="accent">{g.callNumber}</td>
                    <td>
                      <Link href={`/record/${g.slug}`} className="font-serif" style={{ fontWeight: 600, fontSize: 13 }}>{g.title}</Link>
                      <div className="font-serif muted" style={{ fontStyle: "italic", fontSize: 11 }}>
                        {(g.genres[0] ?? "—")} · {g.developer ?? "Unknown"}
                      </div>
                    </td>
                    <td className="muted" style={{ fontSize: 11 }}>{g.platforms.join(" · ") || "—"}</td>
                    <td className="muted" style={{ fontSize: 11 }}>{g.publisher ?? "—"}</td>
                    <td>{g.year ?? "—"}</td>
                    <td className={g.rating != null && g.rating >= 80 ? "accent" : ""}>{g.rating ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 24, flexWrap: "wrap" }}>
            <button className="chip" disabled={page <= 1} onClick={() => goPage(page - 1)}>‹</button>
            <span className="chip solid">{page}</span>
            <span className="chip">of {data?.pages ?? 1}</span>
            <button className="chip" disabled={page >= (data?.pages ?? 1)} onClick={() => goPage(page + 1)}>›</button>
          </div>
        </section>
      </div>
    </>
  );
}
