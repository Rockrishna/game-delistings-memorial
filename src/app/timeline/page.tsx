"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SearchBar from "@/components/common/SearchBar";
import Badge from "@/components/common/Badge";

type TimelineGame = {
  id: string;
  slug: string;
  title: string;
  platforms: string[];
  platformBadges: Array<"steam" | "playstation" | "xbox" | "nintendo" | "epic" | "default">;
  status: "recent" | "upcoming" | "delisted";
  delistDate: string;
  reason: string | null;
  releaseYear: number | null;
  daysFromNow: number;
  coverUrl?: string;
};

type TimelinePeriod = {
  id: string;
  month: string;
  year: number;
  games: TimelineGame[];
};

const PLATFORMS = [
  { label: "All platforms", value: "" },
  { label: "Steam", value: "steam" },
  { label: "PlayStation", value: "playstation" },
  { label: "Xbox", value: "xbox" },
  { label: "Nintendo", value: "nintendo" },
  { label: "Epic", value: "epic" },
];

const SORT_OPTIONS = [
  { label: "Newest first", value: "newest" },
  { label: "Oldest first", value: "oldest" },
  { label: "Alphabetical", value: "alphabetical" },
];

function formatDateLong(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function withdrawalLabel(daysFromNow: number) {
  if (daysFromNow > 0) return `T−${daysFromNow} days`;
  if (daysFromNow === 0) return "Today";
  return `${Math.abs(daysFromNow)} days ago`;
}

export default function TimelinePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [statusFilters, setStatusFilters] = useState<Array<"recent" | "upcoming" | "delisted">>([
    "recent",
    "upcoming",
    "delisted",
  ]);
  const [visibleGroups, setVisibleGroups] = useState(4);
  const [timeline, setTimeline] = useState<TimelinePeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    if (selectedPlatform) params.set("platform", selectedPlatform);
    params.set("sort", sortBy);
    return params.toString();
  }, [searchQuery, selectedPlatform, sortBy]);

  useEffect(() => {
    setVisibleGroups(4);
  }, [query]);

  useEffect(() => {
    async function run() {
      try {
        setLoading(true);
        const response = await fetch(`/api/timeline?${query}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load timeline.");
        const payload = (await response.json()) as TimelinePeriod[];
        setTimeline(payload);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    run();
  }, [query]);

  const filteredTimeline = useMemo(() => {
    const allowed = new Set(statusFilters);
    return timeline
      .map((period) => ({
        ...period,
        games: period.games.filter((game) => allowed.has(game.status)),
      }))
      .filter((period) => period.games.length > 0);
  }, [timeline, statusFilters]);

  const shownTimeline = filteredTimeline.slice(0, visibleGroups);
  const hasMore = filteredTimeline.length > shownTimeline.length;
  const totalDispatches = filteredTimeline.reduce((sum, period) => sum + period.games.length, 0);

  function toggleStatus(status: "recent" | "upcoming" | "delisted") {
    setStatusFilters((current) => {
      if (current.includes(status)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== status);
      }
      return [...current, status];
    });
  }

  return (
    <main className="mx-auto max-w-[1280px] bg-[color:var(--paper)] pb-16">
      <section className="border-x border-b border-[color:var(--ink)]">
        <header className="border-b-[3px] border-double border-[color:var(--ink)] px-6 py-6 text-center">
          <p className="font-typewriter text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-3)]">
            Section B · Daily Docket
          </p>
          <h1 className="mt-2 font-display text-4xl font-black sm:text-5xl">
            This Week&rsquo;s Withdrawals
          </h1>
          <p className="mx-auto mt-2 max-w-2xl font-serif text-base italic text-[color:var(--ink-2)]">
            Dispatches in chronological order — every recently withdrawn title and every announced
            removal.
          </p>
        </header>

        {/* Filter strip */}
        <div className="border-b border-[color:var(--rule)] bg-[color:var(--paper-2)] px-6 py-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
            <SearchBar
              placeholder="Search games or causes…"
              onSearch={setSearchQuery}
              initialValue={searchQuery}
            />
            <label className="flex flex-col gap-1">
              <span className="font-typewriter text-[9px] uppercase tracking-[0.18em] text-[color:var(--ink-3)]">
                Platform
              </span>
              <select
                value={selectedPlatform}
                onChange={(event) => setSelectedPlatform(event.target.value)}
                className="border border-[color:var(--ink)] bg-[color:var(--paper)] px-3 py-[10px] font-serif text-sm text-[color:var(--ink)] focus:outline-none"
              >
                {PLATFORMS.map((platform) => (
                  <option key={platform.value || "all"} value={platform.value}>
                    {platform.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-typewriter text-[9px] uppercase tracking-[0.18em] text-[color:var(--ink-3)]">
                Sort
              </span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="border border-[color:var(--ink)] bg-[color:var(--paper)] px-3 py-[10px] font-serif text-sm text-[color:var(--ink)] focus:outline-none"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-1">
              <span className="font-typewriter text-[9px] uppercase tracking-[0.18em] text-[color:var(--ink-3)]">
                Status
              </span>
              <div className="flex flex-wrap gap-2">
                {(["recent", "upcoming", "delisted"] as const).map((status) => {
                  const active = statusFilters.includes(status);
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => toggleStatus(status)}
                      className={`border px-3 py-[6px] font-typewriter text-[10px] uppercase tracking-[0.16em] transition-colors ${
                        active
                          ? "border-[color:var(--ink)] bg-[color:var(--ink)] text-[color:var(--paper)]"
                          : "border-[color:var(--rule-soft)] text-[color:var(--ink-2)] hover:border-[color:var(--ink)]"
                      }`}
                    >
                      {status}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <p className="mt-3 font-serif text-xs italic text-[color:var(--ink-3)]">
            Showing {totalDispatches} dispatches across {filteredTimeline.length} dated period
            {filteredTimeline.length === 1 ? "" : "s"}.
          </p>
        </div>

        <div className="px-6 py-8">
          {loading ? (
            <p className="text-center font-serif italic text-[color:var(--ink-2)]">
              Setting today&rsquo;s dispatches…
            </p>
          ) : error ? (
            <p className="text-center font-serif italic text-[color:var(--accent)]">
              The wire is down. {error}
            </p>
          ) : shownTimeline.length === 0 ? (
            <p className="border border-dashed border-[color:var(--rule-soft)] bg-[color:var(--paper-2)] p-10 text-center font-serif italic text-[color:var(--ink-3)]">
              No dispatches match these filters. Try widening the platform or status.
            </p>
          ) : (
            <div className="space-y-12">
              {shownTimeline.map((period) => {
                const headDate = period.games[0]?.delistDate;
                return (
                  <article key={period.id}>
                    <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b-[3px] border-double border-[color:var(--ink)] pb-2">
                      <h2 className="font-display text-2xl font-bold sm:text-3xl">
                        {period.month} {period.year}
                      </h2>
                      {headDate ? (
                        <p className="font-serif text-sm italic text-[color:var(--ink-3)]">
                          · earliest dispatch {formatDateLong(headDate).split(",").slice(1).join(",").trim()}
                        </p>
                      ) : null}
                    </header>

                    <div className="mt-5 grid gap-x-8 gap-y-6 md:grid-cols-2">
                      {period.games.map((game, index) => (
                        <div
                          key={`${period.id}-${game.id}-${game.delistDate}`}
                          className={
                            index % 2 === 0
                              ? "md:border-r md:border-[color:var(--rule)] md:pr-8"
                              : ""
                          }
                        >
                          <div className="grid grid-cols-[110px_1fr] gap-4">
                            <div className="broadsheet-cover-frame aspect-[3/4]">
                              {game.coverUrl ? (
                                <img src={game.coverUrl} alt={game.title} loading="lazy" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center font-typewriter text-[9px] uppercase tracking-[0.16em] text-[color:var(--ink-3)]">
                                  Cover
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-typewriter text-[9px] uppercase tracking-[0.18em] text-[color:var(--accent)]">
                                Withdrawal · {withdrawalLabel(game.daysFromNow)}
                              </p>
                              <Link
                                href={`/games/${game.slug ?? game.id}`}
                                className="mt-1 block font-display text-xl font-bold leading-tight text-[color:var(--ink)] hover:text-[color:var(--accent)] sm:text-2xl"
                              >
                                {game.title}
                              </Link>
                              <p className="mt-1 font-serif text-sm italic text-[color:var(--ink-2)]">
                                {game.releaseYear ? `Released ${game.releaseYear} · ` : ""}
                                {game.platforms.join(", ")}
                              </p>
                              {game.reason ? (
                                <p className="mt-2 font-serif text-sm text-[color:var(--ink-2)]">{game.reason}</p>
                              ) : null}
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <Badge label={game.status} variant={game.status} />
                                <span className="font-typewriter text-[9px] uppercase tracking-[0.16em] text-[color:var(--ink-3)]">
                                  {new Date(game.delistDate).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>
                              <Link
                                href={`/games/${game.slug ?? game.id}`}
                                className="mt-3 inline-block font-typewriter text-[10px] uppercase tracking-[0.18em] text-[color:var(--accent)] underline-offset-2 hover:underline"
                              >
                                Read full entry →
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}

              {hasMore ? (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setVisibleGroups((current) => current + 4)}
                    className="border border-[color:var(--ink)] bg-[color:var(--paper)] px-5 py-2 font-typewriter text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink)] transition-colors hover:bg-[color:var(--ink)] hover:text-[color:var(--paper)]"
                  >
                    Load more periods
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
