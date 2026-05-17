import Link from "next/link";
import UShell from "@/components/shell/UShell";
import { getCatalog, getTotalCount } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function RecordIndexPage() {
  const [total, sample] = await Promise.all([
    getTotalCount(),
    getCatalog({ sort: "rating", pageSize: 12, page: 1 }),
  ]);

  return (
    <UShell total={total}>
      <div style={{ padding: "24px 28px 8px" }}>
        <div className="strap">RECORD · SINGLE ENTRY</div>
        <h2 className="font-serif" style={{ fontSize: 30, margin: "4px 0", fontWeight: 600 }}>Open a catalogue record</h2>
        <p className="font-serif muted" style={{ fontStyle: "italic", margin: "2px 0 0", fontSize: 13 }}>
          Pick a card below or find one through the catalog. Each record carries
          its IGDB link sheet.
        </p>
      </div>
      <div style={{ padding: "16px 28px 32px", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, rowGap: 18 }}>
        {sample.rows.map((g) => (
          <Link key={g.slug} href={`/record/${g.slug}`} className="indexcard" style={{ padding: 10 }}>
            <div className="deweycall" style={{ fontSize: 9, marginBottom: 6, paddingBottom: 4 }}>{g.callNumber}</div>
            <div className="cover" style={{ aspectRatio: "3/4" }} />
            <div className="font-serif" style={{ fontWeight: 600, fontSize: 13, marginTop: 8, lineHeight: 1.2 }}>{g.title}</div>
            <div className="font-serif muted" style={{ fontStyle: "italic", fontSize: 11, marginTop: 2 }}>
              {g.year ?? "—"} · {g.publisher ?? "Unknown"}
            </div>
          </Link>
        ))}
      </div>
    </UShell>
  );
}
