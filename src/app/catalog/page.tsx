import { Suspense } from "react";
import UShell from "@/components/shell/UShell";
import CatalogBrowser from "@/components/catalog/CatalogBrowser";
import { getCatalog, getOverview, type CatalogQuery } from "@/lib/catalog";

export const dynamic = "force-dynamic";

// Facet param → display order. Must match FACETS in CatalogBrowser so the
// server-rendered query string is byte-identical to the client's (lets the
// browser skip the first fetch and paint straight from the DB cache).
const FACET_PARAMS = [
  "platform",
  "decade",
  "genre",
  "publisher",
  "developer",
  "mode",
  "theme",
  "perspective",
  "rating",
] as const;

type SP = Record<string, string | string[] | undefined>;

function values(sp: SP, key: string): string[] {
  const raw = sp[key];
  const arr = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
  return arr.flatMap((v) => v.split(",")).map((v) => v.trim()).filter(Boolean);
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;

  const validSort = ["rating", "year", "year-asc", "title"];
  const sortRaw = typeof sp.sort === "string" ? sp.sort : "title";
  const sort = (validSort.includes(sortRaw) ? sortRaw : "title") as CatalogQuery["sort"];
  const page = Number(typeof sp.page === "string" ? sp.page : "1") || 1;
  const hasCover = sp.hasCover === "1";
  const q = typeof sp.q === "string" ? sp.q : undefined;

  const query: CatalogQuery = {
    search: q,
    platform: values(sp, "platform"),
    decade: values(sp, "decade"),
    genre: values(sp, "genre"),
    publisher: values(sp, "publisher"),
    developer: values(sp, "developer"),
    mode: values(sp, "mode"),
    theme: values(sp, "theme"),
    perspective: values(sp, "perspective"),
    rating: values(sp, "rating"),
    hasCover,
    sort,
    page,
    pageSize: 24,
  };

  // Build the canonical query string exactly as CatalogBrowser does.
  const canonical = new URLSearchParams();
  for (const param of FACET_PARAMS) for (const v of values(sp, param)) canonical.append(param, v);
  if (q) canonical.append("q", q);
  if (hasCover) canonical.set("hasCover", "1");
  canonical.set("page", String(page));
  canonical.set("sort", sort ?? "title");
  canonical.set("pageSize", "24");

  const [{ total }, initial] = await Promise.all([getOverview(), getCatalog(query)]);

  return (
    <UShell total={total}>
      <Suspense fallback={<div className="strap" style={{ padding: 28 }}>loading catalogue…</div>}>
        <CatalogBrowser initial={initial} initialQuery={canonical.toString()} />
      </Suspense>
    </UShell>
  );
}
