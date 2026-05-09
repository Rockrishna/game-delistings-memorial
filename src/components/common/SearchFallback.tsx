"use client";

import { useState } from "react";

type Outcome = "added" | "not_delisted" | "not_found" | "already_in_catalogue";

type Result = {
  outcome: Outcome;
  message: string;
  matchedTitle?: string | null;
  igdbGameId?: number | null;
  fromCache?: boolean;
};

interface SearchFallbackProps {
  query: string;
  className?: string;
}

/**
 * Empty-state CTA that asks IGDB whether the searched-for term is a
 * delisted/offline game. Server-side route /api/search/igdb caches the
 * response in UserSearchCache for 30 days; this component just renders
 * the result.
 */
export default function SearchFallback({ query, className = "" }: SearchFallbackProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trimmed = query.trim();

  async function lookup() {
    if (trimmed.length < 2 || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/search/igdb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });
      const payload = (await response.json()) as Result & { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "IGDB lookup failed.");
      } else {
        setResult(payload);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (trimmed.length < 2) return null;

  return (
    <div className={`mt-6 border border-dashed border-[color:var(--rule)] bg-[color:var(--paper-2)] p-5 ${className}`}>
      {!result && !error ? (
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-serif text-sm italic text-[color:var(--ink-2)]">
            No catalogue match for &ldquo;{trimmed}&rdquo;.
          </p>
          <button
            type="button"
            onClick={lookup}
            disabled={loading}
            className="border border-[color:var(--ink)] bg-[color:var(--paper)] px-4 py-2 font-typewriter text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink)] transition-colors hover:bg-[color:var(--ink)] hover:text-[color:var(--paper)] disabled:opacity-50"
          >
            {loading ? "Searching IGDB…" : "Search IGDB for delisted games"}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="font-serif text-sm text-[color:var(--accent)]">IGDB lookup failed: {error}</p>
      ) : null}

      {result ? <ResultMessage result={result} /> : null}
    </div>
  );
}

function ResultMessage({ result }: { result: Result }) {
  if (result.outcome === "added" || result.outcome === "already_in_catalogue") {
    return (
      <div>
        <p className="font-typewriter text-[10px] uppercase tracking-[0.18em] text-[color:var(--accent)]">
          {result.outcome === "added" ? "Added to catalogue" : "Already tracked"}
        </p>
        <p className="mt-1 font-serif text-base text-[color:var(--ink)]">{result.message}</p>
        {result.outcome === "added" ? (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 border border-[color:var(--accent)] bg-[color:var(--paper)] px-4 py-2 font-typewriter text-[11px] uppercase tracking-[0.18em] text-[color:var(--accent)] transition-colors hover:bg-[color:var(--accent)] hover:text-[color:var(--paper)]"
          >
            Reload page
          </button>
        ) : null}
        {result.fromCache ? (
          <p className="mt-3 font-typewriter text-[9px] uppercase tracking-[0.18em] text-[color:var(--ink-3)]">
            Cached (≤30 days)
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <p className="font-typewriter text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-3)]">
        IGDB result
      </p>
      <p className="mt-1 font-serif text-base text-[color:var(--ink-2)]">{result.message}</p>
      {result.fromCache ? (
        <p className="mt-3 font-typewriter text-[9px] uppercase tracking-[0.18em] text-[color:var(--ink-3)]">
          Cached (≤30 days)
        </p>
      ) : null}
    </div>
  );
}
