-- Additive: richer IGDB attributes for faceting / insights. Existing rows
-- get NULLs and are backfilled as the catalogue sweep re-upserts them.
ALTER TABLE "Game"
  ADD COLUMN "gameModes" TEXT,
  ADD COLUMN "themes" TEXT,
  ADD COLUMN "playerPerspectives" TEXT,
  ADD COLUMN "franchise" TEXT;
