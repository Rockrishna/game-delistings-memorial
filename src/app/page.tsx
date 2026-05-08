"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import StatsCard from "@/components/home/StatsCard";
import GameCard from "@/components/home/GameCard";
import SearchBar from "@/components/common/SearchBar";

type EventCard = {
  id: string;
  slug: string;
  title: string;
  coverUrl?: string;
  platforms: string[];
  platformBadges: Array<"steam" | "playstation" | "xbox" | "nintendo" | "epic" | "default">;
  delistDate: string;
  status: "recent" | "upcoming" | "delisted";
  sourceUrl?: string;
  releaseYear?: number | null;
  reason?: string | null;
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
  releaseYear: number | null;
  reason: string | null;
  sourceUrl: string | null;
};

type HomePayload = {
  stats: {
    recent: number;
    upcoming: number;
    total: number;
    thisYear: number;
    topCause: string;
    topPlatform: string;
    gamesWithMetadata: number;
    platformsTracked: number;
    genresTracked: number;
    igdbRequestsCached: number;
    lastIgdbSyncAt: string | null;
  };
  lead: LeadStory | null;
  recent: EventCard[];
  upcoming: EventCard[];
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

  const filteredRecent = useMemo(() => filterEvents(data?.recent ?? [], searchQuery), [
    data?.recent,
    searchQuery,
  ]);
  const filteredUpcoming = useMemo(() => filterEvents(data?.upcoming ?? [], searchQuery), [
    data?.upcoming,
    searchQuery,
  ]);

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
                    {lead.reason ? (
                      <>
                        <dt className="font-typewriter text-[10px] uppercase tracking-[0.16em] text-[color:var(--ink-3)]">
                          Reason
                        </dt>
                        <dd>{lead.reason}</dd>
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
                    Source ↗
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
                The database is empty. Add delisting events to begin tracking.
              </p>
            </article>
          )}

          <aside className="p-5">
            <p className="font-typewriter text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent)]">
              Upcoming delistings
            </p>
            <ul className="mt-3 space-y-3">
              {filteredUpcoming.slice(0, 5).length ? (
                filteredUpcoming.slice(0, 5).map((game) => (
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
                        {game.platforms.join(" · ")}
                      </p>
                    </div>
                    <div className="border border-[color:var(--accent)] px-2 py-1 text-center">
                      <p className="font-typewriter text-[8px] uppercase tracking-[0.14em] text-[color:var(--accent)]">
                        Days left
                      </p>
                      <p className="font-display text-xl font-bold leading-none text-[color:var(--accent)]">
                        {Math.max(0, game.daysFromNow)}
                      </p>
                    </div>
                  </li>
                ))
              ) : (
                <li className="font-serif text-sm italic text-[color:var(--ink-3)]">
                  No upcoming delistings.
                </li>
              )}
            </ul>
            <Link
              href="/timeline"
              className="mt-3 inline-block font-typewriter text-[10px] uppercase tracking-[0.18em] text-[color:var(--accent)] underline-offset-2 hover:underline"
            >
              View full timeline →
            </Link>
          </aside>
        </div>

        {/* By the numbers — primary catalogue stats */}
        <div className="grid grid-cols-2 border-t border-double-ink bg-[color:var(--paper-2)] sm:grid-cols-3 lg:grid-cols-5">
          <StatsBlock label="Titles in the ledger" value={data.stats.total.toLocaleString()} />
          <StatsBlock label="Entered this year" value={data.stats.thisYear.toLocaleString()} />
          <StatsBlock label="Upcoming" value={data.stats.upcoming.toLocaleString()} />
          <StatsBlock label="Top cause" value={data.stats.topCause} />
          <StatsBlock label="Most affected" value={data.stats.topPlatform} />
        </div>

        {/* IGDB cache & catalogue depth — driven by Postgres-backed request cache */}
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

        {/* Search bar */}
        <div className="border-t-[3px] border-double border-[color:var(--ink)] px-6 py-5">
          <SearchBar
            placeholder="Search by title, platform, or genre…"
            onSearch={setSearchQuery}
            initialValue={searchQuery}
          />
        </div>

        {/* Recently delisted */}
        <div className="border-t border-[color:var(--rule)] px-6 py-8">
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
            <p className="mt-6 text-center font-serif italic text-[color:var(--ink-3)]">
              No delistings match this filter.
            </p>
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
    reason: event.reason ?? null,
    sourceUrl: event.sourceUrl ?? null,
  };
}

function filterEvents<T extends { title: string; platforms: string[]; reason?: string | null }>(
  events: T[],
  query: string
) {
  const normalised = query.trim().toLowerCase();
  if (!normalised) return events;
  return events.filter((event) => {
    if (event.title.toLowerCase().includes(normalised)) return true;
    if (event.platforms.some((platform) => platform.toLowerCase().includes(normalised))) return true;
    if (event.reason && event.reason.toLowerCase().includes(normalised)) return true;
    return false;
  });
}
