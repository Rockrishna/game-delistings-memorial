import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Card({ children, className = "", hover = true }: CardProps) {
  const hoverClass = hover
    ? "hover:border-[#d0bcff]/50 hover:bg-[#2c2832] transition-colors"
    : "";
  return (
    <div
      className={`border border-[#494454] bg-[#211e27] p-6 ${hoverClass} ${className}`}
    >
      {children}
    </div>
  );
}
