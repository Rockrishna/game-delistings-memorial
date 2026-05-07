"use client";

import Card from "@/components/common/Card";
import Badge from "@/components/common/Badge";
import SearchBar from "@/components/common/SearchBar";
import { useState } from "react";

interface GameRecord {
  id: string;
  title: string;
  releaseYear: number;
  platforms: string[];
  genres: string[];
  delistDate: string;
  reason?: string;
}

const mockDelistedGames: GameRecord[] = [
  {
    id: "1",
    title: "PT (P.T.)",
    releaseYear: 2014,
    platforms: ["playstation"],
    genres: ["Horror", "Adventure"],
    delistDate: "2015-04-29",
    reason: "License expiration",
  },
  {
    id: "2",
    title: "Marvel vs. Capcom 2",
    releaseYear: 2000,
    platforms: ["steam", "playstation", "xbox"],
    genres: ["Fighting"],
    delistDate: "2014-09-02",
    reason: "License expiration",
  },
  {
    id: "3",
    title: "Scott Pilgrim vs. the World",
    releaseYear: 2010,
    platforms: ["playstation", "xbox"],
    genres: ["Beat 'em Up"],
    delistDate: "2014-12-31",
    reason: "License expiration",
  },
];

export default function MortuaryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredGames, setFilteredGames] = useState(mockDelistedGames);

  const handleSearch = (query: string) => {
    if (query.trim() === "") {
      setFilteredGames(mockDelistedGames);
    } else {
      setFilteredGames(
        mockDelistedGames.filter(
          (game) =>
            game.title.toLowerCase().includes(query.toLowerCase()) ||
            game.genres.some((g) =>
              g.toLowerCase().includes(query.toLowerCase())
            )
        )
      );
    }
  };

  return (
    <main className="min-h-screen bg-[#0f1320]">
      {/* Hero Section */}
      <section className="py-12 px-6 border-b border-[#2a3248]">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-5xl font-bold text-[#f4f6ff] mb-4">The Mortuary</h1>
          <p className="text-xl text-[#c9d0e8] max-w-3xl">
            A digital archive of permanently delisted games. These titles can no longer be purchased on their original platforms, preserved here for historical reference and preservation efforts.
          </p>
          <div className="mt-6 p-4 bg-[#171d2e] border border-[#2a3248] rounded-lg">
            <p className="text-sm text-[#95a0c3]">
              🎮 {mockDelistedGames.length} games currently archived
            </p>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-8 px-6 bg-[#0f1320]">
        <div className="max-w-7xl mx-auto">
          <SearchBar
            placeholder="Search by title or genre..."
            onSearch={handleSearch}
          />
        </div>
      </section>

      {/* Games Grid */}
      <section className="py-12 px-6 bg-[#0f1320]">
        <div className="max-w-7xl mx-auto">
          {filteredGames.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGames.map((game) => (
                <Card key={game.id}>
                  <div className="space-y-4">
                    {/* Title & Year */}
                    <div>
                      <h3 className="text-xl font-bold text-[#f4f6ff] mb-1">
                        {game.title}
                      </h3>
                      <p className="text-sm text-[#95a0c3]">
                        Released {game.releaseYear}
                      </p>
                    </div>

                    {/* Delistment Info */}
                    <div className="bg-[#0f1320] rounded p-3">
                      <p className="text-xs text-[#95a0c3] uppercase tracking-wider mb-1">
                        Delisted
                      </p>
                      <p className="text-sm text-[#f4f6ff] font-semibold">
                        {new Date(game.delistDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>

                    {/* Reason */}
                    {game.reason && (
                      <div>
                        <p className="text-xs text-[#95a0c3] uppercase tracking-wider mb-1">
                          Reason
                        </p>
                        <p className="text-sm text-[#f4f6ff]">{game.reason}</p>
                      </div>
                    )}

                    {/* Platforms */}
                    <div>
                      <p className="text-xs text-[#95a0c3] uppercase tracking-wider mb-2">
                        Platforms
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {game.platforms.map((p) => (
                          <Badge key={p} label={p} variant={p as any} />
                        ))}
                      </div>
                    </div>

                    {/* Genres */}
                    <div>
                      <p className="text-xs text-[#95a0c3] uppercase tracking-wider mb-2">
                        Genres
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {game.genres.map((g) => (
                          <span
                            key={g}
                            className="px-3 py-1 rounded-full text-xs bg-[#171d2e] text-[#c9d0e8]"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* RIP Badge */}
                    <div className="pt-2 border-t border-[#2a3248]">
                      <span className="text-xs font-semibold text-[#ef4444]">
                        ⚰️ Rest in Digital Peace
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <h3 className="text-2xl font-bold text-[#f4f6ff] mb-2">
                No results found
              </h3>
              <p className="text-[#c9d0e8]">
                Try adjusting your search query
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Footer Info */}
      <section className="py-12 px-6 bg-[#171d2e] border-t border-[#2a3248]">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <h2 className="text-2xl font-bold text-[#f4f6ff]">
            Why does this matter?
          </h2>
          <p className="text-[#c9d0e8]">
            Digital preservation is critical as games are increasingly delisted due to licensing issues, platform shutdowns, and corporate decisions. This mortuary ensures these titles aren't forgotten.
          </p>
        </div>
      </section>
    </main>
  );
}
