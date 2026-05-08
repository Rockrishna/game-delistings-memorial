"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "@/components/layout/ThemeProvider";

const NAV_ITEMS = [
  { href: "/", label: "Front Page" },
  { href: "/timeline", label: "This Week" },
  { href: "/mortuary", label: "Obituaries" },
];

const VOLUME_EPOCH = new Date("2024-01-01");

function dateLine(now: Date) {
  return now.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function volumeAndIssue(now: Date) {
  const yearsSinceEpoch = now.getUTCFullYear() - VOLUME_EPOCH.getUTCFullYear();
  const startOfYear = Date.UTC(now.getUTCFullYear(), 0, 1);
  const dayOfYear = Math.floor((now.getTime() - startOfYear) / 86_400_000) + 1;
  const volume = ["i", "ii", "iii", "iv", "v", "vi", "vii"][yearsSinceEpoch] ?? "i";
  return { volume, issue: dayOfYear };
}

export default function Header() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    setToday(new Date());
  }, []);

  const { volume, issue } = today ? volumeAndIssue(today) : { volume: "i", issue: 1 };

  return (
    <header className="border-b-[3px] border-double border-[color:var(--ink)] bg-[color:var(--paper)]">
      <div className="mx-auto max-w-[1280px] px-6 pt-6">
        <div className="flex items-baseline justify-between border-b border-[color:var(--ink)] pb-2 font-typewriter text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-3)]">
          <span>Vol. {volume} · No. {issue}</span>
          <span className="hidden sm:block">{today ? dateLine(today) : "Daily edition"}</span>
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
            A daily record of digital games removed from sale, withdrawn, or about to vanish.
          </p>
        </Link>
      </div>

      <nav className="border-t border-[color:var(--rule)] bg-[color:var(--paper-2)]">
        <ul className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-center gap-x-7 gap-y-2 px-6 py-2 font-serif text-[13px] uppercase tracking-[0.16em]">
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`pb-0.5 transition-colors ${
                    active
                      ? "font-bold text-[color:var(--accent)]"
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
