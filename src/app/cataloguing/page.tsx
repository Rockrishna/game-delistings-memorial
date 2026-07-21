import UShell from "@/components/shell/UShell";
import { getTotalCount } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "How the cataloguing works",
  description:
    "Every record has a call number in the form STORE · YEAR · ID — a cabinet filing scheme you can search by any segment.",
};

const STORE_CODES: Array<[string, string]> = [
  ["STE", "Steam / PC"],
  ["PLA", "PlayStation"],
  ["XBO", "Xbox"],
  ["NIN", "Nintendo"],
  ["IOS", "iOS / App Store"],
  ["AND", "Android"],
  ["EPI", "Epic Games Store"],
  ["GEN", "Other / unclassified"],
];

function Seg({ value, label, note }: { value: string; label: string; note: string }) {
  return (
    <div style={{ border: "1.5px solid var(--ink)", padding: "14px 16px", background: "var(--paper-2)", flex: "1 1 160px" }}>
      <div className="font-mono" style={{ fontSize: 26, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.04em" }}>{value}</div>
      <div className="strap" style={{ marginTop: 8 }}>{label}</div>
      <div className="font-serif" style={{ color: "var(--ink-2)", fontSize: 13, marginTop: 4 }}>{note}</div>
    </div>
  );
}

export default async function CataloguingPage() {
  const total = await getTotalCount();

  return (
    <UShell total={total}>
      <div style={{ padding: "32px 36px 48px", maxWidth: 820 }}>
        <div className="strap">THE CATALOGUE</div>
        <h2 className="font-serif" style={{ fontSize: 34, margin: "6px 0 4px", fontWeight: 600 }}>
          How the call numbers work
        </h2>
        <p className="font-serif" style={{ color: "var(--ink-2)", fontSize: 15, margin: 0, lineHeight: 1.6 }}>
          Every one of the {total.toLocaleString()} records is filed under a
          call number, the way a library card catalogue files a book. It is
          built from three parts — a cabinet, a drawer, and an item — so the
          number itself tells you something about the game.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", margin: "26px 0 18px" }}>
          <Seg value="STE" label="Cabinet · storefront" note="Where it was primarily sold — here, Steam." />
          <span className="font-mono" style={{ fontSize: 24, color: "var(--ink-3)" }}>·</span>
          <Seg value="2014" label="Drawer · release year" note="The year the game first came out." />
          <span className="font-mono" style={{ fontSize: 24, color: "var(--ink-3)" }}>·</span>
          <Seg value="8234" label="Item · catalogue id" note="A permanent, unique number for the record." />
        </div>

        <p className="font-serif" style={{ color: "var(--ink-2)", fontSize: 15, lineHeight: 1.6 }}>
          So <span className="font-mono accent" style={{ fontWeight: 700 }}>STE · 2014 · 8234</span>{" "}
          reads as: a Steam title, released in 2014, filed as item 8234. When
          the release year is unknown the drawer shows <span className="font-mono">----</span>. A game
          sold on several storefronts is filed under one primary cabinet.
        </p>

        <div style={{ padding: "26px 0 4px", borderTop: "1px solid var(--rule)", marginTop: 20 }}>
          <div className="strap">CABINET CODES</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px 24px", marginTop: 14 }}>
            {STORE_CODES.map(([code, name]) => (
              <div key={code} style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <span className="font-mono accent" style={{ fontWeight: 700, fontSize: 15, minWidth: 42 }}>{code}</span>
                <span className="font-serif" style={{ color: "var(--ink-2)", fontSize: 14 }}>{name}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: "26px 0 4px", borderTop: "1px solid var(--rule)", marginTop: 24 }}>
          <div className="strap">SEARCHING BY NUMBER</div>
          <p className="font-serif" style={{ color: "var(--ink-2)", fontSize: 15, lineHeight: 1.6, marginTop: 12 }}>
            You can look a record up by any part of its call number in the{" "}
            <span className="font-mono">⌕</span> search bar. Type a cabinet code
            like <span className="font-mono">STE</span>, a year like{" "}
            <span className="font-mono">2014</span>, or any run of digits like{" "}
            <span className="font-mono">823</span> — a partial number narrows the
            catalogue to the records whose filing number contains it.
          </p>
        </div>
      </div>
    </UShell>
  );
}
