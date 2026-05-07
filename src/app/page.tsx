"use client";

import StatsCard from "@/components/home/StatsCard";
import GameCard from "@/components/home/GameCard";
import SearchBar from "@/components/common/SearchBar";
import Card from "@/components/common/Card";
import { useState, useEffect } from "react";

interface DelistingEvent {
  id: string;
  title: string;
  coverUrl?: string;
  platforms: string[];
  delistDate: string;
  status: "recent" | "upcoming" | "delisted";
}

// Mock data - will be replaced with API calls
const mockRecentDelistings: DelistingEvent[] = [
  {
    id: "1",
    title: "The Last of Us Part II",
    platforms: ["playstation"],
    delistDate: "2024-02-01",
    status: "recent",
  },
  {
    id: "2",
    title: "Halo Infinite Multiplayer",
    platforms: ["xbox"],
    delistDate: "2024-01-15",
    status: "recent",
  },
  {
    id: "3",
    title: "Persona 5",
    platforms: ["steam", "playstation"],
    delistDate: "2024-01-20",
    status: "recent",
  },
];

const mockUpcomingDelistings: DelistingEvent[] = [
  {
    id: "4",
    title: "Cyberpunk 2077",
    platforms: ["steam", "playstation", "xbox"],
    delistDate: "2024-06-30",
    status: "upcoming",
  },
  {
    id: "5",
    title: "The Witcher 3",
    platforms: ["steam"],
    delistDate: "2024-07-15",
    status: "upcoming",
  },
];

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredGames, setFilteredGames] = useState<DelistingEvent[]>([]);

  useEffect(() => {
    const combined = [...mockRecentDelistings, ...mockUpcomingDelistings];
    if (searchQuery.trim() === "") {
      setFilteredGames(combined);
    } else {
      setFilteredGames(
        combined.filter((game) =>
          game.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
  }, [searchQuery]);

  const recentCount = mockRecentDelistings.length;
  const upcomingCount = mockUpcomingDelistings.length;

  return (
    <main className="min-h-screen bg-[#0f1320]">
      {/* Hero Section */}
      <section className="py-16 px-6 border-b border-[#2a3248]">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-4 mb-12">
            <h1 className="text-5xl font-bold text-[#f4f6ff]">
              Game Delistings Tracker
            </h1>
            <p className="text-xl text-[#c9d0e8] max-w-2xl">
              Monitor video game delistings and preserve digital history. See what games are being removed from stores and what's coming next.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-6">
            <StatsCard label="Recently Delisted" value={recentCount} />
            <StatsCard label="Upcoming Delistings" value={upcomingCount} />
            <StatsCard label="Total Tracked" value={recentCount + upcomingCount} />
          </div>
        </div>
      </section>

      {/* Search & Filter Section */}
      <section className="py-8 px-6 bg-[#0f1320]">
        <div className="max-w-7xl mx-auto">
          <SearchBar
            placeholder="Search for games..."
            onSearch={setSearchQuery}
          />
        </div>
      </section>

      {/* Recent Delistings */}
      <section className="py-12 px-6 bg-[#0f1320]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-[#f4f6ff] mb-2">
              Recently Delisted
            </h2>
            <p className="text-[#c9d0e8]">Games removed from stores in the last 30 days</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockRecentDelistings.map((game) => (
              <GameCard key={game.id} {...game} />
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Delistings */}
      <section className="py-12 px-6 bg-[#171d2e]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-[#f4f6ff] mb-2">
              Upcoming Delistings
            </h2>
            <p className="text-[#c9d0e8]">Games scheduled for removal soon</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockUpcomingDelistings.map((game) => (
              <GameCard key={game.id} {...game} />
            ))}
          </div>
        </div>
      </section>

      {/* Mortuary Preview */}
      <section className="py-12 px-6 bg-[#0f1320]">
        <div className="max-w-7xl mx-auto">
          <Card>
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-[#f4f6ff]">The Mortuary</h2>
              <p className="text-[#c9d0e8]">
                A comprehensive archive of permanently delisted games. Explore the digital graveyard of removed titles and their preservation status.
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

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-[#2a3248] bg-[#0f1320]">
        <div className="max-w-7xl mx-auto text-center text-[#95a0c3] text-sm">
          <p>Game Delistings Tracker • Powered by IGDB API</p>
          <p className="mt-2">Help preserve digital gaming history 🎮</p>
        </div>
      </footer>
    </main>
  );
}
