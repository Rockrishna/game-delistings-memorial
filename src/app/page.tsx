"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import StatsCard from "@/components/home/StatsCard";
import GameCard from "@/components/home/GameCard";
import SearchBar from "@/components/common/SearchBar";
import SearchFallback from "@/components/common/SearchFallback";
import DateProvenance from "@/components/common/DateProvenance";

type EventCard = {
  id: string;
  slug: string;
  title: string;
  coverUrl?: string;
  platforms: string[];
  platformBadges: Array<"steam" | "playstation" | "xbox" | "nintendo" | "epic" | "default">;
  delistDate: string;
  delistDateSource?: string | null;
  status: "recent" | "upcoming" | "delisted";
  sourceUrl?: string;
  releaseYear?: number | null;
  rating?: number | null;
  daysFromNow: number;
};

type LeadStory = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  coverUrl?: string;
  platforms: string[];
  genres: string[];
  delistDate: string;
  delistDateSource?: string | null;
  releaseYear: number | null;
  sourceUrl: string | null;
  rating: number | null;
};

type HomePayload = {
  stats: {
    total: number;
    recent: number;
    last30Days: number;
    topPlatform: string;
    topGenre: string;
    averageRating: number | null;
    gamesWithMetadata: number;
    platformsTracked: number;
    genresTracked: number;
    igdbRequestsCached: number;
    lastIgdbSyncAt: string | null;
  };
  lead: LeadStory | null;
  recent: EventCard[];
  topRated: EventCard[];
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function HomePage() {
  const [data, setData] = useState<HomePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function run() {
      try {
        setLoading(true);
        const response = await fetch("/api/home", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load front page.");
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

  const filteredRecent = useMemo(
    () => filterEvents(data?.recent ?? [], searchQuery),
    [data?.recent, searchQuery]
  );
  const filteredTopRated = useMemo(
    () => filterEvents(data?.topRated ?? [], searchQuery),
    [data?.topRated, searchQuery]
  );

  if (loading) {
    return (
      <main className="mx-auto max-w-[1280px] px-6 py-16 text-center font-serif italic text-[color:var(--ink-2)]">
        Loading…
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-[1280px] px-6 py-16 text-center font-serif italic text-[color:var(--accent)]">
        Could not load data. {error}
      </main>
    );
  }

  const lead: LeadStory | null =
    data.lead ?? (data.recent[0] ? eventToLead(data.recent[0]) : null);
  const sideObits = data.recent.slice(lead ? 1 : 0, lead ? 5 : 4);
  const featured = filteredRecent.slice(0, 3);

  return (
    <main className="mx-auto max-w-[1280px] bg-[color:var(--paper)] pb-16">
      {/* Hero search — first interactive element after the navbar.
          Uses the page paper as the wrapper so the SearchBar's paper-2
          fill reads against it (the previous version made both the
          wrapper and the input the same tone — the search field
          dissolved into its container). Double-rule top + bottom plus
          the typewriter eyebrow keep it consistent with the rest of
          the broadsheet sections. */}
      <div className="border-x border-[color:var(--ink)] bg-[color:var(--paper)] px-6 py-6">
        <div className="mx-auto max-w-2xl">
          <p className="mb-3 text-center font-typewriter text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-3)]">
            <span className="mr-2 align-middle text-[color:var(--rule)]">—</span>
            Find a delisted game
            <span className="ml-2 align-middle text-[color:var(--rule)]">—</span>
          </p>
          <SearchBar
            placeholder="Search titles, platforms, or genres…"
            onSearch={setSearchQuery}
            initialValue={searchQuery}
          />
        </div>
      </div>

      {/* Sectional rule — separates the hero search from the article grid
          below. Two stacked rules form a thin/thick double line in the
          broadsheet style used between other sections of the page. */}
      <div
        aria-hidden
        className="h-[5px] border-x border-[color:var(--ink)] bg-[color:var(--paper)]"
      >
        <div className="h-px bg-[color:var(--ink)]" />
        <div className="h-px" />
        <div className="h-[2px] bg-[color:var(--ink)]" />
      </div>

      <section className="border-x border-b border-[color:var(--ink)]">
        {/* Above the fold */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_280px]">
          <aside className="border-b border-[color:var(--rule)] p-5 lg:border-b-0 lg:border-r">
            <p className="font-typewriter text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink-3)]">
              Also withdrawn this week
            </p>
            <ul className="mt-3 space-y-3">
              {sideObits.length ? (
                sideObits.map((game, index) => (
                  <li
                    key={game.id}
                    className={
                      index < sideObits.length - 1
                        ? "border-b border-dashed border-[color:var(--rule-soft)] pb-3"
                        : ""
                    }
                  >
                    <Link href={`/games/${game.slug ?? game.id}`} className="block group">
                      <p className="font-display text-base font-bold leading-tight text-[color:var(--ink)] group-hover:text-[color:var(--accent)]">
                        {game.title}
                      </p>
                      <p className="mt-1 font-serif text-xs italic text-[color:var(--ink-3)]">
                        b. {game.releaseYear ?? "—"}, d. {formatShortDate(game.delistDate)}
                      </p>
                      <p className="mt-1 font-typewriter text-[9px] uppercase tracking-[0.16em] text-[color:var(--ink-3)]">
                        {game.platforms.join(" · ")}
                      </p>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="font-serif text-sm italic text-[color:var(--ink-3)]">
                  No additional entries this week.
                </li>
              )}
            </ul>
          </aside>

          {lead ? (
            <article className="border-b border-[color:var(--rule)] p-6 lg:border-b-0 lg:border-r lg:p-8">
              <p className="font-typewriter text-[10px] uppercase tracking-[0.22em] text-[color:var(--accent)]">
                Most recent withdrawal · {formatDate(lead.delistDate)}
              </p>
              <p className="mt-1">
                <DateProvenance source={lead.delistDateSource} variant="full" />
              </p>

              <Link
                href={`/games/${lead.slug ?? lead.id}`}
                className="mt-3 grid gap-5 sm:grid-cols-[180px_1fr] group"
              >
                <div className="broadsheet-cover-frame aspect-[3/4] w-full">
                  {lead.coverUrl ? (
                    <img src={lead.coverUrl} alt={lead.title} loading="eager" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-typewriter text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink-3)]">
                      No cover
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="font-display text-3xl font-bold leading-tight text-[color:var(--ink)] group-hover:text-[color:var(--accent)] sm:text-4xl">
                    {lead.title}
                  </h2>
                  <p className="mt-2 font-serif text-base italic text-[color:var(--ink-2)]">
                    {lead.releaseYear ? `Released ${lead.releaseYear}` : "Release date unknown"}
                    {lead.platforms.length ? ` · ${lead.platforms.join(", ")}` : ""}
                  </p>
                  <dl className="mt-4 grid grid-cols-[100px_1fr] gap-x-3 gap-y-2 font-serif text-sm">
                    <dt className="font-typewriter text-[10px] uppercase tracking-[0.16em] text-[color:var(--ink-3)]">
                      Delisted
                    </dt>
                    <dd>{formatDate(lead.delistDate)}</dd>
                    {lead.rating != null ? (
                      <>
                        <dt className="font-typewriter text-[10px] uppercase tracking-[0.16em] text-[color:var(--ink-3)]">
                          IGDB rating
                        </dt>
                        <dd>{Math.round(lead.rating)} / 100</dd>
                      </>
                    ) : null}
                    {lead.genres.length ? (
                      <>
                        <dt className="font-typewriter text-[10px] uppercase tracking-[0.16em] text-[color:var(--ink-3)]">
                          Genres
                        </dt>
                        <dd>{lead.genres.join(", ")}</dd>
                      </>
                    ) : null}
                  </dl>
                </div>
              </Link>

              <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-[color:var(--rule-soft)] pt-3 font-typewriter text-[10px] uppercase tracking-[0.16em] text-[color:var(--ink-3)]">
                <Link href={`/games/${lead.slug ?? lead.id}`} className="text-[color:var(--accent)] underline-offset-2 hover:underline">
                  View entry →
                </Link>
                {lead.sourceUrl ? (
                  <a
                    href={lead.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[color:var(--ink)]"
                  >
                    IGDB ↗
                  </a>
                ) : null}
              </div>
            </article>
          ) : (
            <article className="border-b border-[color:var(--rule)] p-8 lg:border-b-0 lg:border-r">
              <p className="font-typewriter text-[10px] uppercase tracking-[0.22em] text-[color:var(--accent)]">
                No records yet
              </p>
              <p className="mt-3 font-serif text-base text-[color:var(--ink-2)]">
                The database is empty. Trigger /api/admin/sync to ingest from IGDB.
              </p>
            </article>
          )}

          <aside className="p-5">
            <p className="font-typewriter text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent)]">
              Top rated, delisted
            </p>
            <ul className="mt-3 space-y-3">
              {filteredTopRated.slice(0, 5).length ? (
                filteredTopRated.slice(0, 5).map((game) => (
                  <li
                    key={game.id}
                    className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-dashed border-[color:var(--rule-soft)] pb-3"
                  >
                    <div>
                      <Link
                        href={`/games/${game.slug ?? game.id}`}
                        className="font-display text-sm font-bold leading-tight text-[color:var(--ink)] hover:text-[color:var(--accent)]"
                      >
                        {game.title}
                      </Link>
                      <p className="mt-1 font-typewriter text-[9px] uppercase tracking-[0.16em] text-[color:var(--ink-3)]">
                        {game.platforms.slice(0, 2).join(" · ")}
                      </p>
                    </div>
                    <div className="border border-[color:var(--accent)] px-2 py-1 text-center">
                      <p className="font-typewriter text-[8px] uppercase tracking-[0.14em] text-[color:var(--accent)]">
                        Rating
                      </p>
                      <p className="font-display text-xl font-bold leading-none text-[color:var(--accent)]">
                        {game.rating != null ? Math.round(game.rating) : "—"}
                      </p>
                    </div>
                  </li>
                ))
              ) : (
                <li className="font-serif text-sm italic text-[color:var(--ink-3)]">
                  No rated entries yet.
                </li>
              )}
            </ul>
            <Link
              href="/mortuary"
              className="mt-3 inline-block font-typewriter text-[10px] uppercase tracking-[0.18em] text-[color:var(--accent)] underline-offset-2 hover:underline"
            >
              Browse archive →
            </Link>
          </aside>
        </div>

        {/* By the numbers — primary catalogue stats */}
        <div className="grid grid-cols-2 border-t border-double-ink bg-[color:var(--paper-2)] sm:grid-cols-3 lg:grid-cols-5">
          <StatsBlock label="Titles tracked" value={data.stats.total.toLocaleString()} />
          <StatsBlock
            label="Avg IGDB rating"
            value={data.stats.averageRating != null ? `${data.stats.averageRating} / 100` : "—"}
          />
          <StatsBlock
            label="Last 30 days"
            value={data.stats.last30Days.toLocaleString()}
            note="New delistings"
          />
          <StatsBlock label="Top genre" value={data.stats.topGenre} />
          <StatsBlock label="Most affected" value={data.stats.topPlatform} />
        </div>

        {/* IGDB cache & catalogue depth */}
        <div className="grid grid-cols-2 border-t border-[color:var(--rule)] bg-[color:var(--paper)] sm:grid-cols-4">
          <StatsBlock
            label="Games with IGDB metadata"
            value={data.stats.gamesWithMetadata.toLocaleString()}
            note="Hydrated from cache"
          />
          <StatsBlock
            label="Platforms tracked"
            value={data.stats.platformsTracked.toLocaleString()}
          />
          <StatsBlock
            label="Genres tracked"
            value={data.stats.genresTracked.toLocaleString()}
          />
          <StatsBlock
            label="IGDB requests cached"
            value={data.stats.igdbRequestsCached.toLocaleString()}
            note={
              data.stats.lastIgdbSyncAt
                ? `Last sync ${new Date(data.stats.lastIgdbSyncAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}`
                : undefined
            }
          />
        </div>

        {/* Recently delisted */}
        <div className="border-t-[3px] border-double border-[color:var(--ink)] px-6 py-8">
          <p className="text-center font-typewriter text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-3)]">
            Recently delisted
          </p>
          <hr className="mt-2 border-[color:var(--rule-soft)]" />
          {featured.length ? (
            <div className="mt-6 grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((game, index) => (
                <div
                  key={game.id}
                  className={
                    index < featured.length - 1
                      ? "lg:border-r lg:border-[color:var(--rule)] lg:pr-6"
                      : ""
                  }
                >
                  <GameCard {...game} />
                </div>
              ))}
            </div>
          ) : (
            <>
              <p className="mt-6 text-center font-serif italic text-[color:var(--ink-3)]">
                No delistings match this filter.
              </p>
              <SearchFallback query={searchQuery} />
            </>
          )}
          <p className="mt-8 text-center font-typewriter text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-3)]">
            <Link href="/mortuary" className="hover:text-[color:var(--accent)]">
              View full archive →
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function StatsBlock({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="border-r border-[color:var(--rule-soft)] last:border-r-0">
      <StatsCard label={label} value={value} note={note} />
    </div>
  );
}

function eventToLead(event: EventCard): LeadStory {
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    summary: null,
    coverUrl: event.coverUrl,
    platforms: event.platforms,
    genres: [],
    delistDate: event.delistDate,
    releaseYear: event.releaseYear ?? null,
    sourceUrl: event.sourceUrl ?? null,
    rating: event.rating ?? null,
  };
}

function filterEvents<T extends { title: string; platforms: string[] }>(events: T[], query: string) {
  const normalised = query.trim().toLowerCase();
  if (!normalised) return events;
  return events.filter((event) => {
    if (event.title.toLowerCase().includes(normalised)) return true;
    if (event.platforms.some((platform) => platform.toLowerCase().includes(normalised))) return true;
    return false;
  });
}
