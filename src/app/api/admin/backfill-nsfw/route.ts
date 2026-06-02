import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isNsfwGame, type AgeRating } from "@/lib/nsfw";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

function parseJsonArray<T>(value: string | null): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/**
 * One-off / idempotent reclassification of the `nsfw` flag for rows that
 * predate the column. Uses attributes already stored in Postgres (themes,
 * ageRatings, name, summary) — no IGDB calls — so it's cheap and repeatable.
 * Only writes rows whose computed flag differs from what's stored.
 *
 * Reachable only through Vercel Deployment Protection.
 */
export async function GET() {
  try {
    const games = await prisma.game.findMany({
      select: { id: true, name: true, summary: true, themes: true, ageRatings: true, nsfw: true },
    });

    let flagged = 0;
    let unflagged = 0;

    for (const g of games) {
      const next = isNsfwGame({
        themes: parseJsonArray<string>(g.themes),
        ageRatings: parseJsonArray<AgeRating>(g.ageRatings),
        name: g.name,
        summary: g.summary,
      });
      if (next === g.nsfw) continue;
      await prisma.game.update({ where: { id: g.id }, data: { nsfw: next } });
      if (next) flagged += 1;
      else unflagged += 1;
    }

    const nsfwTotal = await prisma.game.count({ where: { nsfw: true } });

    return NextResponse.json({
      ok: true,
      scanned: games.length,
      newlyFlagged: flagged,
      newlyUnflagged: unflagged,
      nsfwTotal,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "NSFW backfill failed.", details: (error as Error).message },
      { status: 500 }
    );
  }
}
