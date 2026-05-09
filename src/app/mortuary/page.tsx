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
  rating?: number | null;
  coverUrl?: string;
};

type FacetEntry = { name: string; count: number };
type Facets = {
  Platform: FacetEntry[];
  Genre: FacetEntry[];
  Decade: FacetEntry[];
  Rating: FacetEntry[];
};

type SortKey =
  | "newest_delist"
  | "oldest_delist"
  | "alphabetical"
  | "highest_rated"
  | "newest_release"
  | "oldest_release";

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "newest_delist", label: "Most recently delisted" },
  { value: "oldest_delist", label: "Earliest delisted" },
  { value: "highest_rated", label: "Highest IGDB rating" },
  { value: "alphabetical", label: "Title (A → Z)" },
  { value: "newest_release", label: "Newest release year" },
  { value: "oldest_release", label: "Oldest release year" },
];

function ratingBucket(rating: number | null | undefined): string {
  if (rating == null) return "Unrated";
  if (rating >= 90) return "90+";
  if (rating >= 80) return "80–89";
  if (rating >= 70) return "70–79";
  if (rating >= 60) return "60–69";
  if (rating >= 50) return "50–59";
  return "<50";
}

export default function MortuaryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedRatings, setSelectedRatings] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedDecade, setSelectedDecade] = useState<string>("");
  const [withCoverOnly, setWithCoverOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("newest_delist");
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
    const filtered = games.filter((game) => {
      if (selectedPlatforms.length) {
        const matches = game.platforms.some((platform) => selectedPlatforms.includes(platform));
        if (!matches) return false;
      }
      if (selectedRatings.length) {
        const bucket = ratingBucket(game.rating);
        if (!selectedRatings.includes(bucket)) return false;
      }
      if (selectedGenres.length) {
        const matches = game.genres.some((genre) => selectedGenres.includes(genre));
        if (!matches) return false;
      }
      if (selectedDecade && game.releaseYear) {
        const decade = `${Math.floor(game.releaseYear / 10) * 10}s`;
        if (decade !== selectedDecade) return false;
      }
      if (selectedDecade && !game.releaseYear) {
        return false;
      }
      if (withCoverOnly && !game.coverUrl) return false;
      return true;
    });

    const sorted = [...filtered];
    switch (sortBy) {
      case "newest_delist":
        sorted.sort((a, b) => b.delistDate.localeCompare(a.delistDate));
        break;
      case "oldest_delist":
        sorted.sort((a, b) => a.delistDate.localeCompare(b.delistDate));
        break;
      case "alphabetical":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "highest_rated":
        sorted.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
        break;
      case "newest_release":
        sorted.sort((a, b) => (b.releaseYear ?? -Infinity) - (a.releaseYear ?? -Infinity));
        break;
      case "oldest_release":
        sorted.sort((a, b) => (a.releaseYear ?? Infinity) - (b.releaseYear ?? Infinity));
        break;
    }
    return sorted;
  }, [games, selectedPlatforms, selectedRatings, selectedGenres, selectedDecade, withCoverOnly, sortBy]);

  const visibleGames = filteredGames.slice(0, visibleCount);
  const hasMore = filteredGames.length > visibleGames.length;

  function togglePlatform(name: string) {
    setSelectedPlatforms((current) =>
      current.includes(name) ? current.filter((p) => p !== name) : [...current, name]
    );
  }

  function toggleRating(name: string) {
    setSelectedRatings((current) =>
      current.includes(name) ? current.filter((c) => c !== name) : [...current, name]
    );
  }

  function toggleGenre(name: string) {
    setSelectedGenres((current) =>
      current.includes(name) ? current.filter((g) => g !== name) : [...current, name]
    );
  }

  const activeFilterCount =
    selectedPlatforms.length +
    selectedRatings.length +
    selectedGenres.length +
    (selectedDecade ? 1 : 0) +
    (withCoverOnly ? 1 : 0);

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
              className="mb-4"
            />

            <div className="mb-4 flex items-center justify-between border-b border-dashed border-[color:var(--rule-soft)] pb-2 font-typewriter text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-3)]">
              <span>Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}</span>
              {activeFilterCount > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlatforms([]);
                    setSelectedRatings([]);
                    setSelectedGenres([]);
                    setSelectedDecade("");
                    setWithCoverOnly(false);
                  }}
                  className="text-[color:var(--accent)] underline-offset-2 hover:underline"
                >
                  Clear all
                </button>
              ) : null}
            </div>

            <FacetSection title="By Platform" badge={selectedPlatforms.length}>
              <FacetCheckboxes
                options={facets?.Platform ?? []}
                selected={selectedPlatforms}
                onToggle={togglePlatform}
              />
            </FacetSection>

            <FacetSection title="By Genre" badge={selectedGenres.length}>
              <FacetCheckboxes
                options={facets?.Genre ?? []}
                selected={selectedGenres}
                onToggle={toggleGenre}
              />
            </FacetSection>

            <FacetSection title="By Rating" badge={selectedRatings.length}>
              <FacetCheckboxes
                options={facets?.Rating ?? []}
                selected={selectedRatings}
                onToggle={toggleRating}
              />
            </FacetSection>

            <FacetSection title="By Decade" badge={selectedDecade ? 1 : 0}>
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

            <FacetSection title="Other" badge={withCoverOnly ? 1 : 0}>
              <label className="flex cursor-pointer items-center gap-2 px-2 py-1 font-serif text-sm">
                <input
                  type="checkbox"
                  checked={withCoverOnly}
                  onChange={(event) => setWithCoverOnly(event.target.checked)}
                  className="h-3 w-3 cursor-pointer accent-[color:var(--ink)]"
                />
                <span>Has cover art</span>
              </label>
            </FacetSection>
          </aside>

          <div className="px-6 py-8">
            {/* Sort + count strip */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-[color:var(--rule-soft)] pb-3">
              <p className="font-typewriter text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-3)]">
                {filteredGames.length} record{filteredGames.length === 1 ? "" : "s"}
                {filteredGames.length !== visibleGames.length
                  ? ` · showing ${visibleGames.length}`
                  : ""}
              </p>
              <label className="flex items-center gap-2 font-typewriter text-[10px] uppercase tracking-[0.16em] text-[color:var(--ink-3)]">
                <span>Sort</span>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortKey)}
                  className="border border-[color:var(--ink)] bg-[color:var(--paper)] px-2 py-1 font-serif text-xs normal-case tracking-normal text-[color:var(--ink)] focus:outline-none"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

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
                  No records match these filters. Try widening the platform, genre, rating, or decade.
                </p>
                <SearchFallback query={searchQuery} />
              </>
            ) : (
              <>
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
                      {game.rating != null ? (
                        <p className="mt-2 font-typewriter text-[10px] uppercase tracking-[0.16em] text-[color:var(--ink-3)]">
                          IGDB rating {Math.round(game.rating)} / 100
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

function FacetSection({
  title,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  badge?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="mb-3 border-b border-dashed border-[color:var(--rule-soft)] pb-3 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center justify-between font-typewriter text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-2)] transition-colors hover:text-[color:var(--ink)]"
      >
        <span className="flex items-center gap-2">
          <span>{title}</span>
          {badge ? (
            <span className="border border-[color:var(--accent)] px-1 text-[9px] tracking-[0.14em] text-[color:var(--accent)]">
              {badge}
            </span>
          ) : null}
        </span>
        <span aria-hidden className="text-[color:var(--ink-3)]">
          {open ? "−" : "+"}
        </span>
      </button>
      {open ? <div className="mt-2 space-y-1">{children}</div> : null}
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
