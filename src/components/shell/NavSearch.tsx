"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type Hit = {
  slug: string;
  title: string;
  callNumber: string;
  year: number | null;
  publisher: string | null;
};

type IgdbResult = { outcome: string; message: string };

export default function NavSearch() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [igdb, setIgdb] = useState<IgdbResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, []);

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
    <div className="navsearch" ref={boxRef}>
      <span className="navsearch-glyph">⌕</span>
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search titles, publishers, developers…"
        aria-label="Search the catalogue"
      />
      {q ? (
        <button className="navsearch-clear" onClick={() => { setQ(""); setHits([]); }} aria-label="Clear">
          ✕
        </button>
      ) : null}

      {open && q.trim().length >= 2 ? (
        <div className="navsearch-pop">
          {hits.map((h) => (
            <Link
              key={h.slug}
              href={`/record/${h.slug}`}
              className="navsearch-row"
              onClick={() => setOpen(false)}
            >
              <span className="font-serif" style={{ fontWeight: 600 }}>
                {h.title}{" "}
                <span className="muted" style={{ fontWeight: 400, fontStyle: "italic" }}>
                  · {h.year ?? "—"} · {h.publisher ?? "Unknown"}
                </span>
              </span>
              <span className="accent font-typewriter" style={{ fontSize: 10 }}>
                {h.callNumber}
              </span>
            </Link>
          ))}
          {!loading && hits.length === 0 ? (
            <div style={{ padding: "12px 14px" }}>
              <p className="font-serif muted" style={{ fontStyle: "italic", margin: 0 }}>
                No catalogue match for &ldquo;{q}&rdquo;.
              </p>
              {igdb ? (
                <p className="font-serif" style={{ marginTop: 8, fontSize: 13 }}>{igdb.message}</p>
              ) : (
                <button className="chip accent" style={{ marginTop: 10 }} onClick={askIgdb}>
                  ask IGDB if it&apos;s delisted
                </button>
              )}
            </div>
          ) : null}
          {loading ? <div className="strap" style={{ padding: 12 }}>searching…</div> : null}
        </div>
      ) : null}
    </div>
  );
}
