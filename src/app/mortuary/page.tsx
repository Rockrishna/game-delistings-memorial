"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [sortBy, setSortBy] = useState<"delisted-desc" | "delisted-asc" | "title-asc">(
    "delisted-desc"
  );
  const [visibleCount, setVisibleCount] = useState(12);
  const [games, setGames] = useState<MortuaryGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    return params.toString();
  }, [searchQuery]);

  useEffect(() => {
    setVisibleCount(12);
  }, [query]);

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

  const years = useMemo(() => {
    const values = new Set<string>();
    games.forEach((game) => {
      const year = new Date(game.delistDate).getUTCFullYear();
      if (!Number.isNaN(year)) values.add(String(year));
    });
    return [...values].sort((a, b) => Number(b) - Number(a));
  }, [games]);

  const platforms = useMemo(() => {
    const values = new Set<string>();
    games.forEach((game) => game.platforms.forEach((platform) => values.add(platform)));
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [games]);

  const filteredGames = useMemo(() => {
    const filtered = games.filter((game) => {
      const year = String(new Date(game.delistDate).getUTCFullYear());
      const matchesYear = !selectedYear || year === selectedYear;
      const matchesPlatform =
        !selectedPlatform ||
        game.platforms.some(
          (platform) => platform.toLowerCase() === selectedPlatform.toLowerCase()
        );
      return matchesYear && matchesPlatform;
    });

    if (sortBy === "title-asc") {
      return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
    }
    if (sortBy === "delisted-asc") {
      return [...filtered].sort(
        (a, b) => new Date(a.delistDate).getTime() - new Date(b.delistDate).getTime()
      );
    }
    return [...filtered].sort(
      (a, b) => new Date(b.delistDate).getTime() - new Date(a.delistDate).getTime()
    );
  }, [games, selectedYear, selectedPlatform, sortBy]);

  const visibleGames = useMemo(
    () => filteredGames.slice(0, visibleCount),
    [filteredGames, visibleCount]
  );

  const hasMore = filteredGames.length > visibleGames.length;
  const delistedThisYear = useMemo(() => {
    const year = new Date().getUTCFullYear();
    return games.filter((game) => new Date(game.delistDate).getUTCFullYear() === year).length;
  }, [games]);

  const dominantPlatform = useMemo(() => {
    const counts = new Map<string, number>();
    games.forEach((game) => {
      game.platforms.forEach((platform) => {
        counts.set(platform, (counts.get(platform) ?? 0) + 1);
      });
    });
    const [platform] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
    return platform ?? "Unknown";
  }, [games]);

  return (
    <main className="min-h-screen bg-[#15121b] pb-12">
      <section className="mx-auto max-w-[1280px] space-y-8 px-6 py-10">
        <header className="border border-[#494454] bg-[#1d1a23] p-8">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#d0bcff]">
            Archive Ledger
          </p>
          <h1 className="mt-3 text-4xl font-bold text-[#e7e0ed]">The Mortuary</h1>
          <p className="mt-2 max-w-3xl text-[#cbc3d7]">
            Permanent archive of digitally delisted titles with platform metadata, dates,
            and preservation context.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="border border-[#494454] bg-[#211e27] p-4">
              <p className="text-xs uppercase tracking-[0.1em] text-[#958ea0]">Total archived</p>
              <p className="mt-1 font-mono text-3xl font-bold text-[#d0bcff]">{games.length}</p>
            </div>
            <div className="border border-[#494454] bg-[#211e27] p-4">
              <p className="text-xs uppercase tracking-[0.1em] text-[#958ea0]">Delisted this year</p>
              <p className="mt-1 font-mono text-3xl font-bold text-[#89ceff]">{delistedThisYear}</p>
            </div>
            <div className="border border-[#494454] bg-[#211e27] p-4">
              <p className="text-xs uppercase tracking-[0.1em] text-[#958ea0]">Most affected platform</p>
              <p className="mt-1 font-mono text-xl font-bold text-[#ffb869]">{dominantPlatform}</p>
            </div>
          </div>
        </header>

        <section className="space-y-4 border-b border-[#494454] pb-8">
          <SearchBar
            placeholder="Search title or genre..."
            onSearch={setSearchQuery}
            className="max-w-2xl"
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#958ea0]">
                Year
              </span>
              <select
                value={selectedYear}
                onChange={(event) => setSelectedYear(event.target.value)}
                className="w-full border border-[#494454] bg-[#2c2832] px-3 py-2 font-mono text-sm text-[#e7e0ed] focus:border-[#d0bcff] focus:outline-none"
              >
                <option value="">All years</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#958ea0]">
                Platform
              </span>
              <select
                value={selectedPlatform}
                onChange={(event) => setSelectedPlatform(event.target.value)}
                className="w-full border border-[#494454] bg-[#2c2832] px-3 py-2 font-mono text-sm text-[#e7e0ed] focus:border-[#d0bcff] focus:outline-none"
              >
                <option value="">All platforms</option>
                {platforms.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
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
                onChange={(event) =>
                  setSortBy(event.target.value as "delisted-desc" | "delisted-asc" | "title-asc")
                }
                className="w-full border border-[#494454] bg-[#2c2832] px-3 py-2 font-mono text-sm text-[#e7e0ed] focus:border-[#d0bcff] focus:outline-none"
              >
                <option value="delisted-desc">Newest delisted</option>
                <option value="delisted-asc">Oldest delisted</option>
                <option value="title-asc">Alphabetical</option>
              </select>
            </label>
          </div>
        </section>

        <section>
          {loading ? (
            <div className="text-[#cbc3d7]">Loading archive...</div>
          ) : error ? (
            <div className="text-red-300">Could not load archive. {error}</div>
          ) : visibleGames.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleGames.map((game) => (
                  <Card key={game.id} className="p-4">
                    <div className="space-y-4">
                      <div className="aspect-[16/10] overflow-hidden border border-[#494454] bg-[#2c2832]">
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

                      <div>
                        <h3 className="text-lg font-semibold text-[#e7e0ed]">{game.title}</h3>
                        <p className="mt-1 text-sm text-[#958ea0]">
                          Released {game.releaseYear ?? "Unknown"}
                        </p>
                      </div>

                      <div className="border border-[#494454] bg-[#1d1a23] px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#958ea0]">
                          Delisted
                        </p>
                        <p className="mt-1 font-mono text-sm text-[#e7e0ed]">
                          {new Date(game.delistDate).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {game.platforms.map((platform, index) => (
                          <Badge
                            key={`${game.id}-${platform}-${index}`}
                            label={platform}
                            variant={game.platformBadges[index] ?? "default"}
                          />
                        ))}
                      </div>

                      {game.reason ? (
                        <p className="line-clamp-2 text-sm text-[#cbc3d7]">{game.reason}</p>
                      ) : null}

                      <div className="flex items-center justify-between border-t border-[#494454] pt-3">
                        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#f87171]">
                          Archived
                        </span>
                        <Link
                          href={`/games/${game.id}`}
                          className="text-xs font-semibold uppercase tracking-[0.08em] text-[#d0bcff] hover:underline"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {hasMore ? (
                <div className="mt-8">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((current) => current + 12)}
                    className="border border-[#494454] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#cbc3d7] transition-colors hover:border-[#d0bcff] hover:text-[#d0bcff]"
                  >
                    Load More Archived Games
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <Card hover={false} className="text-center">
              <h3 className="text-2xl font-semibold text-[#e7e0ed]">No results found</h3>
              <p className="mt-2 text-[#cbc3d7]">Try adjusting your filters.</p>
            </Card>
          )}
        </section>
      </section>
    </main>
  );
}
