"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/timeline", label: "Timeline" },
  { href: "/mortuary", label: "Mortuary" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-[#494454] bg-[#15121b]/95 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="leading-tight">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[#d0bcff]">
              Delist_Tracker
            </p>
            <p className="text-xs text-[#cbc3d7]">Digital Preservation Console</p>
          </Link>
          <ul className="hidden items-center gap-6 md:flex">
            {NAV_ITEMS.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`border-b-2 pb-1 text-xs font-semibold uppercase tracking-[0.1em] transition-colors ${
                      active
                        ? "border-[#d0bcff] text-[#d0bcff]"
                        : "border-transparent text-[#cbc3d7] hover:text-[#d0bcff]"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="hidden items-center gap-2 rounded border border-[#494454] bg-[#1d1a23] px-3 py-1.5 md:flex">
          <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#cbc3d7]">
            Live Feed
          </span>
        </div>
      </nav>
    </header>
  );
}
