import { NextRequest, NextResponse } from "next/server";
import { getCatalog, type CatalogQuery } from "@/lib/catalog";

export const dynamic = "force-dynamic";

function list(params: URLSearchParams, key: string): string[] {
  const values = params.getAll(key);
  return values
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean);
}

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const sortParam = p.get("sort");
  const validSort = ["rating", "year", "year-asc", "title"];
  const query: CatalogQuery = {
    search: p.get("q") ?? undefined,
    platform: list(p, "platform"),
    decade: list(p, "decade"),
    genre: list(p, "genre"),
    publisher: list(p, "publisher"),
    developer: list(p, "developer"),
    mode: list(p, "mode"),
    theme: list(p, "theme"),
    perspective: list(p, "perspective"),
    rating: list(p, "rating"),
    hasCover: p.get("hasCover") === "1",
    sort: (validSort.includes(sortParam ?? "") ? sortParam : "title") as CatalogQuery["sort"],
    page: Number(p.get("page") ?? "1") || 1,
    pageSize: Number(p.get("pageSize") ?? "24") || 24,
  };

  const result = await getCatalog(query);
  return NextResponse.json(result);
}
