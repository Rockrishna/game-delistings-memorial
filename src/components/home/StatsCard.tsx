interface StatsCardProps {
  label: string;
  value: string | number;
  trend?: "up" | "down";
}

export default function StatsCard({ label, value, trend }: StatsCardProps) {
  return (
    <div className="bg-[#171d2e] border border-[#2a3248] rounded-lg p-6">
      <p className="text-[#95a0c3] text-sm font-medium uppercase tracking-wider mb-2">
        {label}
      </p>
      <div className="flex items-end gap-2">
        <h3 className="text-4xl font-bold text-[#f4f6ff]">{value}</h3>
        {trend && (
          <span
            className={`text-sm font-medium px-2 py-1 rounded ${
              trend === "up"
                ? "bg-green-500/20 text-[#22c55e]"
                : "bg-yellow-500/20 text-[#f59e0b]"
            }`}
          >
            {trend === "up" ? "↑" : "↓"}
          </span>
        )}
      </div>
    </div>
  );
}
