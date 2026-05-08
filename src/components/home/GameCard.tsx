import Link from "next/link";
import type { PlatformType, StatusType } from "@/components/common/Badge";

interface GameCardProps {
  id: string;
  slug?: string;
  title: string;
  coverUrl?: string;
  platforms: string[];
  platformBadges?: PlatformType[];
  delistDate: string;
  status: StatusType;
  sourceUrl?: string;
  releaseYear?: number | null;
  reason?: string | null;
}

const STATUS_LABEL: Record<StatusType, string> = {
  recent: "Lately Withdrawn",
  upcoming: "Forthcoming",
  delisted: "In Memoriam",
};

export default function GameCard({
  id,
  slug,
  title,
  coverUrl,
  platforms,
  delistDate,
  status,
  releaseYear,
  reason,
}: GameCardProps) {
  const delist = new Date(delistDate);
  const formattedDate = delist.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const dies = delist.getUTCFullYear();
  const dates = releaseYear ? `${releaseYear} — ${dies}` : `d. ${dies}`;

  return (
    <Link
      href={`/games/${slug ?? id}`}
      className="group flex h-full flex-col border border-[color:var(--rule-soft)] bg-[color:var(--paper)] p-4 transition-colors hover:border-[color:var(--ink)]"
    >
      <div className="font-typewriter text-[10px] uppercase tracking-[0.18em] text-[color:var(--accent)]">
        {STATUS_LABEL[status]} · {formattedDate}
      </div>

      <div className="broadsheet-cover-frame mt-3 aspect-[3/4] w-full">
        {coverUrl ? (
          <img src={coverUrl} alt={title} loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-typewriter text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink-3)]">
            No Portrait
          </div>
        )}
      </div>

      <div className="border-double-ink mt-4 px-1 py-2 text-center">
        <h3 className="font-display text-xl font-bold leading-tight text-[color:var(--ink)] group-hover:text-[color:var(--accent)]">
          {title}
        </h3>
        <p className="mt-1 font-serif text-xs italic text-[color:var(--ink-2)]">{dates}</p>
      </div>

      {reason ? (
        <p className="mt-3 line-clamp-3 text-center font-serif text-sm italic text-[color:var(--ink-2)]">
          “{reason}”
        </p>
      ) : null}

      <p className="mt-auto pt-3 text-center font-typewriter text-[10px] uppercase tracking-[0.16em] text-[color:var(--ink-3)]">
        {platforms.join(" · ")}
      </p>
    </Link>
  );
}
