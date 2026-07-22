-- Additive: RAWG cross-links. rawgId/rawgSlug link a record to its RAWG game
-- page; rawgLinks is a JSON [{category,url}] of external links (stores, official
-- website, Reddit, Metacritic) harvested from RAWG. Existing rows stay NULL
-- until the catalogue sweep / refetch backfill populates them.
ALTER TABLE "Game"
  ADD COLUMN "rawgId" INTEGER,
  ADD COLUMN "rawgSlug" TEXT,
  ADD COLUMN "rawgLinks" TEXT;
