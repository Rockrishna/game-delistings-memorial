-- Add provenance column for delistDate. Existing rows get NULL and are
-- treated as IGDB-derived (the only source that existed previously) at
-- the application layer.

ALTER TABLE "DelistingEvent"
  ADD COLUMN "delistDateSource" TEXT;
