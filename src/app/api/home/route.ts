import { NextResponse } from "next/server";
import { getHomePageData } from "@/lib/data";

export async function GET() {
  try {
    const payload = await getHomePageData();
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load homepage data.", details: (error as Error).message },
      { status: 500 }
    );
  }
}
