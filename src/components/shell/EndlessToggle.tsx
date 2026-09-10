"use client";

import { useEndless } from "@/components/layout/EndlessProvider";

/**
 * Switches the overview's newest-releases stream between endless scrolling and
 * one batch per click. "labelled" spells the setting out for the desktop nav
 * bar, where there is no adjacent label the way there is in the mobile menu.
 */
export default function EndlessToggle({ labelled = false }: { labelled?: boolean }) {
  const { endless, setEndless } = useEndless();
  return (
    <button
      className={`chip${endless ? "" : " accent"}`}
      onClick={() => setEndless(!endless)}
      aria-pressed={endless}
      // Label depends on the stored preference, which the server can't know.
      suppressHydrationWarning
      aria-label={
        endless
          ? "Endless scrolling is on — switch to loading a batch at a time"
          : "Endless scrolling is off — switch to loading as you scroll"
      }
      title={
        endless
          ? "The overview keeps loading records as you scroll — click to load a batch at a time instead"
          : "The overview loads a batch at a time — click to load as you scroll instead"
      }
    >
      {labelled ? (endless ? "Endless scroll: on" : "Endless scroll: off") : endless ? "On" : "Off"}
    </button>
  );
}
