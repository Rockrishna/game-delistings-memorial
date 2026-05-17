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
  const query: CatalogQuery = {
    search: p.get("q") ?? undefined,
    platform: list(p, "platform"),
    decade: list(p, "decade"),
    genre: list(p, "genre"),
    publisher: list(p, "publisher"),
    rating: list(p, "rating"),
    sort:
      sortParam === "rating" || sortParam === "year" || sortParam === "title"
        ? sortParam
        : "title",
    page: Number(p.get("page") ?? "1") || 1,
    pageSize: Number(p.get("pageSize") ?? "24") || 24,
  };

  const result = await getCatalog(query);
  return NextResponse.json(result);
}
