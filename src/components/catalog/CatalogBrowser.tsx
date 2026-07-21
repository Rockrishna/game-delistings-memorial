"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useNsfw } from "@/components/layout/NsfwProvider";

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
  coverUrl: string | null;
};

type Facets = Record<string, Array<{ name: string; count: number }>>;

type ApiResult = {
  total: number;
  page: number;
  pages: number;
  rows: Card[];
  facets: Facets;
};

// Facet label → URL param. Order = display order in the rail.
const FACETS: Array<{ key: string; param: string }> = [
  { key: "Platform", param: "platform" },
  { key: "Decade", param: "decade" },
  { key: "Genre", param: "genre" },
  { key: "Publisher", param: "publisher" },
  { key: "Developer", param: "developer" },
  { key: "Mode", param: "mode" },
  { key: "Theme", param: "theme" },
  { key: "Perspective", param: "perspective" },
  { key: "Rating", param: "rating" },
];
function parseAdvanced(text: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const free: string[] = [];
  const re = /(\w+):"([^"]+)"|(\w+):(\S+)|"([^"]+)"|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const key = (m[1] || m[3])?.toLowerCase();
    const val = m[2] || m[4];
    if (key && val) (out[key] ||= []).push(val);
    else free.push(m[5] || m[6] || "");
  }
  if (free.length) out.q = [free.join(" ")];
  return out;
}

