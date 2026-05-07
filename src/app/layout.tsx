import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "Game Delistings Tracker",
  description: "Track recent and upcoming video game delistings.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-[#0f1320] text-[#f4f6ff]">
        <Header />
        {children}
      </body>
    </html>
  );
}
