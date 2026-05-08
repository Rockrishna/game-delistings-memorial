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

const baseChip =
  "inline-flex items-center font-typewriter text-[10px] uppercase tracking-[0.12em] px-2 py-[3px] border";

const statusVariants: Record<StatusType, string> = {
  recent: `${baseChip} border-[color:var(--ink)] text-[color:var(--ink)] bg-[color:var(--paper)]`,
  upcoming: `${baseChip} border-[color:var(--accent)] text-[color:var(--accent)] bg-[color:var(--paper)]`,
  delisted: `${baseChip} border-[color:var(--ink)] text-[color:var(--paper)] bg-[color:var(--ink)]`,
};

const platformVariants: Record<PlatformType, string> = {
  steam: `${baseChip} border-[color:var(--rule-soft)] text-[color:var(--ink-2)]`,
  playstation: `${baseChip} border-[color:var(--rule-soft)] text-[color:var(--ink-2)]`,
  xbox: `${baseChip} border-[color:var(--rule-soft)] text-[color:var(--ink-2)]`,
  nintendo: `${baseChip} border-[color:var(--rule-soft)] text-[color:var(--ink-2)]`,
  epic: `${baseChip} border-[color:var(--rule-soft)] text-[color:var(--ink-2)]`,
  default: `${baseChip} border-[color:var(--rule-soft)] text-[color:var(--ink-2)]`,
};

export default function Badge({ label, variant = "default" }: BadgeProps) {
  const className =
    statusVariants[variant as StatusType] ??
    platformVariants[variant as PlatformType] ??
    platformVariants.default;
  return <span className={className}>{label}</span>;
}
