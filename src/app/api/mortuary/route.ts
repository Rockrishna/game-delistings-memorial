import { NextRequest, NextResponse } from "next/server";
import { getMortuaryData } from "@/lib/data";

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q") ?? undefined;
    const payload = await getMortuaryData(q);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load mortuary data.", details: (error as Error).message },
      { status: 500 }
    );
  }
}
