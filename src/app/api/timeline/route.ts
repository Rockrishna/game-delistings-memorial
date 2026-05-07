import { NextRequest, NextResponse } from "next/server";
import { getTimelineData } from "@/lib/data";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get("q") ?? undefined;
    const platform = searchParams.get("platform") ?? undefined;
    const sort = (searchParams.get("sort") as "newest" | "oldest" | "alphabetical" | null) ?? "newest";
    const payload = await getTimelineData({ search: q, platform, sort });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load timeline.", details: (error as Error).message },
      { status: 500 }
    );
  }
}