function FacetSection({
  label,
  param,
  options,
  selected,
  onToggle,
  defaultOpen,
}: {
  label: string;
  param: string;
  options: Array<{ name: string; count: number }>;
  selected: string[];
  onToggle: (param: string, value: string) => void;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [showAll, setShowAll] = useState(false);
  if (!options.length) return null;
  const activeCount = selected.length;
  const shown = showAll ? options : options.slice(0, 8);

  return (
    <div style={{ borderBottom: "1px solid var(--rule-soft)" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "none",
          border: 0,
          cursor: "pointer",
          padding: "12px 0",
          fontFamily: "var(--typewriter)",
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: activeCount ? "var(--accent)" : "var(--ink-2)",
        }}
      >
        <span>
          {label}
          {activeCount ? ` · ${activeCount}` : ""}
        </span>
        <span aria-hidden style={{ color: "var(--ink-3)" }}>{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <div style={{ paddingBottom: 12 }}>
          {shown.map((o) => {
            const checked = selected.includes(o.name);
            return (
              <label
                key={o.name}
                className="font-serif checkrow"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "4px 0",
                  fontSize: 13,
                  cursor: "pointer",
                  color: checked ? "var(--ink)" : "var(--ink-2)",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span
                    className="checkbox"
                    aria-hidden
                    style={{
                      display: "inline-block",
                      width: 11,
                      height: 11,
                      border: "1px solid var(--ink-3)",
                      background: checked ? "var(--ink)" : "transparent",
                      flexShrink: 0,
                    }}
                  />
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(param, o.name)}
                  />
                  {o.name}
                </span>
                <span className="font-typewriter muted" style={{ fontSize: 10 }}>
                  {o.count.toLocaleString()}
                </span>
              </label>
            );
          })}
          {options.length > 8 ? (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="accent font-typewriter"
              style={{ background: "none", border: 0, cursor: "pointer", fontSize: 10, padding: "6px 0 0", letterSpacing: "0.1em" }}
            >
              {showAll ? "− show fewer" : `+ all ${options.length}`}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function CatalogBrowser({
  initial = null,
  initialQuery = null,
}: {
  initial?: ApiResult | null;
  initialQuery?: string | null;
}) {
  const sp = useSearchParams();
  const { showNsfw } = useNsfw();
  // View toggle uses its own `view` param so it never collides with the
  // "Mode" (game-mode) facet, which lives on `mode`.
  const mode = sp.get("view") === "advanced" ? "advanced" : "simple";

  const [data, setData] = useState<ApiResult | null>(initial);
  const [loading, setLoading] = useState(initial == null);
  const [queryText, setQueryText] = useState("");
  // Advanced view opens the filter rail by default; simple view starts closed.
  const [railOpen, setRailOpen] = useState(mode === "advanced");
  // Server already rendered the data for this exact query string; skip the
  // first client fetch so the page paints straight from the DB cache.
  const hydratedFor = useRef<string | null>(initial ? initialQuery : null);

  const filters = useMemo(() => {
    const f: Record<string, string[]> = {};
    for (const { param } of FACETS) {
      const vals = sp.getAll(param).flatMap((v) => v.split(",")).filter(Boolean);
      if (vals.length) f[param] = vals;
    }
    const q = sp.get("q");
    if (q) f.q = [q];
    return f;
  }, [sp]);

  const page = Number(sp.get("page") || "1") || 1;
  const sort = sp.get("sort") || "title";
  const hasCover = sp.get("hasCover") === "1";
  const matchMode = sp.get("match") === "any" ? "any" : "all";

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    for (const [k, vals] of Object.entries(filters)) for (const v of vals) p.append(k, v);
    if (hasCover) p.set("hasCover", "1");
    if (showNsfw) p.set("nsfw", "1");
    p.set("page", String(page));
    p.set("sort", sort);
    if (matchMode === "any") p.set("match", "any");
    p.set("pageSize", "24");
    return p.toString();
  }, [filters, page, sort, hasCover, matchMode, showNsfw]);

  useEffect(() => {
    // First render already has server data for this query string.
    if (hydratedFor.current === queryString) {
      hydratedFor.current = "__used__";
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      try {
        const r = await fetch(`/api/catalog?${queryString}`, { signal: controller.signal });
        const d = (await r.json()) as ApiResult;
        if (!cancelled) setData(d);
      } catch (err) {
        if ((err as Error).name !== "AbortError") throw err;
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [queryString]);

  // Shallow URL update: filter/sort/page changes only need a client fetch of
  // /api/catalog, not a full server re-render of the page (which re-reads the
  // whole table). Next syncs useSearchParams with history.pushState.
  const pushParams = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const p = new URLSearchParams(sp.toString());
      mutate(p);
      window.history.pushState(null, "", `/catalog?${p.toString()}`);
    },
    [sp]
  );

  function setMode(next: "simple" | "advanced") {
    if (next === "advanced") setRailOpen(true);
    pushParams((p) => {
      if (next === "advanced") p.set("view", "advanced");
      else p.delete("view");
    });
  }

  function toggleFacet(param: string, value: string) {
    pushParams((p) => {
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
      for (const { param } of FACETS) p.delete(param);
      p.delete("q");
      p.delete("hasCover");
      p.set("page", "1");
    });
  }

  function runAdvanced() {
    const parsed = parseAdvanced(queryText);
    pushParams((p) => {
      for (const { param } of FACETS) p.delete(param);
      p.delete("q");
      for (const [k, vals] of Object.entries(parsed)) for (const v of vals) p.append(k, v);
      p.set("page", "1");
      p.set("view", "advanced");
    });
  }

  function goPage(n: number) {
    pushParams((p) => p.set("page", String(n)));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  function setMatch(next: "all" | "any") {
    pushParams((p) => {
      if (next === "any") p.set("match", "any");
      else p.delete("match");
      p.set("page", "1");
    });
  }

  const facets = data?.facets ?? {};
  const activeChips = Object.entries(filters).flatMap(([k, vals]) =>
    vals.map((v) => ({ k, v }))
  );
  const activeFilterCount = activeChips.length + (hasCover ? 1 : 0);

  const rail = (
    <aside
      className="catalog-rail"
      aria-label="Catalog filters"
      style={{ borderRight: "1.5px solid var(--ink)", padding: "16px 20px 24px" }}
    >
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}
      >
        <div className="strap accent">FILTERS · {activeFilterCount}</div>
        <div style={{ display: "flex", gap: 6 }}>
          {activeFilterCount ? (
            <button className="chip" onClick={clearAll}>clear all</button>
          ) : null}
          <button className="chip rail-close" onClick={() => setRailOpen(false)}>✕ close</button>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div className="strap" style={{ marginBottom: 6 }}>COMBINE FILTERS</div>
        <div style={{ display: "flex", border: "1px solid var(--ink)" }}>
          {([
            ["all", "MATCH ALL", "AND"],
            ["any", "MATCH ANY", "OR"],
          ] as const).map(([val, label, tag], idx) => (
            <button
              key={val}
              onClick={() => setMatch(val)}
              aria-pressed={matchMode === val}
              title={val === "all" ? "Show records matching every selected filter" : "Show records matching any selected filter"}
              style={{
                flex: 1,
                border: 0,
                padding: "7px 8px",
                cursor: "pointer",
                fontFamily: "var(--typewriter)",
                fontSize: 11,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                background: matchMode === val ? "var(--ink)" : "transparent",
                color: matchMode === val ? "var(--paper)" : "var(--ink-2)",
                borderRight: idx === 0 ? "1px solid var(--ink)" : "none",
              }}
            >
              {label} <span style={{ opacity: 0.6 }}>· {tag}</span>
            </button>
          ))}
        </div>
      </div>

      {activeChips.length ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {activeChips.map(({ k, v }) => (
            <button
              key={`${k}:${v}`}
              className="chip accent"
              aria-label={`Remove filter ${v}`}
              onClick={() =>
                pushParams((p) => {
                  const cur = p.getAll(k).flatMap((x) => x.split(",")).filter(Boolean);
                  p.delete(k);
                  for (const x of cur.filter((c) => c !== v)) p.append(k, x);
                  p.set("page", "1");
                })
              }
            >
              {v} ✕
            </button>
          ))}
        </div>
      ) : null}

      <label
        className="font-serif checkrow"
        style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 0 12px", fontSize: 13, cursor: "pointer", borderBottom: "1px solid var(--rule-soft)" }}
      >
        <span
          className="checkbox"
          aria-hidden
          style={{ display: "inline-block", width: 11, height: 11, border: "1px solid var(--ink-3)", background: hasCover ? "var(--ink)" : "transparent" }}
        />
        <input
          type="checkbox"
          checked={hasCover}
          onChange={() =>
            pushParams((p) => {
              if (hasCover) p.delete("hasCover");
              else p.set("hasCover", "1");
              p.set("page", "1");
            })
          }
        />
        Has cover art only
      </label>

      {FACETS.map(({ key, param }) => (
        <FacetSection
          key={key}
          label={key}
          param={param}
          options={facets[key] ?? []}
          selected={filters[param] ?? []}
          onToggle={toggleFacet}
          defaultOpen={false}
        />
      ))}
    </aside>
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
          <p className="font-serif muted" style={{ margin: "2px 0 0", fontSize: 13, maxWidth: 540 }}>
            {mode === "simple"
              ? "Filter from the rail (sections collapse — open what you need) or switch to advanced for query syntax."
              : "Compose any cross-section: platform:Steam decade:2010s rating:\"≥ 90\"."}
          </p>
        </div>
        <div style={{ display: "flex", border: "1px solid var(--ink)" }}>
          {(["simple", "advanced"] as const).map((m, idx) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
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
              aria-label="Advanced query"
              placeholder='where platform:Steam decade:2010s rating:"≥ 90" theme:Horror'
              style={{ flex: 1, background: "none", border: 0, outline: "none", fontFamily: "var(--mono)", fontSize: 14, color: "var(--ink)" }}
            />
            <button className="chip" onClick={runAdvanced}>⌘↵ run</button>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
            <span className="font-serif muted">Try:</span>
            {['publisher:Konami', 'platform:Steam decade:2010s', 'rating:"≥ 90"', 'mode:"Single player"', 'theme:Horror'].map((ex) => (
              <button key={ex} className="chip" onClick={() => setQueryText(ex)}>{ex}</button>
            ))}
          </div>
        </div>
      ) : null}

      <div
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 28px", borderTop: "1px solid var(--rule)", borderBottom: "1px solid var(--rule)", background: "var(--paper-2)", flexWrap: "wrap" }}
      >
        <button
          className="chip"
          onClick={() => setRailOpen((v) => !v)}
          aria-expanded={railOpen}
        >
          {railOpen ? "▾ hide filters" : "▸ filters"}
          {activeFilterCount ? ` · ${activeFilterCount}` : ""}
        </button>
        <span className="font-serif" aria-live="polite" style={{ flex: 1, minWidth: 120 }}>
          <strong>{(data?.total ?? 0).toLocaleString()}</strong> records
          {loading ? <span className="muted"> · loading…</span> : null}
        </span>
        <select
          value={sort}
          onChange={(e) => pushParams((p) => p.set("sort", e.target.value))}
          className="chip"
          aria-label="Sort records"
          style={{ appearance: "none" }}
        >
          <option value="title">sort : title</option>
          <option value="rating">sort : rating ▾</option>
          <option value="year">sort : newest</option>
          <option value="year-asc">sort : oldest</option>
        </select>
        <a className="chip" href={`/api/catalog?${queryString}&pageSize=120`} download="catalogue.json">⤓ JSON</a>
      </div>

      <div
        className="stack-mobile"
        style={{ display: "grid", gridTemplateColumns: railOpen ? "280px 1fr" : "1fr" }}
      >
        {railOpen ? (
          <>
            <div className="rail-backdrop" aria-hidden onClick={() => setRailOpen(false)} />
            {rail}
          </>
        ) : null}

        <section
          className={`results${loading ? " is-loading" : ""}`}
          aria-busy={loading}
          style={{ padding: "20px 24px" }}
        >
          {!loading && data && data.total === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <p className="font-serif" style={{ fontSize: 16, color: "var(--ink-2)", margin: 0 }}>
                No cards match this combination of filters.
              </p>
              {activeFilterCount ? (
                <button className="chip accent" style={{ marginTop: 14 }} onClick={clearAll}>
                  clear all filters
                </button>
              ) : null}
            </div>
          ) : null}
          {mode === "simple" ? (
            <div className="cardgrid tight">
              {(data?.rows ?? []).map((g) => (
                <Link key={g.slug} href={`/record/${g.slug}`} className="indexcard" style={{ padding: 10 }}>
                  <div className="deweycall" style={{ fontSize: 9, marginBottom: 6, paddingBottom: 4 }}>{g.callNumber}</div>
                  <div className={`cover ${g.coverUrl ? "has-img" : ""}`} style={{ aspectRatio: "3/4" }}>
                    {g.coverUrl ? (
                      <img src={g.coverUrl} alt={`${g.title} cover`} width={264} height={374} loading="lazy" decoding="async" />
                    ) : (
                      <div className="label" style={{ fontSize: 8 }}>{(g.platforms[0] ?? "—").slice(0, 6).toUpperCase()}</div>
                    )}
                  </div>
                  <div className="font-serif" style={{ fontWeight: 600, fontSize: 13, marginTop: 8, lineHeight: 1.2 }}>{g.title}</div>
                  <div className="font-serif muted" style={{ fontSize: 11, marginTop: 2 }}>
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
            <div className="scroll-x">
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
                        <div className="font-serif muted" style={{ fontSize: 11 }}>
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
            </div>
          )}

          <nav aria-label="Pagination" style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 24, flexWrap: "wrap" }}>
            <button className="chip" disabled={page <= 1} onClick={() => goPage(page - 1)} aria-label="Previous page">‹ prev</button>
            <span className="chip solid" aria-current="page">{page}</span>
            <span className="chip">of {data?.pages ?? 1}</span>
            <button className="chip" disabled={page >= (data?.pages ?? 1)} onClick={() => goPage(page + 1)} aria-label="Next page">next ›</button>
          </nav>
        </section>
      </div>
    </>
  );
}
