import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

/**
 * Idempotent runtime migrator. Applies the schema additions that the
 * 20260508200000_igdb_request_cache and 20260508210000_user_search_cache
 * migrations introduce. Each statement uses IF NOT EXISTS so re-runs are
 * safe and the endpoint can heal a DB that build-time `prisma migrate
 * deploy` skipped (e.g. when env vars rotated between build and runtime).
 */
export async function POST() {
  const results: Array<{ statement: string; ok: boolean; error?: string }> = [];

  const statements: Array<{ label: string; sql: Prisma.Sql }> = [
    {
      label: "create IgdbRequest",
      sql: Prisma.sql`
        CREATE TABLE IF NOT EXISTS "IgdbRequest" (
          "id" TEXT NOT NULL,
          "cacheKey" TEXT NOT NULL,
          "endpoint" TEXT NOT NULL,
          "query" TEXT NOT NULL,
          "response" TEXT NOT NULL,
          "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "expiresAt" TIMESTAMP(3),
          CONSTRAINT "IgdbRequest_pkey" PRIMARY KEY ("id")
        )
      `,
    },
    {
      label: "index IgdbRequest cacheKey unique",
      sql: Prisma.sql`CREATE UNIQUE INDEX IF NOT EXISTS "IgdbRequest_cacheKey_key" ON "IgdbRequest"("cacheKey")`,
    },
    {
      label: "index IgdbRequest endpoint",
      sql: Prisma.sql`CREATE INDEX IF NOT EXISTS "IgdbRequest_endpoint_idx" ON "IgdbRequest"("endpoint")`,
    },
    {
      label: "index IgdbRequest fetchedAt",
      sql: Prisma.sql`CREATE INDEX IF NOT EXISTS "IgdbRequest_fetchedAt_idx" ON "IgdbRequest"("fetchedAt")`,
    },
    {
      label: "create UserSearchCache",
      sql: Prisma.sql`
        CREATE TABLE IF NOT EXISTS "UserSearchCache" (
          "id" TEXT NOT NULL,
          "query" TEXT NOT NULL,
          "outcome" TEXT NOT NULL,
          "message" TEXT NOT NULL,
          "igdbGameId" INTEGER,
          "matchedTitle" TEXT,
          "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "expiresAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "UserSearchCache_pkey" PRIMARY KEY ("id")
        )
      `,
    },
    {
      label: "index UserSearchCache query unique",
      sql: Prisma.sql`CREATE UNIQUE INDEX IF NOT EXISTS "UserSearchCache_query_key" ON "UserSearchCache"("query")`,
    },
    {
      label: "index UserSearchCache expiresAt",
      sql: Prisma.sql`CREATE INDEX IF NOT EXISTS "UserSearchCache_expiresAt_idx" ON "UserSearchCache"("expiresAt")`,
    },
  ];

  for (const { label, sql } of statements) {
    try {
      await prisma.$executeRaw(sql);
      results.push({ statement: label, ok: true });
    } catch (error) {
      results.push({ statement: label, ok: false, error: (error as Error).message });
    }
  }

  // Verify by selecting one row count from each table.
  let igdbRequestCount: number | string;
  let userSearchCacheCount: number | string;
  try {
    igdbRequestCount = await prisma.igdbRequest.count();
  } catch (error) {
    igdbRequestCount = `error: ${(error as Error).message}`;
  }
  try {
    userSearchCacheCount = await prisma.userSearchCache.count();
  } catch (error) {
    userSearchCacheCount = `error: ${(error as Error).message}`;
  }

  return NextResponse.json({
    results,
    counts: { IgdbRequest: igdbRequestCount, UserSearchCache: userSearchCacheCount },
  });
}
