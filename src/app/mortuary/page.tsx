"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SearchBar from "@/components/common/SearchBar";
import SearchFallback from "@/components/common/SearchFallback";

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

type FacetEntry = { name: string; count: number };
type Facets = {
  Platform: FacetEntry[];
  Cause: FacetEntry[];
  Decade: FacetEntry[];
  Genre: FacetEntry[];
};

function normaliseCause(reason: string | undefined): string {
  if (!reason) return "Undisclosed";
  const lower = reason.toLowerCase();
  if (lower.includes("license") || lower.includes("licence")) return "License Expiry";
  if (lower.includes("server") || lower.includes("shutdown")) return "Service Shutdown";
  if (lower.includes("publish")) return "Publisher Decision";
  if (lower.includes("storefront") || lower.includes("store closure")) return "Storefront Closure";
  if (lower.includes("replace") || lower.includes("definitive") || lower.includes("re-release"))
    return "Replaced";
  if (lower.includes("agreement") || lower.includes("contract")) return "Agreement Lapse";
  return reason.length > 28 ? `${reason.slice(0, 25).trim()}…` : reason;
}

export default function MortuaryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedCauses, setSelectedCauses] = useState<string[]>([]);
  const [selectedDecade, setSelectedDecade] = useState<string>("");
  const [visibleCount, setVisibleCount] = useState(12);
  const [games, setGames] = useState<MortuaryGame[]>([]);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.set("q", searchQuery.trim());
        const [eventsResponse, facetsResponse] = await Promise.all([
          fetch(`/api/mortuary?${params.toString()}`, { cache: "no-store" }),
          fetch("/api/mortuary/facets", { cache: "no-store" }),
        ]);
        if (!eventsResponse.ok) throw new Error("Failed to load archive.");
        if (!facetsResponse.ok) throw new Error("Failed to load facets.");
        setGames((await eventsResponse.json()) as MortuaryGame[]);
        setFacets((await facetsResponse.json()) as Facets);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    run();
  }, [searchQuery]);

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      if (selectedPlatforms.length) {
        const matches = game.platforms.some((platform) => selectedPlatforms.includes(platform));
        if (!matches) return false;
      }
      if (selectedCauses.length) {
        const cause = normaliseCause(game.reason);
        if (!selectedCauses.includes(cause)) return false;
      }
      if (selectedDecade && game.releaseYear) {
        const decade = `${Math.floor(game.releaseYear / 10) * 10}s`;
        if (decade !== selectedDecade) return false;
      }
      return true;
    });
  }, [games, selectedPlatforms, selectedCauses, selectedDecade]);

  const visibleGames = filteredGames.slice(0, visibleCount);
  const hasMore = filteredGames.length > visibleGames.length;

  function togglePlatform(name: string) {
    setSelectedPlatforms((current) =>
      current.includes(name) ? current.filter((p) => p !== name) : [...current, name]
    );
  }

  function toggleCause(name: string) {
    setSelectedCauses((current) =>
      current.includes(name) ? current.filter((c) => c !== name) : [...current, name]
    );
  }

  return (
    <main className="mx-auto max-w-[1280px] bg-[color:var(--paper)] pb-16">
      <section className="border-x border-b border-[color:var(--ink)]">
        <header className="border-b-[3px] border-double border-[color:var(--ink)] px-6 py-8 text-center">
          <p className="font-typewriter text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-3)]">
            Archive
          </p>
          <h1 className="mt-2 font-display text-5xl font-black sm:text-6xl">Delisted Games</h1>
          <p className="mx-auto mt-3 max-w-2xl font-serif text-base italic text-[color:var(--ink-2)]">
            Permanent records of titles removed from digital storefronts.
          </p>
        </header>

        <div className="grid gap-0 lg:grid-cols-[260px_1fr]">
          {/* Faceted left rail */}
          <aside className="border-b border-[color:var(--rule)] bg-[color:var(--paper-2)] p-5 lg:border-b-0 lg:border-r">
            <SearchBar
              placeholder="Search the index…"
              onSearch={setSearchQuery}
              initialValue={searchQuery}
              className="mb-5"
            />

            <FacetSection title="By Platform">
              <FacetCheckboxes
                options={facets?.Platform ?? []}
                selected={selectedPlatforms}
                onToggle={togglePlatform}
              />
            </FacetSection>

            <FacetSection title="By Cause">
              <FacetCheckboxes
                options={facets?.Cause ?? []}
                selected={selectedCauses}
                onToggle={toggleCause}
              />
            </FacetSection>

            <FacetSection title="By Decade">
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setSelectedDecade("")}
                  className={`flex w-full items-center justify-between border border-transparent px-2 py-1 text-left font-serif text-sm hover:border-[color:var(--rule-soft)] ${
                    selectedDecade === "" ? "bg-[color:var(--paper-3)] font-semibold" : ""
                  }`}
                >
                  <span>All decades</span>
                </button>
                {(facets?.Decade ?? []).map((entry) => (
                  <button
                    key={entry.name}
                    type="button"
                    onClick={() => setSelectedDecade(entry.name)}
                    className={`flex w-full items-center justify-between border border-transparent px-2 py-1 text-left font-serif text-sm hover:border-[color:var(--rule-soft)] ${
                      selectedDecade === entry.name ? "bg-[color:var(--paper-3)] font-semibold" : ""
                    }`}
                  >
                    <span>{entry.name}</span>
                    <span className="font-typewriter text-[10px] text-[color:var(--ink-3)]">
                      {entry.count}
                    </span>
                  </button>
                ))}
              </div>
            </FacetSection>

            {(selectedPlatforms.length || selectedCauses.length || selectedDecade) ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedPlatforms([]);
                  setSelectedCauses([]);
                  setSelectedDecade("");
                }}
                className="mt-4 font-typewriter text-[10px] uppercase tracking-[0.16em] text-[color:var(--accent)] underline-offset-2 hover:underline"
              >
                Clear all filters
              </button>
            ) : null}
          </aside>

          <div className="px-6 py-8">
            {loading ? (
              <p className="text-center font-serif italic text-[color:var(--ink-2)]">
                Loading archive…
              </p>
            ) : error ? (
              <p className="text-center font-serif italic text-[color:var(--accent)]">
                Could not load archive. {error}
              </p>
            ) : filteredGames.length === 0 ? (
              <>
                <p className="border border-dashed border-[color:var(--rule-soft)] bg-[color:var(--paper-2)] p-10 text-center font-serif italic text-[color:var(--ink-3)]">
                  No records match these filters. Try widening the platform, cause, or decade.
                </p>
                <SearchFallback query={searchQuery} />
              </>
            ) : (
              <>
                <p className="mb-6 font-typewriter text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-3)]">
                  {filteredGames.length} record{filteredGames.length === 1 ? "" : "s"} ·
                  showing {visibleGames.length}
                </p>

                <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleGames.map((game) => (
                    <Link
                      href={`/games/${game.id}`}
                      key={game.id}
                      className="group block text-center"
                    >
                      <div className="broadsheet-cover-frame aspect-[3/4]">
                        {game.coverUrl ? (
                          <img src={game.coverUrl} alt={game.title} loading="lazy" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center font-typewriter text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-3)]">
                            No Cover
                          </div>
                        )}
                      </div>
                      <div className="border-double-ink mt-3 px-1 py-2">
                        <h3 className="font-display text-xl font-bold leading-tight text-[color:var(--ink)] group-hover:text-[color:var(--accent)]">
                          {game.title}
                        </h3>
                        <p className="mt-1 font-serif text-xs italic text-[color:var(--ink-2)]">
                          {game.releaseYear ?? "—"} —{" "}
                          {new Date(game.delistDate).getUTCFullYear()}
                        </p>
                      </div>
                      <p className="mt-2 font-typewriter text-[9px] uppercase tracking-[0.16em] text-[color:var(--ink-3)]">
                        {game.platforms.join(" · ")}
                      </p>
                      {game.reason ? (
                        <p className="mt-2 line-clamp-3 font-serif text-sm italic text-[color:var(--ink-2)]">
                          “{game.reason}”
                        </p>
                      ) : null}
                    </Link>
                  ))}
                </div>

                {hasMore ? (
                  <div className="mt-10 text-center">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((current) => current + 12)}
                      className="border border-[color:var(--ink)] bg-[color:var(--paper)] px-5 py-2 font-typewriter text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink)] transition-colors hover:bg-[color:var(--ink)] hover:text-[color:var(--paper)]"
                    >
                      Load more records
                    </button>
                  </div>
                ) : null}

              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function FacetSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <p className="border-b border-[color:var(--ink)] pb-1 font-typewriter text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-2)]">
        {title}
      </p>
      <div className="mt-2 space-y-1">{children}</div>
    </section>
  );
}

function FacetCheckboxes({
  options,
  selected,
  onToggle,
}: {
  options: FacetEntry[];
  selected: string[];
  onToggle: (name: string) => void;
}) {
  if (!options.length) {
    return (
      <p className="font-serif text-xs italic text-[color:var(--ink-3)]">
        Awaiting first records.
      </p>
    );
  }
  return (
    <div className="space-y-1">
      {options.map((entry) => {
        const active = selected.includes(entry.name);
        return (
          <button
            key={entry.name}
            type="button"
            onClick={() => onToggle(entry.name)}
            className={`flex w-full items-center justify-between border border-transparent px-2 py-1 text-left font-serif text-sm hover:border-[color:var(--rule-soft)] ${
              active ? "bg-[color:var(--paper-3)] font-semibold" : ""
            }`}
          >
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className={`inline-block h-3 w-3 border ${
                  active
                    ? "border-[color:var(--ink)] bg-[color:var(--ink)]"
                    : "border-[color:var(--rule)]"
                }`}
              />
              {entry.name}
            </span>
            <span className="font-typewriter text-[10px] text-[color:var(--ink-3)]">{entry.count}</span>
          </button>
        );
      })}
    </div>
  );
}
