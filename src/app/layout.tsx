import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "Game Delistings Tracker",
  description: "Track recent and upcoming video game delistings.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-[#15121b] text-[#e7e0ed] antialiased">
        <Header />
        {children}
      </body>
    </html>
  );
}
