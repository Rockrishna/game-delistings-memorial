import Badge from "@/components/common/Badge";
import type { PlatformType, StatusType } from "@/components/common/Badge";
import Link from "next/link";

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
}

export default function GameCard({
  id,
  slug,
  title,
  coverUrl,
  platforms,
  platformBadges,
  delistDate,
  status,
  sourceUrl,
}: GameCardProps) {
  const formattedDate = new Date(delistDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Link href={`/games/${slug ?? id}`}>
      <div className="group flex h-full cursor-pointer flex-col overflow-hidden border border-[#494454] bg-[#211e27] transition-colors hover:border-[#d0bcff]">
        <div className="relative aspect-video overflow-hidden bg-[#2c2832]">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={title}
              className="h-full w-full object-cover grayscale transition-all duration-500 group-hover:scale-[1.03] group-hover:grayscale-0"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#958ea0]">
              No Image
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 text-base font-semibold text-[#e7e0ed] transition-colors group-hover:text-[#d0bcff]">
              {title}
            </h3>
            <Badge label={status} variant={status} />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {platforms.map((platform, index) => (
              <Badge
                key={`${platform}-${index}`}
                label={platform}
                variant={platformBadges?.[index] ?? "default"}
              />
            ))}
          </div>

          <div className="mt-auto flex items-center justify-between border-t border-[#494454] pt-3">
            <span className="font-mono text-xs uppercase tracking-[0.06em] text-[#958ea0]">
              {formattedDate}
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#d0bcff]">
              View Details
            </span>
          </div>

          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs uppercase tracking-[0.06em] text-[#89ceff] underline-offset-2 hover:underline"
            >
              View Source
            </a>
          )}
        </div>
      </div>
    </Link>
  );
}
