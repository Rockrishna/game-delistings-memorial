"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/common/Card";
import Badge from "@/components/common/Badge";
import SearchBar from "@/components/common/SearchBar";

type MortuaryGame = {
  id: string;
  title: string;
  releaseYear: number | null;
  platforms: string[];
  platformBadges: Array<"steam" | "playstation" | "xbox" | "nintendo" | "epic" | "default">;
  genres: string[];
  delistDate: string;
  reason?: string;
  coverUrl?: string;
};

export default function MortuaryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [games, setGames] = useState<MortuaryGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    return params.toString();
  }, [searchQuery]);

  useEffect(() => {
    async function run() {
      try {
        setLoading(true);
        const response = await fetch(`/api/mortuary?${query}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load mortuary data.");
        }
        const payload = (await response.json()) as MortuaryGame[];
        setGames(payload);
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
          <h1 className="text-5xl font-bold text-[#f4f6ff] mb-4">The Mortuary</h1>
          <p className="text-xl text-[#c9d0e8] max-w-3xl">
            Permanent archive for delisted titles that can no longer be purchased.
          </p>
          <div className="mt-6 p-4 bg-[#171d2e] border border-[#2a3248] rounded-lg">
            <p className="text-sm text-[#95a0c3]">🎮 {games.length} games currently archived</p>
          </div>
        </div>
      </section>

      <section className="py-8 px-6 bg-[#0f1320]">
        <div className="max-w-7xl mx-auto">
          <SearchBar placeholder="Search by title or genre..." onSearch={setSearchQuery} />
        </div>
      </section>

      <section className="py-12 px-6 bg-[#0f1320]">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="text-[#c9d0e8]">Loading archive...</div>
          ) : error ? (
            <div className="text-red-300">Could not load archive. {error}</div>
          ) : games.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {games.map((game) => (
                <Card key={game.id}>
                  <div className="space-y-4">
                    <div className="relative aspect-video rounded bg-[#20283d] overflow-hidden">
                      {game.coverUrl ? (
                        <img src={game.coverUrl} alt={game.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#95a0c3]">
                          No Artwork
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-[#f4f6ff] mb-1">{game.title}</h3>
                      <p className="text-sm text-[#95a0c3]">
                        Released {game.releaseYear ?? "Unknown"}
                      </p>
                    </div>

                    <div className="bg-[#0f1320] rounded p-3">
                      <p className="text-xs text-[#95a0c3] uppercase tracking-wider mb-1">Delisted</p>
                      <p className="text-sm text-[#f4f6ff] font-semibold">
                        {new Date(game.delistDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>

                    {game.reason ? (
                      <div>
                        <p className="text-xs text-[#95a0c3] uppercase tracking-wider mb-1">Reason</p>
                        <p className="text-sm text-[#f4f6ff]">{game.reason}</p>
                      </div>
                    ) : null}

                    <div>
                      <p className="text-xs text-[#95a0c3] uppercase tracking-wider mb-2">Platforms</p>
                      <div className="flex flex-wrap gap-2">
                        {game.platforms.map((platform, index) => (
                          <Badge
                            key={`${platform}-${index}`}
                            label={platform}
                            variant={game.platformBadges[index] ?? "default"}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-[#95a0c3] uppercase tracking-wider mb-2">Genres</p>
                      <div className="flex flex-wrap gap-2">
                        {game.genres.map((genre) => (
                          <span
                            key={genre}
                            className="px-3 py-1 rounded-full text-xs bg-[#171d2e] text-[#c9d0e8]"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>
                    </div>

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
              <h3 className="text-2xl font-bold text-[#f4f6ff] mb-2">No results found</h3>
              <p className="text-[#c9d0e8]">Try adjusting your search query.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
