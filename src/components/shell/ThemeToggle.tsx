"use client";

import { useTheme } from "@/components/layout/ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      className="chip"
      onClick={toggle}
      aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
      // Label depends on the stored preference, which the server can't know.
      suppressHydrationWarning
    >
      {theme === "light" ? "◐ dark" : "◑ light"}
    </button>
  );
}
