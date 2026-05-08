"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SearchBar from "@/components/common/SearchBar";
import Badge from "@/components/common/Badge";
import Card from "@/components/common/Card";
import type { StatusType } from "@/components/common/Badge";

type TimelinePeriod = {
  id: string;
  month: string;
  year: number;
  games: Array<{
    id: string;
    slug: string;
    title: string;
    platforms: string[];
    platformBadges: Array<"steam" | "playstation" | "xbox" | "nintendo" | "epic" | "default">;
    status: "recent" | "upcoming" | "delisted";
    delistDate: string;
    coverUrl?: string;
  }>;
};

const PLATFORMS = [
  { label: "All", value: "" },
  { label: "Steam", value: "steam" },
  { label: "PlayStation", value: "playstation" },
  { label: "Xbox", value: "xbox" },
  { label: "Nintendo", value: "nintendo" },
  { label: "Epic", value: "epic" },
];

const SORT_OPTIONS = [
  { label: "Date (Newest)", value: "newest" },
  { label: "Date (Oldest)", value: "oldest" },
  { label: "Alphabetical", value: "alphabetical" },
];

export default function TimelinePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [statusFilters, setStatusFilters] = useState<StatusType[]>([
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
        if (!response.ok) {
          throw new Error("Failed to load timeline.");
        }
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

  const shownTimeline = useMemo(
    () => filteredTimeline.slice(0, visibleGroups),
    [filteredTimeline, visibleGroups]
  );

  const totalShownGames = useMemo(
    () => shownTimeline.reduce((sum, period) => sum + period.games.length, 0),
    [shownTimeline]
  );

  const hasMore = filteredTimeline.length > shownTimeline.length;

  function toggleStatus(status: StatusType) {
    setStatusFilters((current) => {
      if (current.includes(status)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== status);
      }
      return [...current, status];
    });
  }

  return (
    <main className="min-h-screen bg-[#15121b] pb-12">
      <section className="mx-auto max-w-[1280px] px-6 py-10">
        <header className="mb-8 border-l-4 border-[#d0bcff] pl-5">
          <h1 className="text-4xl font-bold text-[#e7e0ed]">Chronological Feed</h1>
          <p className="mt-2 max-w-3xl text-[#cbc3d7]">
            Track delisting events by month, platform, and status. Data updates from your
            curated archive and IGDB-enriched records.
          </p>
        </header>

        <section className="mb-8 space-y-4 border-b border-[#494454] pb-8">
          <SearchBar
            placeholder="Search games or metadata..."
            onSearch={setSearchQuery}
            className="max-w-2xl"
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#958ea0]">
                Platform
              </span>
              <select
                value={selectedPlatform}
                onChange={(event) => setSelectedPlatform(event.target.value)}
                className="w-full border border-[#494454] bg-[#2c2832] px-3 py-2 font-mono text-sm text-[#e7e0ed] focus:border-[#d0bcff] focus:outline-none"
              >
                {PLATFORMS.map((platform) => (
                  <option key={platform.value || "all"} value={platform.value}>
                    {platform.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#958ea0]">
                Sort
              </span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="w-full border border-[#494454] bg-[#2c2832] px-3 py-2 font-mono text-sm text-[#e7e0ed] focus:border-[#d0bcff] focus:outline-none"
              >
                {SORT_OPTIONS.map((sortOption) => (
                  <option key={sortOption.value} value={sortOption.value}>
                    {sortOption.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#958ea0]">
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
                      className={`border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] transition-colors ${
                        active
                          ? "border-[#d0bcff] bg-[#d0bcff]/10 text-[#d0bcff]"
                          : "border-[#494454] text-[#cbc3d7] hover:border-[#d0bcff] hover:text-[#d0bcff]"
                      }`}
                    >
                      {status}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[2fr_320px]">
          <section>
            {loading ? (
              <div className="text-[#cbc3d7]">Loading timeline...</div>
            ) : error ? (
              <div className="text-red-300">Could not load timeline. {error}</div>
            ) : shownTimeline.length > 0 ? (
              <div className="relative ml-4 border-l border-[#494454] pl-8 sm:ml-6 sm:pl-10">
                <div className="space-y-10">
                  {shownTimeline.map((period) => (
                    <article key={period.id} className="relative">
                      <div className="absolute -left-[50px] top-1 hidden h-7 w-7 items-center justify-center rounded-full border border-[#494454] bg-[#211e27] sm:flex">
                        <span className="h-2 w-2 rounded-full bg-[#d0bcff]" />
                      </div>
                      <div className="mb-4">
                        <p className="font-mono text-xs uppercase tracking-[0.1em] text-[#958ea0]">
                          Period
                        </p>
                        <h2 className="text-2xl font-semibold text-[#e7e0ed]">
                          {period.month} {period.year}
                        </h2>
                      </div>

                      <div className="space-y-3">
                        {period.games.map((game) => (
                          <Card key={`${period.id}-${game.id}-${game.delistDate}`} className="p-4">
                            <div className="flex flex-col gap-4 md:flex-row md:items-center">
                              <div className="h-24 w-full shrink-0 overflow-hidden border border-[#494454] bg-[#2c2832] md:w-40">
                                {game.coverUrl ? (
                                  <img
                                    src={game.coverUrl}
                                    alt={game.title}
                                    className="h-full w-full object-cover grayscale transition-all duration-300 hover:grayscale-0"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-xs text-[#958ea0]">
                                    No Artwork
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <h3 className="text-lg font-semibold text-[#e7e0ed]">{game.title}</h3>
                                  <Badge label={game.status} variant={game.status} />
                                </div>
                                <p className="mt-1 font-mono text-xs uppercase tracking-[0.08em] text-[#958ea0]">
                                  {new Date(game.delistDate).toLocaleString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                  {game.platforms.map((platform, index) => (
                                    <Badge
                                      key={`${period.id}-${game.id}-${platform}-${index}`}
                                      label={platform}
                                      variant={game.platformBadges[index] ?? "default"}
                                    />
                                  ))}
                                </div>
                              </div>

                              <Link
                                href={`/games/${game.slug ?? game.id}`}
                                className="self-start border border-[#494454] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#cbc3d7] transition-colors hover:border-[#d0bcff] hover:text-[#d0bcff]"
                              >
                                View Details
                              </Link>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>

                {hasMore ? (
                  <div className="mt-8">
                    <button
                      type="button"
                      onClick={() => setVisibleGroups((current) => current + 4)}
                      className="border border-[#494454] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#cbc3d7] transition-colors hover:border-[#d0bcff] hover:text-[#d0bcff]"
                    >
                      Load More Periods
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <Card hover={false} className="text-center">
                <h3 className="text-xl font-semibold text-[#e7e0ed]">No delistings found</h3>
                <p className="mt-2 text-[#cbc3d7]">
                  Try broadening platform filters or re-enabling additional statuses.
                </p>
              </Card>
            )}
          </section>

          <aside className="space-y-4">
            <Card hover={false}>
              <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-[#d0bcff]">
                Feed Stats
              </h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-[#494454] pb-2">
                  <dt className="text-[#958ea0]">Visible periods</dt>
                  <dd className="font-mono text-[#e7e0ed]">{shownTimeline.length}</dd>
                </div>
                <div className="flex items-center justify-between border-b border-[#494454] pb-2">
                  <dt className="text-[#958ea0]">Visible events</dt>
                  <dd className="font-mono text-[#e7e0ed]">{totalShownGames}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-[#958ea0]">Filtered statuses</dt>
                  <dd className="font-mono text-[#e7e0ed]">{statusFilters.length}</dd>
                </div>
              </dl>
            </Card>

            <Card hover={false}>
              <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-[#d0bcff]">
                Navigation
              </h2>
              <div className="mt-4 space-y-2">
                <Link
                  href="/"
                  className="block border border-[#494454] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#cbc3d7] transition-colors hover:border-[#d0bcff] hover:text-[#d0bcff]"
                >
                  Back to Home
                </Link>
                <Link
                  href="/mortuary"
                  className="block border border-[#494454] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#cbc3d7] transition-colors hover:border-[#d0bcff] hover:text-[#d0bcff]"
                >
                  Open Mortuary
                </Link>
              </div>
            </Card>
          </aside>
        </div>
      </section>
    </main>
  );
}
