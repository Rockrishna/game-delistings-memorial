import UShell from "@/components/shell/UShell";
import { getTotalCount } from "@/lib/catalog";
import { getIgdbCacheStats } from "@/lib/igdb";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "About the data",
  description:
    "How this catalogue of delisted games is assembled: IGDB as the primary source, RAWG as a fallback, refreshed on a weekly sync.",
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

export default async function AboutPage() {
  const [total, cache] = await Promise.all([getTotalCount(), getIgdbCacheStats()]);

  return (
    <UShell total={total}>
      <div style={{ padding: "32px 36px 8px", maxWidth: 820 }}>
        <div className="strap">ABOUT THE DATA</div>
        <h2 className="font-serif" style={{ fontSize: 34, margin: "6px 0 4px", fontWeight: 600 }}>
          Where the data comes from
        </h2>
        <p className="font-serif" style={{ color: "var(--ink-2)", fontSize: 15, margin: 0 }}>
          A card catalogue of {total.toLocaleString()} games that are no longer
          sold — assembled from public game databases and refreshed
          automatically.
        </p>

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
            and critic ratings, official websites, and the summary text. These
            are the durable attributes you can filter and chart across the rest
            of the site.
          </p>
        </Block>

        <Block strap="FALLBACK SOURCE" title="RAWG">
          <p className="font-serif" style={P}>
            When IGDB is missing a publisher, developer, or Metacritic score for
            a title, we fall back to <strong>RAWG</strong>, another large open
            video-game database, to fill the gap. Records enriched this way are
            tagged <span className="font-mono">igdb+rawg</span> on their card so
            the provenance stays visible.
          </p>
        </Block>

        <Block strap="HOW IT STAYS CURRENT" title="A weekly automated sweep">
          <p className="font-serif" style={P}>
            A scheduled job runs <strong>once a week</strong>. It re-queries
            IGDB for newly delisted or offline titles, adds them to the
            catalogue, and re-enriches existing records — pulling from RAWG
            wherever IGDB still leaves a gap. Every IGDB and RAWG response is
            cached, so the sweep is cheap and never re-bills the source APIs for
            data we already hold.
          </p>
          <p className="font-mono muted" style={{ fontSize: 12, marginTop: 14 }}>
            cached source requests: {cache.totalRequests.toLocaleString()}
            {cache.lastSyncAt ? ` · last refresh ${cache.lastSyncAt.slice(0, 10)}` : ""}
          </p>
        </Block>

        <Block strap="ON ACCURACY" title="What this data can and can&rsquo;t tell you">
          <p className="font-serif" style={P}>
            This catalogue is only as accurate as its upstream sources. IGDB and
            RAWG are community-maintained, so a record may be incomplete, a
            game&rsquo;s status may lag reality, and a title that has since
            returned to sale may still appear here until the next sweep
            corrects it. Treat entries as a well-sourced starting point, not a
            legal or commercial record.
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
          Metadata via IGDB · publisher / developer / Metacritic fallback via
          RAWG · refreshed weekly · a personal, non-commercial preservation
          project.
        </div>
      </div>
    </UShell>
  );
}
