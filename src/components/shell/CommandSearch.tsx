"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type Hit = { slug: string; title: string; callNumber: string; year: number | null; publisher: string | null };

type IgdbResult = { outcome: string; message: string };

export default function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [igdb, setIgdb] = useState<IgdbResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQ("");
    setHits([]);
    setIgdb(null);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  const run = useCallback(async (term: string) => {
    if (term.trim().length < 2) {
      setHits([]);
      return;
    }
    setLoading(true);
    setIgdb(null);
    try {
      const res = await fetch(`/api/catalog?q=${encodeURIComponent(term)}&pageSize=8`);
      const data = await res.json();
      setHits(data.rows ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => run(q), 220);
    return () => clearTimeout(t);
  }, [q, run]);

  async function askIgdb() {
    setLoading(true);
    try {
      const res = await fetch("/api/search/igdb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      setIgdb((await res.json()) as IgdbResult);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button className="chip" onClick={() => setOpen(true)} aria-label="Search">
        ⌕ search · ⌘K
      </button>
      {open ? (
        <div
          onClick={close}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 50,
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            paddingTop: "12vh",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(640px, 92vw)",
              background: "var(--paper)",
              border: "1.5px solid var(--ink)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid var(--rule)" }}>
              <span className="accent" style={{ fontSize: 16 }}>⌕</span>
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search titles, publishers, developers…"
                style={{
                  flex: 1,
                  background: "none",
                  border: 0,
                  outline: "none",
                  fontFamily: "var(--serif)",
                  fontSize: 16,
                  color: "var(--ink)",
                }}
              />
              <span className="strap">esc</span>
            </div>
            <div style={{ maxHeight: "52vh", overflowY: "auto" }}>
              {hits.map((h) => (
                <Link
                  key={h.slug}
                  href={`/record/${h.slug}`}
                  onClick={close}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "10px 16px",
                    borderBottom: "1px dashed var(--rule-soft)",
                  }}
                >
                  <span className="font-serif" style={{ fontWeight: 600 }}>
                    {h.title}
                    <span className="muted" style={{ fontStyle: "italic", fontWeight: 400 }}>
                      {" "}
                      · {h.year ?? "—"} · {h.publisher ?? "Unknown"}
                    </span>
                  </span>
                  <span className="accent font-typewriter" style={{ fontSize: 10 }}>
                    {h.callNumber}
                  </span>
                </Link>
              ))}
              {!loading && q.trim().length >= 2 && hits.length === 0 ? (
                <div style={{ padding: "16px" }}>
                  <p className="font-serif muted" style={{ fontStyle: "italic", margin: 0 }}>
                    No catalogue match for &ldquo;{q}&rdquo;.
                  </p>
                  {igdb ? (
                    <p className="font-serif" style={{ marginTop: 8 }}>{igdb.message}</p>
                  ) : (
                    <button className="chip accent" style={{ marginTop: 10 }} onClick={askIgdb}>
                      ask IGDB if it&apos;s delisted
                    </button>
                  )}
                </div>
              ) : null}
              {loading ? <div className="strap" style={{ padding: 16 }}>searching…</div> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
