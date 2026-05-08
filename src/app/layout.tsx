import type { Metadata } from "next";
import "./globals.css";
import { Playfair_Display, Crimson_Pro, Special_Elite } from "next/font/google";
import Header from "@/components/layout/Header";
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

export const metadata: Metadata = {
  title: "The Delisted — A daily record of digital games withdrawn from sale",
  description:
    "An ongoing memorial of video games removed, withdrawn, or about to vanish from major digital storefronts.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${crimson.variable} ${typewriter.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <Header />
          {children}
          <footer className="mt-16 border-t border-[color:var(--rule)] bg-[color:var(--paper-2)]">
            <div className="mx-auto flex max-w-[1280px] flex-col gap-3 px-6 py-6 text-center font-typewriter text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-3)] md:flex-row md:items-center md:justify-between md:text-left">
              <span>The Delisted · A non-commercial memorial of digital games</span>
              <span>Metadata via IGDB · Curation by the editors</span>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
