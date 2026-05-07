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
  return (
    <Link href={`/games/${slug ?? id}`}>
      <div className="group bg-[#171d2e] border border-[#2a3248] rounded-lg overflow-hidden hover:border-[#8b5cf6] hover:shadow-lg transition-all cursor-pointer h-full">
        {/* Cover Art */}
        <div className="relative aspect-video bg-[#20283d] overflow-hidden">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#95a0c3]">
              No Image
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div>
            <h3 className="text-[#f4f6ff] font-semibold line-clamp-2 group-hover:text-[#8b5cf6] transition-colors">
              {title}
            </h3>
          </div>

          {/* Platforms */}
          <div className="flex flex-wrap gap-1">
            {platforms.map((platform, index) => (
              <Badge
                key={`${platform}-${index}`}
                label={platform}
                variant={platformBadges?.[index] ?? "default"}
              />
            ))}
          </div>

          {/* Date & Status */}
          <div className="flex items-center justify-between pt-2 border-t border-[#2a3248]">
            <span className="text-xs text-[#95a0c3]">
              {new Date(delistDate).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
            <Badge label={status} variant={status} />
          </div>

          {/* CTA */}
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-[#8b5cf6] hover:text-[#9d74ff] underline"
            >
              View Source
            </a>
          )}
        </div>
      </div>
    </Link>
  );
}
