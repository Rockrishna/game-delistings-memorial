"use client";

import { useEffect, useRef, useState } from "react";
import { useNsfw } from "@/components/layout/NsfwProvider";

export default function NsfwToggle() {
  const { showNsfw, setShowNsfw } = useNsfw();
  const [warning, setWarning] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  function onClick() {
    if (showNsfw) {
      // Turning the filter back on (hiding) needs no confirmation.
      setShowNsfw(false);
    } else {
      // Revealing mature content — confirm first.
      setWarning(true);
    }
  }

  function confirm() {
    setShowNsfw(true);
    setWarning(false);
  }

  // Native <dialog> gives us focus trapping, Escape handling, and focus
  // restoration to the toggle when closed.
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (warning && !d.open) d.showModal();
    if (!warning && d.open) d.close();
  }, [warning]);

  return (
    <>
      <button
        className={`chip${showNsfw ? " accent" : ""}`}
        onClick={onClick}
        aria-pressed={showNsfw}
        suppressHydrationWarning
        title={
          showNsfw
            ? "Mature/sexual titles are visible — click to hide them"
            : "Mature/sexual titles are hidden — click to show them"
        }
      >
        {showNsfw ? "◉ NSFW on" : "⊘ NSFW off"}
      </button>

      <dialog
        ref={dialogRef}
        className="sheet"
        aria-labelledby="nsfw-warning-title"
        onClose={() => setWarning(false)}
        onClick={(e) => {
          // Click on the backdrop (outside the padded content) closes.
          if (e.target === dialogRef.current) setWarning(false);
        }}
      >
        <div className="strap accent" style={{ letterSpacing: "0.16em" }}>
          MATURE CONTENT WARNING
        </div>
        <h2
          id="nsfw-warning-title"
          className="font-serif"
          style={{ fontSize: 24, fontWeight: 600, margin: "8px 0 6px" }}
        >
          Show suggestive &amp; adult titles?
        </h2>
        <p
          className="font-serif"
          style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.5, margin: 0 }}
        >
          Enabling this reveals sexualised, erotic, and pornographic games
          (IGDB &ldquo;Erotic&rdquo; theme, Adults-Only ratings, and similar)
          that are hidden by default. These records contain explicit or
          suggestive material intended for adult audiences. By continuing you
          confirm you are of legal age to view this content in your
          jurisdiction.
        </p>
        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            marginTop: 22,
          }}
        >
          <button className="chip" onClick={() => setWarning(false)}>
            cancel
          </button>
          <button className="chip solid" onClick={confirm}>
            I understand · show
          </button>
        </div>
      </dialog>
    </>
  );
}
