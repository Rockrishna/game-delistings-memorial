"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import StatsCard from "@/components/home/StatsCard";
import GameCard from "@/components/home/GameCard";
import SearchBar from "@/components/common/SearchBar";
import Card from "@/components/common/Card";

type HomePayload = {
  stats: { recent: number; upcoming: number; total: number };
  recent: Array<{
    id: string;
    slug: string;
    title: string;
    coverUrl?: string;
    platforms: string[];
    platformBadges: Array<"steam" | "playstation" | "xbox" | "nintendo" | "epic" | "default">;
    delistDate: string;
    status: "recent" | "upcoming" | "delisted";
    sourceUrl?: string;
  }>;
  upcoming: Array<{
    id: string;
    slug: string;
    title: string;
    coverUrl?: string;
    platforms: string[];
    platformBadges: Array<"steam" | "playstation" | "xbox" | "nintendo" | "epic" | "default">;
    delistDate: string;
    status: "recent" | "upcoming" | "delisted";
    sourceUrl?: string;
  }>;
};

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [data, setData] = useState<HomePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      try {
        setLoading(true);
        const response = await fetch("/api/home", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to fetch homepage data.");
        }
        const payload = (await response.json()) as HomePayload;
        setData(payload);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    run();
  }, []);

  const allPlatforms = useMemo(() => {
    const values = new Set<string>();
    [...(data?.recent ?? []), ...(data?.upcoming ?? [])].forEach((game) => {
      game.platforms.forEach((platform) => values.add(platform));
    });
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [data?.recent, data?.upcoming]);

  const filteredRecent = useMemo(
    () => filterGames(data?.recent ?? [], searchQuery, selectedPlatform),
    [data?.recent, searchQuery, selectedPlatform]
  );

  const filteredUpcoming = useMemo(
    () => filterGames(data?.upcoming ?? [], searchQuery, selectedPlatform),
    [data?.upcoming, searchQuery, selectedPlatform]
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-[#15121b] px-6 py-12">
        <div className="mx-auto max-w-[1280px] text-[#cbc3d7]">Loading game data...</div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-[#15121b] px-6 py-12">
        <div className="mx-auto max-w-[1280px] text-red-300">
          Could not load delisting data. {error}
        </div>
      </main>
    );
  }

  const heroImage = data.recent[0]?.coverUrl ?? data.upcoming[0]?.coverUrl;

  return (
    <main className="min-h-screen bg-[#15121b] pb-12">
      <section className="mx-auto max-w-[1280px] space-y-10 px-6 py-10">
        <header className="relative overflow-hidden border border-[#494454] bg-[#1d1a23] p-8 lg:p-10">
          <div className="relative z-10 max-w-2xl space-y-5">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#d0bcff]">
              Live Digital Archive
            </p>
            <h1 className="text-4xl font-bold text-[#e7e0ed] lg:text-5xl">
              Game Delistings Tracker
            </h1>
            <p className="max-w-xl text-[#cbc3d7]">
              Monitor recently delisted games, upcoming removals, and long-term archive
              records across major storefronts.
            </p>
            <SearchBar
              className="max-w-xl"
              placeholder="Search database for titles or platforms..."
              onSearch={setSearchQuery}
            />
          </div>
          {heroImage ? (
            <img
              src={heroImage}
              alt="Featured delisting artwork"
              className="absolute right-10 top-1/2 hidden h-56 w-56 -translate-y-1/2 border border-[#494454] object-cover opacity-60 lg:block"
            />
          ) : null}
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#d0bcff]/10 blur-3xl" />
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatsCard
            label="Recently Delisted"
            value={data.stats.recent}
            note="Past 30 days"
            accent="primary"
          />
          <StatsCard
            label="Upcoming Delistings"
            value={data.stats.upcoming}
            note="Announced windows"
            accent="secondary"
          />
          <StatsCard
            label="Total Archived Events"
            value={data.stats.total}
            note="Curated historical records"
            accent="tertiary"
          />
        </section>

        <section className="space-y-3 border-b border-[#494454] pb-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 font-mono text-xs uppercase tracking-[0.1em] text-[#958ea0]">
              Platform filter:
            </span>
            <button
              type="button"
              onClick={() => setSelectedPlatform("")}
              className={`border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] transition-colors ${
                selectedPlatform === ""
                  ? "border-[#d0bcff] bg-[#d0bcff]/10 text-[#d0bcff]"
                  : "border-[#494454] text-[#cbc3d7] hover:border-[#d0bcff] hover:text-[#d0bcff]"
              }`}
            >
              All
            </button>
            {allPlatforms.map((platform) => (
              <button
                key={platform}
                type="button"
                onClick={() => setSelectedPlatform(platform)}
                className={`border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] transition-colors ${
                  selectedPlatform === platform
                    ? "border-[#d0bcff] bg-[#d0bcff]/10 text-[#d0bcff]"
                    : "border-[#494454] text-[#cbc3d7] hover:border-[#d0bcff] hover:text-[#d0bcff]"
                }`}
              >
                {platform}
              </button>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-10 xl:grid-cols-2">
          <div>
            <div className="mb-5 flex items-end justify-between border-b border-[#494454] pb-2">
              <h2 className="text-2xl font-semibold text-[#e7e0ed]">Recently Delisted</h2>
              <span className="font-mono text-xs uppercase tracking-[0.08em] text-[#958ea0]">
                latest removals
              </span>
            </div>
            {filteredRecent.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {filteredRecent.map((game) => (
                  <GameCard key={game.id} {...game} />
                ))}
              </div>
            ) : (
              <Card hover={false}>
                <p className="text-[#cbc3d7]">No recent delistings matched this filter.</p>
              </Card>
            )}
          </div>

          <div>
            <div className="mb-5 flex items-end justify-between border-b border-[#494454] pb-2">
              <h2 className="text-2xl font-semibold text-[#e7e0ed]">Upcoming Delistings</h2>
              <span className="font-mono text-xs uppercase tracking-[0.08em] text-[#958ea0]">
                watchlist
              </span>
            </div>
            {filteredUpcoming.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {filteredUpcoming.map((game) => (
                  <GameCard key={game.id} {...game} />
                ))}
              </div>
            ) : (
              <Card hover={false}>
                <p className="text-[#cbc3d7]">No upcoming delistings matched this filter.</p>
              </Card>
            )}
          </div>
        </section>

        <Card className="bg-[#1d1a23]">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-[#e7e0ed]">Explore the full archive</h2>
              <p className="mt-1 text-[#cbc3d7]">
                Dive into the timeline feed or open the long-term mortuary index.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/timeline"
                className="border border-[#d0bcff] bg-[#d0bcff]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[#d0bcff] transition-colors hover:bg-[#d0bcff]/20"
              >
                View Timeline
              </Link>
              <Link
                href="/mortuary"
                className="border border-[#494454] px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[#cbc3d7] transition-colors hover:border-[#d0bcff] hover:text-[#d0bcff]"
              >
                Open Mortuary
              </Link>
            </div>
          </div>
        </Card>
      </section>
    </main>
  );
}

function filterGames<T extends { title: string; platforms: string[] }>(
  games: T[],
  query: string,
  selectedPlatform: string
) {
  const normalizedQuery = query.trim().toLowerCase();
  return games.filter((game) => {
    const queryMatch =
      !normalizedQuery ||
      game.title.toLowerCase().includes(normalizedQuery) ||
      game.platforms.some((platform) => platform.toLowerCase().includes(normalizedQuery));
    const platformMatch =
      !selectedPlatform ||
      game.platforms.some((platform) => platform.toLowerCase() === selectedPlatform.toLowerCase());
    return queryMatch && platformMatch;
  });
}
