"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import CommandSearch from "@/components/shell/CommandSearch";
import ThemeToggle from "@/components/shell/ThemeToggle";

const NAV = [
  { key: "overview", label: "Overview", href: "/" },
  { key: "catalog", label: "The Catalog", href: "/catalog" },
  { key: "insights", label: "Insights", href: "/insights" },
  { key: "record", label: "Record", href: "/record" },
];

function surfaceOf(pathname: string): string {
  if (pathname.startsWith("/catalog")) return "catalog";
  if (pathname.startsWith("/insights")) return "insights";
  if (pathname.startsWith("/record")) return "record";
  if (pathname.startsWith("/about")) return "about";
  return "overview";
}

export default function UShell({
  total,
  children,
}: {
  total: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "/";
  const active = surfaceOf(pathname);

  return (
    <div className="app">
      <div className="masthead">
        <div>
          <div className="deweystrip">
            CATALOGUE OF DELISTED VIDEO GAMES · vol. iv · {total.toLocaleString()} records
          </div>
          <h1>Delisted Games Tracker</h1>
          <div className="masthead-sub">a database of withdrawn titles · metadata via IGDB · RAWG fallback</div>
        </div>
        <div className="masthead-actions">
          <CommandSearch />
          <ThemeToggle />
        </div>
      </div>

      <nav className="navrow">
        {NAV.map((n) => (
          <Link key={n.key} className={active === n.key ? "on" : ""} href={n.href}>
            {n.label}
          </Link>
        ))}
        <Link
          className={`navrow-end ${active === "about" ? "on" : ""}`}
          href="/about-igdb"
        >
          About IGDB sourcing
        </Link>
      </nav>

      <main className="canvas">{children}</main>
    </div>
  );
}
