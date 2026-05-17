"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import CommandSearch from "@/components/shell/CommandSearch";
import ThemeToggle from "@/components/shell/ThemeToggle";

const SURFACES = [
  { key: "overview", num: "01", label: "Overview", href: "/", sub: "the collection" },
  { key: "catalog", num: "02", label: "Catalog", href: "/catalog", sub: "visual db · simple ↔ advanced" },
  { key: "insights", num: "03", label: "Insights", href: "/insights", sub: "patterns of loss" },
  { key: "record", num: "04", label: "Record", href: "/record", sub: "single entry + IGDB" },
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
  const records = total.toLocaleString();

  return (
    <div className="app">
      <div className="topbar">
        <div style={{ display: "flex", gap: 14, alignItems: "baseline", flexWrap: "wrap" }}>
          <h1>Delisted Games Tracker</h1>
          <span className="sub">— a database of withdrawn titles</span>
        </div>
        <div className="meta">4 surfaces · light + dark · metadata via IGDB</div>
      </div>

      <div className="masthead">
        <div>
          <div className="deweystrip">
            CATALOGUE OF DELISTED VIDEO GAMES · vol. iv · {records} records
          </div>
          <h1>Delisted Games Tracker</h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="font-typewriter" style={{ fontSize: 11, letterSpacing: "0.1em", color: "var(--ink-3)" }}>
            metadata via IGDB · RAWG fallback
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 6, justifyContent: "flex-end" }}>
            <CommandSearch />
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="navrow">
        <Link className={active === "overview" ? "on" : ""} href="/">Overview</Link>
        <Link className={active === "catalog" ? "on" : ""} href="/catalog">The Catalog</Link>
        <Link className={active === "insights" ? "on" : ""} href="/insights">Insights</Link>
        <Link className={active === "record" ? "on" : ""} href="/catalog">Record</Link>
        <Link
          className={active === "about" ? "on" : ""}
          href="/about-igdb"
          style={{ marginLeft: "auto", borderRight: 0 }}
        >
          About IGDB sourcing
        </Link>
      </div>

      <div className="body">
        <nav className="pagenav">
          <div className="label">Surface</div>
          {SURFACES.map((s) => (
            <Link
              key={s.key}
              href={s.href}
              className={active === s.key ? "active" : ""}
            >
              <span className="pagenum">{s.num}</span>
              {s.label}
              <span className="sub">{s.sub}</span>
            </Link>
          ))}
        </nav>
        <main className="canvas">{children}</main>
      </div>
    </div>
  );
}
