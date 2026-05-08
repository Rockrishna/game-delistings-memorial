"use client";

import { useState } from "react";

interface SearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchBar({
  onSearch,
  placeholder = "Search games...",
  className = "",
}: SearchBarProps) {
  const [query, setQuery] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch?.(value);
  };

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full border border-[#494454] bg-[#2c2832] px-11 py-3 font-mono text-sm text-[#e7e0ed] placeholder:text-[#958ea0] focus:border-[#d0bcff] focus:outline-none transition-colors"
      />
      <svg
        className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#958ea0]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    </div>
  );
}
