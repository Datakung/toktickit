-- The preceding migration backfills only null priorities. Enforce the approved
-- Lab 3 invariant in a separate step so an already-applied migration is never
-- rewritten.
ALTER TABLE "Ticket" ALTER COLUMN "itPriority" SET NOT NULL;
