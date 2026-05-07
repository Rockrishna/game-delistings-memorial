"use client";

import { useEffect, useMemo, useState } from "react";
import SearchBar from "@/components/common/SearchBar";
import Badge from "@/components/common/Badge";
import Card from "@/components/common/Card";

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

  return (
    <main className="min-h-screen bg-[#0f1320]">
      <section className="py-12 px-6 border-b border-[#2a3248]">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-[#f4f6ff] mb-2">Timeline</h1>
          <p className="text-[#c9d0e8]">
            Chronological delisting and upcoming removal events.
          </p>
        </div>
      </section>

      <section className="py-8 px-6 bg-[#0f1320]">
        <div className="max-w-7xl mx-auto space-y-6">
          <SearchBar
            placeholder="Search for games, genres, or platform..."
            onSearch={setSearchQuery}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-[#f4f6ff] mb-2">Platform</label>
              <select
                value={selectedPlatform}
                onChange={(event) => setSelectedPlatform(event.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-[#171d2e] border border-[#2a3248] text-[#f4f6ff] focus:border-[#8b5cf6] focus:outline-none"
              >
                {PLATFORMS.map((platform) => (
                  <option key={platform.value || "all"} value={platform.value}>
                    {platform.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#f4f6ff] mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-[#171d2e] border border-[#2a3248] text-[#f4f6ff] focus:border-[#8b5cf6] focus:outline-none"
              >
                {SORT_OPTIONS.map((sortOption) => (
                  <option key={sortOption.value} value={sortOption.value}>
                    {sortOption.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 px-6 bg-[#0f1320]">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="text-[#c9d0e8]">Loading timeline...</div>
          ) : error ? (
            <div className="text-red-300">Could not load timeline. {error}</div>
          ) : timeline.length > 0 ? (
            <div className="space-y-12">
              {timeline.map((period) => (
                <div key={period.id}>
                  <div className="sticky top-20 z-40 bg-[#0f1320] py-4 mb-6">
                    <h2 className="text-3xl font-bold text-[#8b5cf6]">
                      {period.month} {period.year}
                    </h2>
                    <div className="mt-2 h-1 w-24 bg-gradient-to-r from-[#8b5cf6] to-transparent" />
                  </div>
                  <div className="space-y-4">
                    {period.games.map((game) => (
                      <Card key={`${period.id}-${game.id}-${game.delistDate}`}>
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 mt-1">
                            <div className="w-3 h-3 rounded-full bg-[#8b5cf6]" />
                          </div>
                          <div className="flex-grow">
                            <h3 className="text-lg font-semibold text-[#f4f6ff] mb-2">
                              {game.title}
                            </h3>
                            <p className="text-xs text-[#95a0c3] mb-2">
                              {new Date(game.delistDate).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <Badge label={game.status} variant={game.status} />
                              {game.platforms.map((platform, index) => (
                                <Badge
                                  key={`${platform}-${index}`}
                                  label={platform}
                                  variant={game.platformBadges[index] ?? "default"}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold text-[#f4f6ff] mb-2">No results found</h3>
              <p className="text-[#c9d0e8]">Try adjusting your search filters.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
