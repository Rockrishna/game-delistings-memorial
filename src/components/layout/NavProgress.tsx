"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Slim accent bar across the top of the nav while a route change is in flight.
 *
 * Most surfaces are `force-dynamic`, so a click can sit for a few hundred ms
 * before the new page commits — with no feedback that felt like a dead click,
 * then an abrupt swap. We start the bar on any same-tab click of an internal
 * link and clear it once the pathname actually changes (or, defensively, after
 * a few seconds, so a cancelled navigation can't leave the bar stuck on).
 */
export default function NavProgress() {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      // Let the browser handle modified clicks / new tabs / non-left buttons.
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as Element | null)?.closest?.("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || anchor.hasAttribute("download")) return;
      if (anchor.target && anchor.target !== "_self") return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return; // not a navigable href (mailto:, malformed, …)
      }
      if (url.origin !== window.location.origin) return;
      // Same page (an in-page anchor, or only the query changing) doesn't
      // swap the canvas, so it needs no transition indicator.
      if (url.pathname === window.location.pathname) return;

      setPending(true);
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  // The new route committed — drop the bar.
  useEffect(() => {
    setPending(false);
  }, [pathname]);

  useEffect(() => {
    if (!pending) return;
    const t = window.setTimeout(() => setPending(false), 8000);
    return () => window.clearTimeout(t);
  }, [pending]);

  if (!pending) return null;
  return <div className="navprogress" role="presentation" />;
}
