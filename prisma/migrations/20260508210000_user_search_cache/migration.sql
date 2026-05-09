-- CreateTable
CREATE TABLE "UserSearchCache" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "igdbGameId" INTEGER,
    "matchedTitle" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSearchCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSearchCache_query_key" ON "UserSearchCache"("query");

-- CreateIndex
CREATE INDEX "UserSearchCache_expiresAt_idx" ON "UserSearchCache"("expiresAt");
