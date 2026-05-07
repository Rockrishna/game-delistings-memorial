"use client";

import SearchBar from "@/components/common/SearchBar";
import Badge from "@/components/common/Badge";
import Card from "@/components/common/Card";
import { useState } from "react";

interface TimelineEvent {
  id: string;
  month: string;
  year: number;
  games: {
    id: string;
    title: string;
    platforms: string[];
    status: "recent" | "upcoming" | "delisted";
  }[];
}

const mockTimeline: TimelineEvent[] = [
  {
    month: "January",
    year: 2024,
    id: "jan-2024",
    games: [
      {
        id: "g1",
        title: "Halo Infinite Multiplayer",
        platforms: ["xbox"],
        status: "recent",
      },
      {
        id: "g2",
        title: "Persona 5",
        platforms: ["steam", "playstation"],
        status: "recent",
      },
    ],
  },
  {
    month: "February",
    year: 2024,
    id: "feb-2024",
    games: [
      {
        id: "g3",
        title: "The Last of Us Part II",
        platforms: ["playstation"],
        status: "recent",
      },
    ],
  },
  {
    month: "June",
    year: 2024,
    id: "jun-2024",
    games: [
      {
        id: "g4",
        title: "Cyberpunk 2077",
        platforms: ["steam", "playstation", "xbox"],
        status: "upcoming",
      },
    ],
  },
];

const PLATFORMS = ["All", "Steam", "PlayStation", "Xbox", "Nintendo", "Epic"];
const SORT_OPTIONS = ["Date (Newest)", "Date (Oldest)", "Alphabetical"];

export default function TimelinePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("All");
  const [sortBy, setSortBy] = useState("Date (Newest)");

  return (
    <main className="min-h-screen bg-[#0f1320]">
      {/* Hero Section */}
      <section className="py-12 px-6 border-b border-[#2a3248]">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-[#f4f6ff] mb-2">Timeline</h1>
          <p className="text-[#c9d0e8]">
            Chronological view of game delistings and availability changes
          </p>
        </div>
      </section>

      {/* Controls Section */}
      <section className="py-8 px-6 bg-[#0f1320]">
        <div className="max-w-7xl mx-auto space-y-6">
          <SearchBar
            placeholder="Search for games, platforms, dates..."
            onSearch={setSearchQuery}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Platform Filter */}
            <div>
              <label className="block text-sm font-medium text-[#f4f6ff] mb-2">
                Platform
              </label>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-[#171d2e] border border-[#2a3248] text-[#f4f6ff] focus:border-[#8b5cf6] focus:outline-none"
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-[#f4f6ff] mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-[#171d2e] border border-[#2a3248] text-[#f4f6ff] focus:border-[#8b5cf6] focus:outline-none"
              >
                {SORT_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-12 px-6 bg-[#0f1320]">
        <div className="max-w-4xl mx-auto">
          {mockTimeline.length > 0 ? (
            <div className="space-y-12">
              {mockTimeline.map((period) => (
                <div key={period.id}>
                  {/* Date Header */}
                  <div className="sticky top-20 z-40 bg-[#0f1320] py-4 mb-6">
                    <h2 className="text-3xl font-bold text-[#8b5cf6]">
                      {period.month} {period.year}
                    </h2>
                    <div className="mt-2 h-1 w-24 bg-gradient-to-r from-[#8b5cf6] to-transparent"></div>
                  </div>

                  {/* Games in Period */}
                  <div className="space-y-4">
                    {period.games.map((game) => (
                      <Card key={game.id}>
                        <div className="flex items-start gap-4">
                          {/* Status Indicator */}
                          <div className="flex-shrink-0 mt-1">
                            <div className="w-3 h-3 rounded-full bg-[#8b5cf6]"></div>
                          </div>

                          {/* Content */}
                          <div className="flex-grow">
                            <h3 className="text-lg font-semibold text-[#f4f6ff] mb-2">
                              {game.title}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              <Badge label={game.status} variant={game.status} />
                              {game.platforms.map((p) => (
                                <Badge key={p} label={p} variant={p as any} />
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
              <h3 className="text-xl font-semibold text-[#f4f6ff] mb-2">
                No results found
              </h3>
              <p className="text-[#c9d0e8]">
                Try adjusting your search filters
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
