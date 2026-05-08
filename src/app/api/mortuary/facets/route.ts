import { NextResponse } from "next/server";
import { getMortuaryFacets } from "@/lib/data";

export async function GET() {
  try {
    const payload = await getMortuaryFacets();
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load facets.", details: (error as Error).message },
      { status: 500 }
    );
  }
}
