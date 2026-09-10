"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NavSearch from "@/components/shell/NavSearch";
import ThemeToggle from "@/components/shell/ThemeToggle";
import NsfwToggle from "@/components/shell/NsfwToggle";
import EndlessToggle from "@/components/shell/EndlessToggle";
import NavProgress from "@/components/layout/NavProgress";
import SiteFooter from "@/components/shell/SiteFooter";

const NAV = [
  { key: "overview", label: "Overview", href: "/", desc: "The collection at a glance" },
  { key: "catalog", label: "Catalogue", href: "/catalog", desc: "Browse and filter every record" },
  { key: "insights", label: "Insights", href: "/insights", desc: "Charts and patterns in the data" },
  { key: "sorting", label: "Shelf order", href: "/sorting", desc: "A–Z order, and how call numbers are built" },
  { key: "colophon", label: "Colophon", href: "/colophon", desc: "Sources, method, and limits" },
];

function surfaceOf(pathname: string): string {
  // Tested before /catalog because "/colophon" and friends are unrelated
  // surfaces; the catalogue match itself stays exact so a sibling route
  // beginning "/catalog…" can never light up the Catalogue tab.
  if (pathname.startsWith("/colophon") || pathname.startsWith("/about")) {
    return "colophon";
  }
  if (pathname === "/catalog" || pathname.startsWith("/catalog/")) return "catalog";
  if (pathname.startsWith("/insights")) return "insights";
  if (pathname.startsWith("/sorting")) return "sorting";
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
      <NavProgress />
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
        {/* Desktop: full horizontal nav. The theme and endless-scroll toggles
            live here (the menu below carries them on mobile); the
            mature-content control moved into the Catalog filter rail. */}
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
            <EndlessToggle labelled />
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
                <div className="nav-menu-setting">
                  <span className="nav-menu-setting-label">Endless scroll</span>
                  <EndlessToggle />
                </div>
              </div>
            </div>
          </>
        )}

        <NavSearch />
      </div>

      {/* Keyed by route: UShell is the same component on every page, so
          without a key React reuses this <main> node and the canvas entrance
          animation would never replay — pages would hard-swap. The key stays
          stable across query-string changes (filters, paging), so the Catalog
          doesn't re-animate on every filter. */}
      <main id="main" key={pathname} className="canvas">{children}</main>
      <SiteFooter />
    </div>
  );
}
