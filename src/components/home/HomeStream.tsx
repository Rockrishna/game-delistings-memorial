"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useNsfw } from "@/components/layout/NsfwProvider";

type Card = {
  slug: string;
  callNumber: string;
  title: string;
  year: number | null;
  platforms: string[];
  publisher: string | null;
  genres: string[];
  coverUrl: string | null;
};

const PAGE_SIZE = 24;

export default function HomeStream() {
  const { showNsfw } = useNsfw();
  // Remount the stream when the NSFW preference flips so all infinite-scroll
  // state resets cleanly (no manual setState juggling in an effect).
  return <HomeStreamInner key={showNsfw ? "nsfw" : "sfw"} showNsfw={showNsfw} />;
}

function HomeStreamInner({ showNsfw }: { showNsfw: boolean }) {
  const [rows, setRows] = useState<Card[]>([]);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const pageRef = useRef(1);
  const busyRef = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    await Promise.resolve();
    setLoading(true);
    try {
      const next = pageRef.current;
      const res = await fetch(
        `/api/catalog?sort=year&pageSize=${PAGE_SIZE}&page=${next}${showNsfw ? "&nsfw=1" : ""}`
      );
      const data = await res.json();
      setRows((prev) => {
        const seen = new Set(prev.map((r) => r.slug));
        const fresh = (data.rows ?? []).filter((r: Card) => !seen.has(r.slug));
        return [...prev, ...fresh];
      });
      setPages(data.pages ?? 1);
      pageRef.current = next + 1;
      if (next >= (data.pages ?? 1)) setDone(true);
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  }, [showNsfw]);

  useEffect(() => {
    void loadMore();
  }, [loadMore]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || done) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) void loadMore();
      },
      { rootMargin: "600px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, done, pages]);

  return (
    <>
      <div className="cardgrid tight">
        {rows.map((g) => (
          <Link key={g.slug} href={`/record/${g.slug}`} className="indexcard" style={{ padding: 10 }}>
            <div className="deweycall" style={{ fontSize: 9, marginBottom: 6, paddingBottom: 4 }}>
              {g.callNumber}
            </div>
            <div className={`cover ${g.coverUrl ? "has-img" : ""}`} style={{ aspectRatio: "3/4" }}>
              {g.coverUrl ? (
                <img src={g.coverUrl} alt={`${g.title} cover`} width={264} height={374} loading="lazy" decoding="async" />
              ) : (
                <div className="label" style={{ fontSize: 8 }}>
                  {(g.platforms[0] ?? "—").slice(0, 6).toUpperCase()}
                </div>
              )}
            </div>
            <div className="font-serif" style={{ fontWeight: 600, fontSize: 13, marginTop: 8, lineHeight: 1.2 }}>
              {g.title}
            </div>
            <div className="font-serif muted" style={{ fontStyle: "italic", fontSize: 11, marginTop: 2 }}>
              {g.year ?? "—"} · {g.publisher ?? "Unknown"}
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
              {g.genres.slice(0, 2).map((x) => (
                <span key={x} className="font-typewriter muted" style={{ fontSize: 8, letterSpacing: "0.08em" }}>
                  {x.toUpperCase()}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
      <div ref={sentinel} style={{ height: 1 }} />
      <div className="strap" role="status" style={{ textAlign: "center", padding: "22px 0 0" }}>
        {loading
          ? "drawing more cards…"
          : done && rows.length > 0
          ? "— end of the catalogue —"
          : "scroll for more"}
      </div>
    </>
  );
}
