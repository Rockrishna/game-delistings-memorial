import UShell from "@/components/shell/UShell";
import { getTotalCount } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const total = await getTotalCount();
  return (
    <UShell total={total}>
      <div style={{ padding: "32px 36px", maxWidth: 760 }}>
        <div className="strap">ABOUT · IGDB SOURCING</div>
        <h2 className="font-serif" style={{ fontSize: 30, margin: "6px 0 14px", fontWeight: 600 }}>How this catalogue is built</h2>
        <p className="font-serif" style={{ color: "var(--ink-2)", fontSize: 15 }}>
          Every record is sourced from <strong>IGDB</strong>. We index games
          IGDB flags with an <em>offline</em> or <em>delisted</em> status and
          enrich each with cover art, platforms, genres, publisher/developer,
          age ratings, ratings, and official links.
        </p>
        <p className="font-serif" style={{ color: "var(--ink-2)", fontSize: 15, marginTop: 14 }}>
          When IGDB lacks a publisher or developer we fall back to{" "}
          <strong>RAWG</strong> to fill the gap (records note this with an
          <span className="font-mono"> igdb+rawg </span>tag).
        </p>
        <hr className="hr" style={{ margin: "22px 0" }} />
        <p className="font-serif" style={{ color: "var(--ink-2)", fontSize: 15 }}>
          <strong>There are no delisting dates.</strong> IGDB cannot reliably
          say <em>when</em> a title left a storefront, so this product treats
          &ldquo;delisted&rdquo; as a status and focuses on durable attributes
          instead of a timeline. Cite the record, not a moment.
        </p>
        <div className="marginalia" style={{ marginTop: 22, fontSize: 14 }}>
          Metadata via IGDB · publisher/developer fallback via RAWG · no
          delist dates by design.
        </div>
      </div>
    </UShell>
  );
}
