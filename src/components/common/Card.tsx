import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Card({ children, className = "", hover = true }: CardProps) {
  const hoverClass = hover
    ? "hover:border-[#3b4767] hover:shadow-lg transition-all"
    : "";
  return (
    <div
      className={`bg-[#171d2e] border border-[#2a3248] rounded-lg p-6 ${hoverClass} ${className}`}
    >
      {children}
    </div>
  );
}
