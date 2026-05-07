import { NextResponse } from "next/server";
import { getGameDetailById } from "@/lib/data";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const game = await getGameDetailById(id);
    if (!game) {
      return NextResponse.json({ error: "Game not found." }, { status: 404 });
    }
    return NextResponse.json(game);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load game.", details: (error as Error).message },
      { status: 500 }
    );
  }
}
