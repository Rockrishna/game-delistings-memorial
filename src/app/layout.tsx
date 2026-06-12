import type { Metadata, Viewport } from "next";
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
import NsfwProvider from "@/components/layout/NsfwProvider";

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

const SITE_NAME = "Delisted Games Tracker";
const SITE_DESCRIPTION =
  "A scholarly card-catalog of video games pulled from major digital storefronts. Browse, filter, and read records sourced from IGDB.";
const PROD_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(PROD_URL),
  title: {
    default: `${SITE_NAME} — a database of withdrawn titles`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    siteName: SITE_NAME,
    title: `${SITE_NAME} — a database of withdrawn titles`,
    description: SITE_DESCRIPTION,
    type: "website",
  },
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3eee2" },
    { media: "(prefers-color-scheme: dark)", color: "#131417" },
  ],
};

// Runs before first paint so a stored dark preference never flashes light.
const THEME_INIT = `try{if(localStorage.getItem("delisted-theme")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;

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
        {/* React hoists the preconnect into <head>; the inline script runs
            before anything paints so a stored dark theme never flashes. */}
        <link rel="preconnect" href="https://images.igdb.com" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <ThemeProvider>
          <NsfwProvider>
            {children}
            <ScrollToTop />
          </NsfwProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
