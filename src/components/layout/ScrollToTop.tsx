"use client";

import { useEffect, useState } from "react";

/**
 * Fixed bottom-right "back to top" button. Hidden until the user has scrolled
 * past the header (≈navbar height). Visible across every route.
 */
export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const threshold = 240; // a bit past the masthead + nav strip
    function onScroll() {
      setVisible(window.scrollY > threshold);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollUp() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <button
      type="button"
      onClick={scrollUp}
      aria-label="Scroll to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={`fixed bottom-6 right-6 z-50 flex h-11 w-11 items-center justify-center border border-[color:var(--ink)] bg-[color:var(--paper)] font-display text-xl font-bold text-[color:var(--ink)] shadow-[2px_2px_0_0_var(--ink)] transition-all duration-200 hover:bg-[color:var(--ink)] hover:text-[color:var(--paper)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0"
      }`}
    >
      <span aria-hidden>↑</span>
    </button>
  );
}
