interface StatsCardProps {
  label: string;
  value: string | number;
  note?: string;
}

export default function StatsCard({ label, value, note }: StatsCardProps) {
  return (
    <div className="px-4 py-4 text-center">
      <p className="font-typewriter text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-3)]">
        {label}
      </p>
      <p className="mt-1 font-display text-3xl font-bold text-[color:var(--ink)]">{value}</p>
      {note ? (
        <p className="mt-1 font-serif text-xs italic text-[color:var(--ink-3)]">{note}</p>
      ) : null}
    </div>
  );
}
