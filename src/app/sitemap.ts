import type { MetadataRoute } from "next";
import { getAllRecordSlugs } from "@/lib/catalog";

// Reads the DB, so it must render per-request, not at build time.
export const dynamic = "force-dynamic";

const BASE = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/catalog`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/insights`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/about-igdb`, changeFrequency: "monthly", priority: 0.4 },
  ];
  const slugs = await getAllRecordSlugs();
  return [
    ...pages,
    ...slugs.map((slug) => ({
      url: `${BASE}/record/${encodeURIComponent(slug)}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
