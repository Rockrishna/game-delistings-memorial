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
            Section A · Full Obituary
          </p>
          <h1 className="mt-4 font-display text-5xl font-black leading-tight sm:text-6xl">
            {game.title}
          </h1>
          {releaseYear && delistYear ? (
            <p className="mt-3 font-serif text-lg italic text-[color:var(--ink-2)]">
              {releaseYear} — {delistYear}
            </p>
          ) : null}
          <p className="mx-auto mt-4 max-w-xl border-y border-[color:var(--rule)] py-3 font-serif text-base italic text-[color:var(--ink-2)]">
            {game.platforms.length ? `Of ${game.platforms.join(", ")}.` : "Of digital storefront."}
          </p>
        </header>

        <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
          <aside className="border-b border-[color:var(--rule)] p-6 lg:border-b-0 lg:border-r">
            <div className="broadsheet-cover-frame aspect-[3/4] w-full">
              {game.coverUrl ? (
                <img src={game.coverUrl} alt={game.title} />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-typewriter text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-3)]">
                  Portrait pending
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
              <section>
                <p className="font-typewriter text-[10px] uppercase tracking-[0.22em] text-[color:var(--accent)]">
                  In remembrance
                </p>
                <p className="dropcap mt-2 font-serif text-base text-[color:var(--ink-2)] sm:text-[17px]">
                  {game.summary ??
                    `${game.title} has been removed from sale${
                      game.platforms.length ? ` on ${game.platforms.join(", ")}` : ""
                    }${
                      releaseYear ? `, ending an availability streak that began in ${releaseYear}` : ""
                    }. ${
                      game.reason ??
                      "No public statement has been issued by the publisher regarding this withdrawal."
                    } Existing owners retain access to the title in their library, but new purchases are no longer possible.`}
                </p>
              </section>

              {game.reason ? (
                <section className="border-l-2 border-[color:var(--accent)] pl-4">
                  <p className="font-typewriter text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent)]">
                    Cause
                  </p>
                  <p className="mt-1 font-display text-xl font-bold leading-snug">
                    {game.reason}
                  </p>
                </section>
              ) : null}

              <section>
                <p className="font-typewriter text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink-3)]">
                  Service
                </p>
                <blockquote className="mt-2 border-y border-[color:var(--rule)] py-4 text-center font-display text-2xl italic leading-snug text-[color:var(--ink)]">
                  &ldquo;{game.title} ceased trading{delistYear ? ` in ${delistYear}` : ""}.&rdquo;
                </blockquote>
                <p className="mt-2 text-right font-typewriter text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-3)]">
                  — The Delisted Desk
                </p>
              </section>

              <section className="border-t border-[color:var(--rule)] pt-5">
                <p className="font-typewriter text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink-3)]">
                  Survived by
                </p>
                <p className="mt-2 font-serif text-base text-[color:var(--ink-2)]">
                  {game.platforms.length ? (
                    <>
                      Players who own the title in their {game.platforms.join(" / ")} library.
                    </>
                  ) : (
                    <>Existing owners on prior storefronts.</>
                  )}
                </p>
              </section>

              <nav className="flex flex-wrap items-center gap-4 border-t border-[color:var(--rule)] pt-5 font-typewriter text-[10px] uppercase tracking-[0.18em]">
                <Link href="/" className="text-[color:var(--ink-2)] hover:text-[color:var(--accent)]">
                  ← Front Page
                </Link>
                <Link
                  href="/timeline"
                  className="text-[color:var(--ink-2)] hover:text-[color:var(--accent)]"
                >
                  This Week
                </Link>
                <Link
                  href="/mortuary"
                  className="text-[color:var(--ink-2)] hover:text-[color:var(--accent)]"
                >
                  Obituaries
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
