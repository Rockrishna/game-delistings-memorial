import Link from "next/link";

/**
 * Closes every page. Without it the short surfaces (a filtered catalogue, a
 * sparse record) just stop, leaving a tall band of empty paper under the last
 * element; the footer gives the page a bottom edge and repeats the two things
 * a reader is most likely to want next — the explainers and the sources.
 */
const COLUMNS: Array<{ heading: string; links: Array<{ label: string; href: string }> }> = [
  {
    heading: "Browse",
    links: [
      { label: "Overview", href: "/" },
      { label: "The catalogue", href: "/catalog" },
      { label: "Insights", href: "/insights" },
    ],
  },
  {
    heading: "How it works",
    links: [
      { label: "Call numbers", href: "/cataloguing" },
      { label: "Shelf order", href: "/sorting" },
      { label: "Sources and method", href: "/colophon" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="sitefoot">
      <div className="sitefoot-inner">
        <div className="sitefoot-about">
          <div className="strap">Delisted Games Tracker</div>
          <p className="font-serif">
            A catalogue of games that are no longer sold on major digital
            storefronts, built from public game databases and refreshed on a
            schedule.
          </p>
        </div>

        {COLUMNS.map((col) => (
          <nav key={col.heading} aria-label={col.heading}>
            <div className="strap">{col.heading}</div>
            <ul>
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div>
          <div className="strap">Sources</div>
          <ul>
            <li>
              <a href="https://www.igdb.com" target="_blank" rel="noreferrer">
                IGDB ↗
              </a>
            </li>
            <li>
              <a href="https://rawg.io" target="_blank" rel="noreferrer">
                RAWG ↗
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="sitefoot-note font-serif">
        A personal, non-commercial project. Not affiliated with IGDB, RAWG, or
        any publisher or storefront; game metadata and cover art belong to their
        owners.
      </div>
    </footer>
  );
}
