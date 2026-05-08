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

function leadFiledLine(lead: LeadStory) {
  const parts: string[] = [];
  if (lead.reason) parts.push(lead.reason);
  for (const genre of lead.genres.slice(0, 2)) parts.push(genre);
  return parts.length ? `Filed under: ${parts.join(", ")}` : "Filed under: Delisted";
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
        Setting the type…
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-[1280px] px-6 py-16 text-center font-serif italic text-[color:var(--accent)]">
        The press could not run today. {error}
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
                  No further notices today.
                </li>
              )}
            </ul>
          </aside>

          {lead ? (
            <article className="border-b border-[color:var(--rule)] p-6 lg:border-b-0 lg:border-r lg:p-8">
              <p className="font-typewriter text-[10px] uppercase tracking-[0.22em] text-[color:var(--accent)]">
                Lead Obituary · {formatDate(lead.delistDate)}
              </p>
              <h2 className="mt-2 font-display text-3xl font-black leading-tight text-[color:var(--ink)] sm:text-[40px]">
                {lead.title}{" "}
                <span className="font-display italic text-[color:var(--ink-2)]">
                  laid to rest after {lead.releaseYear ? `${new Date(lead.delistDate).getUTCFullYear() - lead.releaseYear} years` : "a long run"} on {lead.platforms[0] ?? "the storefront"}.
                </span>
              </h2>
              <p className="mt-3 font-serif text-sm italic text-[color:var(--ink-2)]">
                The Delisted Desk &nbsp;·&nbsp; {leadFiledLine(lead)}
              </p>

              {lead.coverUrl ? (
                <div className="broadsheet-cover-frame mt-5 aspect-[16/9] w-full">
                  <img src={lead.coverUrl} alt={lead.title} loading="eager" />
                </div>
              ) : (
                <div className="mt-5 flex aspect-[16/9] w-full items-center justify-center border border-[color:var(--ink)] bg-[color:var(--paper-2)] font-typewriter text-[11px] uppercase tracking-[0.2em] text-[color:var(--ink-3)]">
                  Lead Artwork · Pending IGDB Sync
                </div>
              )}
              <p className="mt-1 font-typewriter text-[10px] uppercase tracking-[0.14em] text-[color:var(--ink-3)]">
                Box art via IGDB.
              </p>

              <p className="dropcap lede-2col mt-5 font-serif text-base text-[color:var(--ink-2)]">
                {lead.summary ??
                  `${lead.title} has been removed from sale${
                    lead.platforms.length ? ` on ${lead.platforms.join(", ")}` : ""
                  }${lead.releaseYear ? `, ending an availability streak that began in ${lead.releaseYear}` : ""}. ${
                    lead.reason ?? "No public statement has been issued by the publisher."
                  } Existing owners retain access to the title in their library, but new purchases are no longer possible.`}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-[color:var(--rule-soft)] pt-3 font-typewriter text-[10px] uppercase tracking-[0.16em] text-[color:var(--ink-3)]">
                <Link href={`/games/${lead.slug ?? lead.id}`} className="text-[color:var(--accent)] underline-offset-2 hover:underline">
                  Read full entry →
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
                Awaiting first dispatch
              </p>
              <h2 className="mt-3 font-display text-3xl font-black leading-tight">
                The press is set, but no obituaries have yet been filed.
              </h2>
              <p className="mt-3 font-serif italic text-[color:var(--ink-2)]">
                Add delisting events to the database to begin publication.
              </p>
            </article>
          )}

          <aside className="p-5">
            <p className="font-typewriter text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent)]">
              The Watch List
            </p>
            <p className="mt-1 font-serif text-xs italic text-[color:var(--ink-2)]">
              Titles announced for withdrawal in the coming weeks.
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
                  No titles currently on the watch list.
                </li>
              )}
            </ul>
            <Link
              href="/timeline"
              className="mt-3 inline-block font-typewriter text-[10px] uppercase tracking-[0.18em] text-[color:var(--accent)] underline-offset-2 hover:underline"
            >
              See full calendar →
            </Link>
          </aside>
        </div>

        {/* By the numbers */}
        <div className="grid grid-cols-2 border-t border-double-ink bg-[color:var(--paper-2)] sm:grid-cols-3 lg:grid-cols-5">
          <StatsBlock label="Titles in the ledger" value={data.stats.total.toLocaleString()} />
          <StatsBlock label="Entered this year" value={data.stats.thisYear.toLocaleString()} />
          <StatsBlock label="Upcoming" value={data.stats.upcoming.toLocaleString()} />
          <StatsBlock label="Top cause" value={data.stats.topCause} />
          <StatsBlock label="Most affected" value={data.stats.topPlatform} />
        </div>

        {/* Search bar */}
        <div className="border-t-[3px] border-double border-[color:var(--ink)] px-6 py-5">
          <SearchBar
            placeholder="Search the paper — by title, platform, or genre…"
            onSearch={setSearchQuery}
            initialValue={searchQuery}
          />
        </div>

        {/* Obituaries of note */}
        <div className="border-t border-[color:var(--rule)] px-6 py-8">
          <p className="text-center font-typewriter text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-3)]">
            · Obituaries of Note ·
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
              No matches in this morning&rsquo;s edition.
            </p>
          )}
          <p className="mt-8 text-center font-typewriter text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink-3)]">
            <Link href="/mortuary" className="hover:text-[color:var(--accent)]">
              · Continued in the obituaries section ·
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function StatsBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-[color:var(--rule-soft)] last:border-r-0">
      <StatsCard label={label} value={value} />
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
