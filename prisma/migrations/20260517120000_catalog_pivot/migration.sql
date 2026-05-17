-- Catalogue pivot: the product moves from a date-driven delistings timeline
-- to an attribute-rich database. There are no reliable delist dates, so the
-- DelistingEvent model (and its date provenance) is removed entirely, along
-- with the unused MediaAsset table. Game gains rich IGDB/RAWG attributes.
--
-- Game is rebuilt from IGDB by the catalogue sweep, so existing rows are
-- cleared to allow the new NOT NULL columns to be added cleanly.

-- DropForeignKey / DropTable: delisting era
DROP TABLE IF EXISTS "DelistingEvent";
DROP TABLE IF EXISTS "MediaAsset";
DROP TYPE IF EXISTS "DelistingType";

-- Clear stale catalogue rows (cascades to GamePlatform / GameGenre).
TRUNCATE TABLE "Game" CASCADE;

-- AlterTable: enrichment columns
ALTER TABLE "Game"
  ADD COLUMN "callNumber" TEXT NOT NULL,
  ADD COLUMN "screenshotUrls" TEXT,
  ADD COLUMN "releaseYear" INTEGER,
  ADD COLUMN "decade" TEXT,
  ADD COLUMN "aggregatedRating" DOUBLE PRECISION,
  ADD COLUMN "totalRating" DOUBLE PRECISION,
  ADD COLUMN "ratingCount" INTEGER,
  ADD COLUMN "metacritic" INTEGER,
  ADD COLUMN "publisher" TEXT,
  ADD COLUMN "developer" TEXT,
  ADD COLUMN "ageRatings" TEXT,
  ADD COLUMN "websites" TEXT,
  ADD COLUMN "igdbStatus" INTEGER,
  ADD COLUMN "statusLabel" TEXT NOT NULL DEFAULT 'delisted',
  ADD COLUMN "enrichedFrom" TEXT,
  ADD COLUMN "igdbUpdatedAt" TIMESTAMP(3),
  ADD COLUMN "lastSyncedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Game_callNumber_key" ON "Game"("callNumber");
CREATE INDEX "Game_releaseYear_idx" ON "Game"("releaseYear");
CREATE INDEX "Game_decade_idx" ON "Game"("decade");
CREATE INDEX "Game_rating_idx" ON "Game"("rating");
CREATE INDEX "Game_publisher_idx" ON "Game"("publisher");
