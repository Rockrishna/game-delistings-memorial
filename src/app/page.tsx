"use client";

import { useEffect, useMemo, useState } from "react";
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

  const filteredRecent = useMemo(() => {
    const list = data?.recent ?? [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (game) =>
        game.title.toLowerCase().includes(q) ||
        game.platforms.some((platform) => platform.toLowerCase().includes(q))
    );
  }, [data?.recent, searchQuery]);

  const filteredUpcoming = useMemo(() => {
    const list = data?.upcoming ?? [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (game) =>
        game.title.toLowerCase().includes(q) ||
        game.platforms.some((platform) => platform.toLowerCase().includes(q))
    );
  }, [data?.upcoming, searchQuery]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0f1320] px-6 py-12">
        <div className="max-w-7xl mx-auto text-[#c9d0e8]">Loading game data...</div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-[#0f1320] px-6 py-12">
        <div className="max-w-7xl mx-auto text-red-300">
          Could not load delisting data. {error}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f1320]">
      <section className="py-16 px-6 border-b border-[#2a3248]">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-4 mb-12">
            <h1 className="text-5xl font-bold text-[#f4f6ff]">Game Delistings Tracker</h1>
            <p className="text-xl text-[#c9d0e8] max-w-2xl">
              Track recently removed titles, upcoming delisting windows, and preserve
              storefront history.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard label="Recently Delisted" value={data.stats.recent} />
            <StatsCard label="Upcoming Delistings" value={data.stats.upcoming} />
            <StatsCard label="Total Tracked Events" value={data.stats.total} />
          </div>
        </div>
      </section>

      <section className="py-8 px-6 bg-[#0f1320]">
        <div className="max-w-7xl mx-auto">
          <SearchBar placeholder="Search by game or platform..." onSearch={setSearchQuery} />
        </div>
      </section>

      <section className="py-12 px-6 bg-[#0f1320]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-[#f4f6ff] mb-2">Recently Delisted</h2>
            <p className="text-[#c9d0e8]">Latest removals from tracked storefronts.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecent.map((game) => (
              <GameCard key={game.id} {...game} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 px-6 bg-[#171d2e]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-[#f4f6ff] mb-2">Upcoming Delistings</h2>
            <p className="text-[#c9d0e8]">Games with announced or projected removals.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUpcoming.map((game) => (
              <GameCard key={game.id} {...game} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 px-6 bg-[#0f1320]">
        <div className="max-w-7xl mx-auto">
          <Card>
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-[#f4f6ff]">The Mortuary</h2>
              <p className="text-[#c9d0e8]">
                Browse the long-term archive of games that are no longer available for purchase.
              </p>
              <a
                href="/mortuary"
                className="inline-block px-6 py-3 bg-[#8b5cf6] text-white rounded-lg font-medium hover:bg-[#9d74ff] transition-colors"
              >
                Visit Mortuary →
              </a>
            </div>
          </Card>
        </div>
      </section>

      <footer className="py-8 px-6 border-t border-[#2a3248] bg-[#0f1320]">
        <div className="max-w-7xl mx-auto text-center text-[#95a0c3] text-sm">
          <p>Game Delistings Tracker • IGDB metadata + curated delisting events</p>
        </div>
      </footer>
    </main>
  );
}
