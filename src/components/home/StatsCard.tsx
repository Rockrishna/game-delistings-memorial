interface StatsCardProps {
  label: string;
  value: string | number;
  note?: string;
  accent?: "primary" | "secondary" | "tertiary";
}

const accentClasses = {
  primary: "border-[#d0bcff] text-[#d0bcff]",
  secondary: "border-[#89ceff] text-[#89ceff]",
  tertiary: "border-[#ffb869] text-[#ffb869]",
};

export default function StatsCard({
  label,
  value,
  note,
  accent = "primary",
}: StatsCardProps) {
  return (
    <div className="border border-[#494454] bg-[#211e27] p-5">
      <div className={`mb-3 h-1 w-14 border-b-2 ${accentClasses[accent]}`} />
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[#958ea0]">
        {label}
      </p>
      <h3 className={`font-mono text-4xl font-bold ${accentClasses[accent].split(" ")[1]}`}>{value}</h3>
      {note ? <p className="mt-2 text-xs text-[#cbc3d7]">{note}</p> : null}
    </div>
  );
}
