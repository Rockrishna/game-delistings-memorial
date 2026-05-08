import { NextResponse } from "next/server";
import { getMortuaryFacets } from "@/lib/data";
import { ensureSeeded } from "@/lib/autoseed";

export const maxDuration = 60;

export async function GET() {
  try {
    await ensureSeeded();
    const payload = await getMortuaryFacets();
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load facets.", details: (error as Error).message },
      { status: 500 }
    );
  }
}
