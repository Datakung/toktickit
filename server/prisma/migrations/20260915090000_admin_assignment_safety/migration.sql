-- Additive: preserve all existing Ticket IDs, relationships and timestamps.
ALTER TABLE "Ticket" ADD COLUMN "ownerId" INTEGER;
ALTER TABLE "Ticket" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Ticket_ownerId_status_idx" ON "Ticket"("ownerId", "status");
