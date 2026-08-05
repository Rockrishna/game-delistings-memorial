"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NavSearch from "@/components/shell/NavSearch";
import ThemeToggle from "@/components/shell/ThemeToggle";
import NsfwToggle from "@/components/shell/NsfwToggle";

const NAV = [
  { key: "overview", label: "Overview", href: "/", desc: "The collection at a glance" },
  { key: "catalog", label: "The Catalog", href: "/catalog", desc: "Browse & filter every record" },
  { key: "insights", label: "Insights", href: "/insights", desc: "Charts & patterns in the data" },
  { key: "colophon", label: "Colophon", href: "/colophon", desc: "How it's made, sources & disclaimer" },
];

function surfaceOf(pathname: string): string {
  if (pathname.startsWith("/catalog")) return "catalog";
  if (pathname.startsWith("/insights")) return "insights";
  // The explainer pages (call numbers, shelf order) belong to the same
  // "how this catalogue works" surface as the Colophon, which links to both —
  // otherwise they'd leave Overview marked as the current page.
  if (
    pathname.startsWith("/colophon") ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/cataloguing") ||
    pathname.startsWith("/sorting")
  ) {
    return "colophon";
  }
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
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu whenever the route changes (a link was followed).
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Escape closes the menu; lock body scroll while it's open.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div className="app">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <header className="masthead">
        {/* The whole title block returns to the overview — the primary "home"
            affordance on mobile, where there's no persistent Overview link. */}
        <Link href="/" className="masthead-home" aria-label="Delisted Games Tracker — back to the overview">
          <h1>Delisted Games Tracker</h1>
          <div className="masthead-sub">{total.toLocaleString()} games no longer sold</div>
        </Link>
      </header>

      <div className="navwrap">
        {/* Desktop: full horizontal nav. Only the theme toggle lives here now;
            the mature-content control moved into the Catalog filter rail. */}
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
            <ThemeToggle />
          </div>
        </nav>

        {/* Mobile: a single bar showing the current surface + a menu button. */}
        <div className="navbar-mobile">
          <span className="navbar-mobile-current" aria-hidden="true">
            {NAV.find((n) => n.key === active)?.label ?? "Menu"}
          </span>
          <button
            type="button"
            className="nav-menu-btn"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="nav-menu-glyph" aria-hidden="true">
              {menuOpen ? "✕" : "☰"}
            </span>
            {menuOpen ? "Close" : "Menu"}
          </button>
        </div>

        {menuOpen && (
          <>
            <div
              className="nav-menu-backdrop"
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />
            <div id="mobile-menu" className="nav-menu" role="dialog" aria-label="Site menu">
              <nav aria-label="Primary">
                {NAV.map((n) => (
                  <Link
                    key={n.key}
                    className={`nav-menu-link${active === n.key ? " on" : ""}`}
                    aria-current={active === n.key ? "page" : undefined}
                    href={n.href}
                    onClick={() => setMenuOpen(false)}
                  >
                    <span className="nav-menu-link-label">{n.label}</span>
                    <span className="nav-menu-link-desc">{n.desc}</span>
                  </Link>
                ))}
              </nav>
              <div className="nav-menu-settings">
                <div className="strap">Settings</div>
                <div className="nav-menu-setting">
                  <span className="nav-menu-setting-label">Theme</span>
                  <ThemeToggle />
                </div>
                <div className="nav-menu-setting">
                  <span className="nav-menu-setting-label">Mature content</span>
                  <NsfwToggle />
                </div>
              </div>
            </div>
          </>
        )}

        <NavSearch />
      </div>

      <main id="main" className="canvas">{children}</main>
    </div>
  );
}
