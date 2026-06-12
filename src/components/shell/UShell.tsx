"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NavSearch from "@/components/shell/NavSearch";
import ThemeToggle from "@/components/shell/ThemeToggle";
import NsfwToggle from "@/components/shell/NsfwToggle";

const NAV = [
  { key: "overview", label: "Overview", href: "/" },
  { key: "catalog", label: "The Catalog", href: "/catalog" },
  { key: "insights", label: "Insights", href: "/insights" },
  { key: "about", label: "About the data", href: "/about-igdb" },
];

function surfaceOf(pathname: string): string {
  if (pathname.startsWith("/catalog")) return "catalog";
  if (pathname.startsWith("/insights")) return "insights";
  if (pathname.startsWith("/about")) return "about";
  if (pathname.startsWith("/record")) return "catalog";
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
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <header className="masthead">
        <div>
          <div className="deweystrip">
            CATALOGUE OF DELISTED VIDEO GAMES · vol. iv · {total.toLocaleString()} records
          </div>
          <h1>Delisted Games Tracker</h1>
          <div className="masthead-sub">a database of withdrawn titles</div>
        </div>
      </header>

      <div className="navwrap">
        <nav className="navrow" aria-label="Primary">
          {NAV.map((n) => (
            <Link
              key={n.key}
              className={active === n.key ? "on" : ""}
              aria-current={active === n.key ? "page" : undefined}
              href={n.href}
            >
              {n.label}
            </Link>
          ))}
          <div className="navrow-actions">
            <NsfwToggle />
            <ThemeToggle />
          </div>
        </nav>
        <NavSearch />
      </div>

      <main id="main" className="canvas">{children}</main>
    </div>
  );
}
