"use client";

import { useEffect, useState } from "react";

interface SearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
  initialValue?: string;
  debounceMs?: number;
}

export default function SearchBar({
  onSearch,
  placeholder = "Search the paper…",
  className = "",
  initialValue = "",
  debounceMs = 250,
}: SearchBarProps) {
  const [query, setQuery] = useState(initialValue);

  useEffect(() => {
    if (!onSearch) return;
    const handle = setTimeout(() => onSearch(query), debounceMs);
    return () => clearTimeout(handle);
  }, [query, debounceMs, onSearch]);

  return (
    <div
      className={`flex items-center gap-3 border border-[color:var(--ink)] bg-[color:var(--paper-2)] px-4 py-3 ${className}`}
    >
      <span className="font-display text-2xl leading-none text-[color:var(--ink-2)]" aria-hidden>
        ⌕
      </span>
      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent font-serif text-base italic text-[color:var(--ink)] placeholder:text-[color:var(--ink-3)] focus:outline-none"
      />
    </div>
  );
}
