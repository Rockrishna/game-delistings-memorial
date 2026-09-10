"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useNsfw } from "@/components/layout/NsfwProvider";
import { useEndless } from "@/components/layout/EndlessProvider";

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
// Endless scrolling loads at most this many pages before it pauses on a
// "Load more" button. Without a pause the stream always outruns the reader —
// the page never has a bottom edge, so the site footer can never be reached.
const BURST_PAGES = 6;

export default function HomeStream() {
  const { showNsfw } = useNsfw();
  const { endless } = useEndless();
  // Remount the stream when the NSFW preference flips so all infinite-scroll
  // state resets cleanly (no manual setState juggling in an effect). The
  // endless-scroll preference is passed through instead: flipping it changes
  // how the next batch arrives, it shouldn't throw away what's on screen.
  return (
    <HomeStreamInner key={showNsfw ? "nsfw" : "sfw"} showNsfw={showNsfw} endless={endless} />
  );
}

function HomeStreamInner({ showNsfw, endless }: { showNsfw: boolean; endless: boolean }) {
  const [rows, setRows] = useState<Card[]>([]);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  // Auto-loads left in the current burst; a manual "Load more" refills it.
  const [autoLeft, setAutoLeft] = useState(BURST_PAGES);

  const pageRef = useRef(1);
  const busyRef = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(
    async (auto: boolean) => {
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
        setTotal(typeof data.total === "number" ? data.total : null);
        pageRef.current = next + 1;
        if (next >= (data.pages ?? 1)) setDone(true);
        setAutoLeft((left) => (auto ? Math.max(0, left - 1) : BURST_PAGES));
      } finally {
        busyRef.current = false;
        setLoading(false);
      }
    },
    [showNsfw]
  );

  useEffect(() => {
    void loadMore(false);
    // The first page is always fetched outright; it isn't part of a burst.
  }, [loadMore]);

  useEffect(() => {
    const el = sentinel.current;
    // No observer while the stream is paused — either because endless
    // scrolling is switched off, or because this burst is spent.
    if (!el || done || !endless || autoLeft <= 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) void loadMore(true);
      },
      { rootMargin: "600px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, done, endless, autoLeft, pages]);

  const shown = rows.length;

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
            <div className="font-serif muted" style={{ fontSize: 11, marginTop: 2 }}>
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

      <div className="stream-end">
        {loading ? (
          <div className="strap" role="status">
            loading more…
          </div>
        ) : done ? (
          <div className="strap" role="status">
            {rows.length > 0
              ? `end of the catalogue · ${shown.toLocaleString()} records shown`
              : "no records to show"}
          </div>
        ) : (
          <>
            <button className="chip solid" onClick={() => void loadMore(false)}>
              Load more records
            </button>
            <div className="strap" role="status">
              showing {shown.toLocaleString()}
              {total != null ? ` of ${total.toLocaleString()}` : ""} records
            </div>
            <p className="font-serif muted stream-end-note">
              {endless
                ? "Endless scrolling pauses here so the page has a bottom. Load more to carry on, or switch it off in the menu."
                : "Endless scrolling is off — records load one batch at a time. Turn it back on in the menu."}{" "}
              <Link href="/catalog" className="accent">
                Open the catalogue
              </Link>{" "}
              to filter instead.
            </p>
          </>
        )}
      </div>
    </>
  );
}
