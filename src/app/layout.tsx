import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Game Delistings Tracker",
  description: "Track recent and upcoming video game delistings.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
