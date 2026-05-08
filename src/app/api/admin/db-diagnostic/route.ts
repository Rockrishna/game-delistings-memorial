import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

/**
 * Write+read consistency probe. Inserts one IgdbRequest row with a
 * timestamped cacheKey, immediately reads it back, and returns both
 * the write timestamp and what's visible after the write.
 *
 * Run twice in succession:
 *   GET /api/admin/db-diagnostic
 *   GET /api/admin/db-diagnostic
 * If totals stay flat across calls, writes aren't persisting (or each
 * request connects to a different DB branch). If totals grow, the DB
 * is consistent and the bug is elsewhere.
 */
export async function GET() {
  const marker = `diag:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
  const beforeCount = await prisma.igdbRequest.count();

  const written = await prisma.igdbRequest.create({
    data: {
      cacheKey: marker,
      endpoint: "_diag",
      query: "diagnostic write",
      response: "[]",
      expiresAt: new Date(Date.now() + 60_000),
    },
  });

  const afterCount = await prisma.igdbRequest.count();
  const readback = await prisma.igdbRequest.findUnique({
    where: { cacheKey: marker },
    select: { id: true, fetchedAt: true },
  });

  // Also list the most recent diagnostic markers so we can see history
  const recent = await prisma.igdbRequest.findMany({
    where: { endpoint: "_diag" },
    orderBy: { fetchedAt: "desc" },
    take: 10,
    select: { cacheKey: true, fetchedAt: true },
  });

  // Sample: where does Prisma think it's connected?
  return NextResponse.json({
    marker,
    counts: { before: beforeCount, after: afterCount },
    writtenId: written.id,
    readbackVisible: readback !== null,
    recentDiagnostics: recent.map((r) => ({
      cacheKey: r.cacheKey,
      fetchedAt: r.fetchedAt.toISOString(),
    })),
    env: {
      hasPrismaUrl: !!process.env.PRISMA_DATABASE_URL,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasPostgresUrl: !!process.env.POSTGRES_URL,
      prismaUrlPrefix: process.env.PRISMA_DATABASE_URL?.slice(0, 30) ?? null,
      databaseUrlPrefix: process.env.DATABASE_URL?.slice(0, 30) ?? null,
      postgresUrlPrefix: process.env.POSTGRES_URL?.slice(0, 30) ?? null,
    },
  });
}
