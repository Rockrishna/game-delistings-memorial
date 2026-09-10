"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type EndlessContextValue = {
  // true → the overview stream keeps loading as you scroll (in bursts).
  // false → it loads one batch at a time behind a "Load more" button, so the
  // bottom of the page — and the footer — is always one screen away.
  endless: boolean;
  setEndless: (value: boolean) => void;
};

const EndlessContext = createContext<EndlessContextValue | null>(null);

const STORAGE_KEY = "delisted-endless-scroll";

function readStored(): boolean {
  if (typeof window === "undefined") return true; // default on (the old behaviour)
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
}

export default function EndlessProvider({ children }: { children: React.ReactNode }) {
  // Lazy initializer mirrors NsfwProvider: read the stored preference once on
  // first client render, default on for the server render.
  const [endless, setValue] = useState<boolean>(readStored);

  const setEndless = useCallback((value: boolean) => {
    setValue(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    } catch {
      /* ignore storage errors */
    }
  }, []);

  const value = useMemo(() => ({ endless, setEndless }), [endless, setEndless]);

  return <EndlessContext.Provider value={value}>{children}</EndlessContext.Provider>;
}

export function useEndless() {
  const ctx = useContext(EndlessContext);
  if (!ctx) {
    return { endless: true, setEndless: () => {} } as EndlessContextValue;
  }
  return ctx;
}
