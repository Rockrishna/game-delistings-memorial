-- CreateTable
CREATE TABLE "IgdbRequest" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "IgdbRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IgdbRequest_cacheKey_key" ON "IgdbRequest"("cacheKey");

-- CreateIndex
CREATE INDEX "IgdbRequest_endpoint_idx" ON "IgdbRequest"("endpoint");

-- CreateIndex
CREATE INDEX "IgdbRequest_fetchedAt_idx" ON "IgdbRequest"("fetchedAt");
