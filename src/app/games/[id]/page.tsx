import Link from "next/link";
import { notFound } from "next/navigation";
import { getGameDetailById } from "@/lib/data";

function formatLong(value?: string) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = await getGameDetailById(id);
  if (!game) notFound();

  const released = formatLong(game.releaseDate);
  const delisted = formatLong(game.delistDate);
  const releaseYear = game.releaseDate ? new Date(game.releaseDate).getUTCFullYear() : null;
  const delistYear = game.delistDate ? new Date(game.delistDate).getUTCFullYear() : null;

  return (
    <main className="mx-auto max-w-[1080px] bg-[color:var(--paper)] pb-16">
      <article className="border-x border-b border-[color:var(--ink)]">
        <header className="border-b-[3px] border-double border-[color:var(--ink)] px-8 py-10 text-center">
          <p className="font-typewriter text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-3)]">
            Game record
          </p>
          <h1 className="mt-4 font-display text-5xl font-black leading-tight sm:text-6xl">
            {game.title}
          </h1>
          {releaseYear || delistYear ? (
            <p className="mt-3 font-serif text-lg italic text-[color:var(--ink-2)]">
              Released {releaseYear ?? "—"} · Delisted {delistYear ?? "—"}
            </p>
          ) : null}
        </header>

        <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
          <aside className="border-b border-[color:var(--rule)] p-6 lg:border-b-0 lg:border-r">
            <div className="broadsheet-cover-frame aspect-[3/4] w-full">
              {game.coverUrl ? (
                <img src={game.coverUrl} alt={game.title} />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-typewriter text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-3)]">
                  No Cover
                </div>
              )}
            </div>
            <p className="mt-1 font-typewriter text-[9px] uppercase tracking-[0.16em] text-[color:var(--ink-3)]">
              Box art via IGDB
            </p>

            <dl className="mt-6 space-y-3 font-serif text-sm">
              <DefinitionRow label="Status" value={game.status} mono />
              <DefinitionRow label="Released" value={released ?? "Unknown"} />
              <DefinitionRow label="Delisted" value={delisted ?? "Not scheduled"} />
              <DefinitionRow label="Platforms" value={game.platforms.join(", ") || "—"} />
              <DefinitionRow label="Genres" value={game.genres.join(", ") || "—"} />
            </dl>

            {game.sourceUrl ? (
              <a
                href={game.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-block font-typewriter text-[10px] uppercase tracking-[0.18em] text-[color:var(--accent)] underline-offset-2 hover:underline"
              >
                Source notice ↗
              </a>
            ) : null}
          </aside>

          <div className="px-8 py-10">
            <div className="space-y-7">
              {game.summary ? (
                <section>
                  <p className="font-typewriter text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-3)]">
                    Description (via IGDB)
                  </p>
                  <p className="mt-2 font-serif text-base text-[color:var(--ink-2)] sm:text-[17px]">
                    {game.summary}
                  </p>
                </section>
              ) : null}

              {game.reason ? (
                <section className="border-l-2 border-[color:var(--accent)] pl-4">
                  <p className="font-typewriter text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent)]">
                    Reason for delisting
                  </p>
                  <p className="mt-1 font-display text-xl font-bold leading-snug">
                    {game.reason}
                  </p>
                </section>
              ) : null}

              <section>
                <p className="font-typewriter text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink-3)]">
                  Genres
                </p>
                <p className="mt-2 font-serif text-base text-[color:var(--ink-2)]">
                  {game.genres.length ? game.genres.join(", ") : "Not classified"}
                </p>
              </section>

              <section>
                <p className="font-typewriter text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink-3)]">
                  Platforms
                </p>
                <p className="mt-2 font-serif text-base text-[color:var(--ink-2)]">
                  {game.platforms.length ? game.platforms.join(", ") : "—"}
                </p>
              </section>

              <nav className="flex flex-wrap items-center gap-4 border-t border-[color:var(--rule)] pt-5 font-typewriter text-[10px] uppercase tracking-[0.18em]">
                <Link href="/" className="text-[color:var(--ink-2)] hover:text-[color:var(--accent)]">
                  ← Home
                </Link>
                <Link
                  href="/timeline"
                  className="text-[color:var(--ink-2)] hover:text-[color:var(--accent)]"
                >
                  Timeline
                </Link>
                <Link
                  href="/mortuary"
                  className="text-[color:var(--ink-2)] hover:text-[color:var(--accent)]"
                >
                  Archive
                </Link>
              </nav>
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}

function DefinitionRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-baseline gap-3 border-b border-dashed border-[color:var(--rule-soft)] pb-2">
      <dt className="font-typewriter text-[9px] uppercase tracking-[0.18em] text-[color:var(--ink-3)]">
        {label}
      </dt>
      <dd className={mono ? "font-typewriter text-sm uppercase tracking-[0.12em]" : "font-serif text-[color:var(--ink-2)]"}>
        {value}
      </dd>
    </div>
  );
}
