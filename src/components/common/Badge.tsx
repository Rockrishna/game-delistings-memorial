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
  recent: "bg-yellow-500/20 text-[#f59e0b] border border-yellow-500/50",
  upcoming: "bg-blue-500/20 text-[#60a5fa] border border-blue-500/50",
  delisted: "bg-red-500/20 text-[#ef4444] border border-red-500/50",
};

const platformColors: Record<PlatformType, string> = {
  steam: "bg-blue-400/20 text-[#66c0f4] border border-blue-400/50",
  playstation: "bg-blue-600/20 text-[#2d6cff] border border-blue-600/50",
  xbox: "bg-green-600/20 text-[#107c10] border border-green-600/50",
  nintendo: "bg-red-600/20 text-[#e60012] border border-red-600/50",
  epic: "bg-gray-300/20 text-[#ffffff] border border-gray-300/50",
  default: "bg-[#2a3248]/20 text-[#95a0c3] border border-[#2a3248]",
};

export default function Badge({ label, variant = "default" }: BadgeProps) {
  const colors =
    statusColors[variant as StatusType] ||
    platformColors[variant as PlatformType] ||
    platformColors.default;

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${colors}`}>
      {label}
    </span>
  );
}
