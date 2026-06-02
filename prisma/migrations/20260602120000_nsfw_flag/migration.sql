-- Additive: mark sexual/porn ("NSFW") titles so the UI can hide them from
-- browsing views while keeping them in the underlying data/insights. Existing
-- rows default to false and are reclassified by the catalogue sweep / backfill.
ALTER TABLE "Game"
  ADD COLUMN "nsfw" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Game_nsfw_idx" ON "Game"("nsfw");
