import Link from "next/link";
import UShell from "@/components/shell/UShell";
import { getTotalCount, getLastSyncedAt } from "@/lib/catalog";
import { getIgdbCacheStats } from "@/lib/igdb";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Colophon",
  description:
    "How this catalogue of delisted games is made: IGDB as the primary source, RAWG for cross-links and gap-filling, refreshed every two months. A personal, non-commercial project.",
};

function Block({ strap, title, children }: { strap: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "26px 0", borderTop: "1px solid var(--rule)" }}>
      <div className="strap">{strap}</div>
      <h3 className="font-serif" style={{ fontSize: 22, fontWeight: 600, margin: "4px 0 12px" }}>{title}</h3>
      {children}
    </div>
  );
}

const P: React.CSSProperties = { color: "var(--ink-2)", fontSize: 15, lineHeight: 1.6, marginTop: 12 };

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function ColophonPage() {
  const [total, cache, lastSyncedAt] = await Promise.all([
    getTotalCount(),
    getIgdbCacheStats(),
    getLastSyncedAt(),
  ]);

  return (
    <UShell total={total}>
      <div style={{ padding: "32px 36px 8px", maxWidth: 820 }}>
        <div className="strap">COLOPHON</div>
        <h2 className="font-serif" style={{ fontSize: 34, margin: "6px 0 4px", fontWeight: 600 }}>
          How this catalogue is made
        </h2>
        <p className="font-serif" style={{ color: "var(--ink-2)", fontSize: 15, margin: 0, lineHeight: 1.6 }}>
          A catalogue of {total.toLocaleString()} games that are no longer sold —
          assembled from public game databases, filed under a{" "}
          <Link href="/cataloguing" className="accent">cabinet call number</Link>, and refreshed automatically.
        </p>

        {/* When records were last written from the source APIs. */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "baseline",
            flexWrap: "wrap",
            gap: "4px 12px",
            border: "1.5px solid var(--ink)",
            background: "var(--paper-2)",
            padding: "10px 16px",
            marginTop: 18,
          }}
        >
          <span className="strap">DATABASE LAST UPDATED</span>
          <span className="font-mono" style={{ fontSize: 16, fontWeight: 700 }}>
            {fmtDate(lastSyncedAt)}
          </span>
        </div>

        <Block strap="PRIMARY SOURCE" title="IGDB (Internet Game Database)">
          <p className="font-serif" style={P}>
            Every record begins with <strong>IGDB</strong>, the games database
            maintained by Twitch/Amazon. We query IGDB for titles whose status
            field is flagged <em>offline</em> or <em>delisted</em> — IGDB&rsquo;s
            way of marking a game that is no longer available for purchase — and
            file each one as a card in this catalogue.
          </p>
          <p className="font-serif" style={P}>
            From IGDB we capture cover art, release date, platforms/storefronts,
            genres, themes, game modes, player perspective, franchise, the
            publisher and developer, age ratings, IGDB&rsquo;s aggregate user
            and critic ratings, official websites, and the summary text. IGDB is
            treated as authoritative for publisher and developer.
          </p>
        </Block>

        <Block strap="SECONDARY SOURCE" title="RAWG">
          <p className="font-serif" style={P}>
            Each record is also matched against <strong>RAWG</strong>, another
            large open video-game database, for two things: to <strong>fill
            gaps</strong> IGDB leaves (a missing publisher, developer, or
            Metacritic score), and to <strong>add cross-links</strong> — a link
            to the game&rsquo;s RAWG page plus external links it lists, such as
            store pages, the official site, Reddit, and Metacritic. Records whose
            publisher or developer was filled from RAWG are tagged{" "}
            <span className="font-mono">igdb+rawg</span> so the provenance stays
            visible.
          </p>
          <p className="font-serif" style={P}>
            RAWG matches are made strictly — only an exact title match is
            accepted — so an unrelated game can never be credited to the wrong
            studio. When no confident match exists, the field is simply left
            blank rather than guessed.
          </p>
        </Block>

        <Block strap="HOW IT STAYS CURRENT" title="An automated sweep every two months">
          <p className="font-serif" style={P}>
            A scheduled job runs <strong>every two months</strong>. It re-queries
            IGDB for newly delisted or offline titles, adds them to the
            catalogue, and re-checks existing records — pulling from RAWG
            wherever IGDB leaves a gap. Games aren&rsquo;t delisted often, so a
            bimonthly cadence keeps the catalogue current without churn. Every
            IGDB and RAWG response is cached, so the sweep is cheap and rarely
            re-bills the source APIs.
          </p>
          <p className="font-mono muted" style={{ fontSize: 12, marginTop: 14 }}>
            records last written to the database {fmtDate(lastSyncedAt)}
            {cache.lastSyncAt ? ` · most recent source API call ${cache.lastSyncAt.slice(0, 10)}` : ""}
            {` · cached source requests ${cache.totalRequests.toLocaleString()}`}
          </p>
        </Block>

        <Block strap="ON ACCURACY" title="What this data can and can&rsquo;t tell you">
          <p className="font-serif" style={P}>
            This catalogue is only as accurate as its upstream sources. IGDB and
            RAWG are community-maintained, so a record may be incomplete, a
            game&rsquo;s status may lag reality, and a title that has since
            returned to sale may still appear here until the next sweep corrects
            it. Some fields are intentionally left blank rather than filled with
            a low-confidence guess. Treat entries as a well-sourced starting
            point, not a legal or commercial record.
          </p>
          <p className="font-serif" style={P}>
            We deliberately do <strong>not</strong> claim a specific delisting
            date for each game. Reliable, sourced removal dates simply don&rsquo;t
            exist across a catalogue this size, so the site treats
            &ldquo;delisted&rdquo; as a status and focuses on the attributes that
            are dependable instead.
          </p>
        </Block>

        <Block strap="ABOUT THIS PROJECT" title="A personal, non-commercial project">
          <p className="font-serif" style={P}>
            This is a personal hobby project built for preservation and
            curiosity. It is <strong>not affiliated with, endorsed by, or
            sponsored by</strong> IGDB, RAWG, Twitch, Amazon, or any game
            publisher, developer, or storefront. It is non-commercial: nothing
            here is for sale and there is no advertising.
          </p>
          <p className="font-serif" style={P}>
            All game metadata, cover art, and trademarks remain the property of
            their respective owners and are shown here for informational and
            archival purposes. Data is provided by IGDB and RAWG under their
            respective API terms. If you represent a rights holder and would
            like a record amended or removed, please get in touch.
          </p>
        </Block>

        <div className="marginalia" style={{ margin: "24px 0 40px", fontSize: 14 }}>
          Metadata via IGDB · cross-links &amp; gap-filling via RAWG · refreshed
          every two months · a personal, non-commercial preservation project.
        </div>
      </div>
    </UShell>
  );
}
