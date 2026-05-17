"use client";

import { useTheme } from "@/components/layout/ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button className="chip" onClick={toggle} aria-label="Toggle theme">
      {theme === "light" ? "◐ dark" : "◑ light"}
    </button>
  );
}
