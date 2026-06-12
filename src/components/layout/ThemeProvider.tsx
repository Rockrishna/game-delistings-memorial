"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "delisted-theme";

// Resolution order (must match the pre-paint script in layout.tsx):
// explicit stored choice → OS/browser preference → light.
function resolveTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    /* ignore storage errors */
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function hasStoredChoice(): boolean {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "dark" || stored === "light";
  } catch {
    return false;
  }
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(resolveTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Until the visitor picks a theme explicitly, follow live OS changes.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    function onChange(e: MediaQueryListEvent) {
      if (!hasStoredChoice()) setTheme(e.matches ? "dark" : "light");
    }
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === "light" ? "dark" : "light";
      document.documentElement.dataset.theme = next;
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore storage errors */
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return { theme: "light" as Theme, toggle: () => {} };
  }
  return ctx;
}
