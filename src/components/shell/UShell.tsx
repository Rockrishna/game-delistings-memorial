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
      <div className="masthead">
        <div>
          <div className="deweystrip">
            CATALOGUE OF DELISTED VIDEO GAMES · vol. iv · {total.toLocaleString()} records
          </div>
          <h1>Delisted Games Tracker</h1>
          <div className="masthead-sub">a database of withdrawn titles</div>
        </div>
      </div>

      <div className="navwrap">
        <nav className="navrow">
          {NAV.map((n) => (
            <Link key={n.key} className={active === n.key ? "on" : ""} href={n.href}>
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

      <main className="canvas">{children}</main>
    </div>
  );
}
