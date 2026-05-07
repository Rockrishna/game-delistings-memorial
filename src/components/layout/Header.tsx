import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#2a3248] bg-[#0f1320]">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="text-xl font-bold text-[#8b5cf6]">🎮</div>
          <span className="text-xl font-bold text-[#f4f6ff]">
            Game Delistings Tracker
          </span>
        </Link>
        <ul className="flex items-center gap-8">
          <li>
            <Link
              href="/"
              className="text-[#c9d0e8] hover:text-[#f4f6ff] transition-colors"
            >
              Home
            </Link>
          </li>
          <li>
            <Link
              href="/timeline"
              className="text-[#c9d0e8] hover:text-[#f4f6ff] transition-colors"
            >
              Timeline
            </Link>
          </li>
          <li>
            <Link
              href="/mortuary"
              className="text-[#c9d0e8] hover:text-[#f4f6ff] transition-colors"
            >
              Mortuary
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
