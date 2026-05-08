export type StatusType = "recent" | "upcoming" | "delisted";
export type PlatformType =
  | "steam"
  | "playstation"
  | "xbox"
  | "nintendo"
  | "epic"
  | "default";

interface BadgeProps {
  label: string;
  variant?: StatusType | PlatformType | "default";
}

const statusColors: Record<StatusType, string> = {
  recent: "bg-emerald-500/15 text-[#6ee7b7] border border-emerald-500/40",
  upcoming: "bg-amber-500/15 text-[#fbbf24] border border-amber-500/40",
  delisted: "bg-red-500/15 text-[#f87171] border border-red-500/40",
};

const platformColors: Record<PlatformType, string> = {
  steam: "bg-[#66c0f4]/10 text-[#66c0f4] border border-[#66c0f4]/40",
  playstation: "bg-[#2d6cff]/10 text-[#79a1ff] border border-[#2d6cff]/45",
  xbox: "bg-[#107c10]/15 text-[#63d263] border border-[#107c10]/50",
  nintendo: "bg-[#e60012]/10 text-[#ff7079] border border-[#e60012]/45",
  epic: "bg-white/10 text-[#f4f6ff] border border-white/30",
  default: "bg-[#211e27] text-[#cbc3d7] border border-[#494454]",
};

export default function Badge({ label, variant = "default" }: BadgeProps) {
  const colors =
    statusColors[variant as StatusType] ||
    platformColors[variant as PlatformType] ||
    platformColors.default;

  return (
    <span
      className={`inline-block rounded px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] ${colors}`}
    >
      {label}
    </span>
  );
}
