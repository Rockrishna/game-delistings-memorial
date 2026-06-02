"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type NsfwContextValue = {
  // true → sexual/porn titles are shown in browsing views.
  showNsfw: boolean;
  setShowNsfw: (value: boolean) => void;
};

const NsfwContext = createContext<NsfwContextValue | null>(null);

const STORAGE_KEY = "delisted-show-nsfw";

function readStored(): boolean {
  if (typeof window === "undefined") return false; // default hidden (safe)
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export default function NsfwProvider({ children }: { children: React.ReactNode }) {
  // Lazy initializer mirrors ThemeProvider: read the stored preference once
  // on first client render, default hidden on the server.
  const [showNsfw, setShow] = useState<boolean>(readStored);

  const setShowNsfw = useCallback((value: boolean) => {
    setShow(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    } catch {
      /* ignore storage errors */
    }
  }, []);

  const value = useMemo(() => ({ showNsfw, setShowNsfw }), [showNsfw, setShowNsfw]);

  return <NsfwContext.Provider value={value}>{children}</NsfwContext.Provider>;
}

export function useNsfw() {
  const ctx = useContext(NsfwContext);
  if (!ctx) {
    return { showNsfw: false, setShowNsfw: () => {} } as NsfwContextValue;
  }
  return ctx;
}
