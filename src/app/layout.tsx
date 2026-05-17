import type { Metadata } from "next";
import "./globals.css";
import {
  Playfair_Display,
  Crimson_Pro,
  Special_Elite,
  Cutive_Mono,
  Architects_Daughter,
} from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import ScrollToTop from "@/components/layout/ScrollToTop";
import ThemeProvider from "@/components/layout/ThemeProvider";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

const crimson = Crimson_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-crimson",
  display: "swap",
});

const typewriter = Special_Elite({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-typewriter",
  display: "swap",
});

const mono = Cutive_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-mono",
  display: "swap",
});

const hand = Architects_Daughter({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-hand",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Delisted Games Tracker — a database of withdrawn titles",
  description:
    "A scholarly card-catalog of video games pulled from major digital storefronts. Browse, filter, and read records sourced from IGDB.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${crimson.variable} ${typewriter.variable} ${mono.variable} ${hand.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          {children}
          <ScrollToTop />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
