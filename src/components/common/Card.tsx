import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Card({ children, className = "", hover = true }: CardProps) {
  const hoverClass = hover ? "transition-colors hover:bg-[color:var(--paper-2)]" : "";
  return (
    <div
      className={`border border-[color:var(--rule)] bg-[color:var(--paper)] p-6 ${hoverClass} ${className}`}
    >
      {children}
    </div>
  );
}
