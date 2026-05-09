"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "@/components/layout/ThemeProvider";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/timeline", label: "Timeline" },
  { href: "/mortuary", label: "Archive" },
];

function dateLine(now: Date) {
  return now.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function Header() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    setToday(new Date());
  }, []);

  return (
    <header className="border-b-[3px] border-double border-[color:var(--ink)] bg-[color:var(--paper)]">
      <div className="mx-auto max-w-[1280px] px-6 pt-6">
        <div className="flex items-baseline justify-between border-b border-[color:var(--ink)] pb-2 font-typewriter text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-3)]">
          <span className="hidden sm:block">{today ? dateLine(today) : ""}</span>
          <span className="sm:hidden">Game Delistings Tracker</span>
          <button
            type="button"
            onClick={toggle}
            aria-label="Toggle theme"
            className="border border-[color:var(--rule-soft)] px-2 py-0.5 text-[10px] tracking-[0.18em] text-[color:var(--ink-2)] transition-colors hover:border-[color:var(--ink)] hover:text-[color:var(--ink)]"
          >
            {theme === "dark" ? "☼ Light" : "☾ Dark"}
          </button>
        </div>

        <Link href="/" className="block text-center" aria-label="The Delisted home">
          <h1 className="font-display text-[44px] font-black leading-none tracking-[-0.01em] text-[color:var(--ink)] sm:text-[64px]">
            The Delisted
          </h1>
          <p className="mt-2 font-serif text-base italic text-[color:var(--ink-2)] sm:text-lg">
            Tracking digital games removed from sale, withdrawn, or scheduled for removal.
          </p>
        </Link>
      </div>

      <nav className="border-t border-[color:var(--rule)] bg-[color:var(--paper-2)]">
        <ul className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-center gap-x-9 gap-y-2 px-6 py-4 font-serif text-[15px] uppercase tracking-[0.18em] sm:text-[16px]">
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`pb-1 transition-colors ${
                    active
                      ? "border-b-2 border-[color:var(--accent)] font-bold text-[color:var(--accent)]"
                      : "text-[color:var(--ink-2)] hover:text-[color:var(--accent)]"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
