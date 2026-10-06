BEGIN;

CREATE TYPE "ActionState" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
ALTER TABLE "Ticket" ADD COLUMN "resolutionCycle" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "resolvedAt" TIMESTAMPTZ(3),
  ADD CONSTRAINT "Ticket_resolutionCycle_check" CHECK ("resolutionCycle" > 0);

CREATE TABLE "ActionTaken" (
  "id" SERIAL PRIMARY KEY,
  "ticketId" INTEGER NOT NULL REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "cycle" INTEGER NOT NULL CHECK ("cycle" > 0),
  "state" "ActionState" NOT NULL DEFAULT 'PLANNED',
  "actionAt" TIMESTAMPTZ(3) NOT NULL,
  "description" VARCHAR(4000) NOT NULL CHECK (length(btrim("description")) > 0),
  "result" VARCHAR(4000) NOT NULL,
  "assigneeId" INTEGER REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "createdById" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "performedById" INTEGER REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "performedAt" TIMESTAMPTZ(3),
  "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
  "followUpNote" VARCHAR(2000) NOT NULL,
  "attachmentNotes" VARCHAR(2000) NOT NULL,
  "cancellationReason" VARCHAR(500),
  "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActionTaken_followUp_check" CHECK (NOT "followUpRequired" OR length(btrim("followUpNote")) > 0),
  CONSTRAINT "ActionTaken_performer_check" CHECK (
    ("state" = 'COMPLETED' AND length(btrim("result")) > 0 AND "performedById" IS NOT NULL AND "performedAt" IS NOT NULL)
    OR ("state" <> 'COMPLETED' AND "performedById" IS NULL AND "performedAt" IS NULL)),
  CONSTRAINT "ActionTaken_cancel_check" CHECK (
    ("state" = 'CANCELLED' AND "cancellationReason" IS NOT NULL AND length(btrim("cancellationReason")) > 0)
    OR ("state" <> 'CANCELLED' AND "cancellationReason" IS NULL))
);
CREATE UNIQUE INDEX "ActionTaken_id_ticketId_key" ON "ActionTaken"("id", "ticketId");
CREATE INDEX "ActionTaken_ticketId_cycle_createdAt_id_idx" ON "ActionTaken"("ticketId", "cycle", "createdAt", "id");
CREATE INDEX "ActionTaken_assigneeId_state_idx" ON "ActionTaken"("assigneeId", "state");
CREATE INDEX "ActionTaken_performedById_performedAt_id_idx" ON "ActionTaken"("performedById", "performedAt", "id");

CREATE TABLE "ActionTakenEvent" (
  "id" SERIAL PRIMARY KEY,
  "actionId" INTEGER NOT NULL,
  "ticketId" INTEGER NOT NULL REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "actorId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "kind" VARCHAR(32) NOT NULL CHECK ("kind" IN ('CREATED','EDITED','ASSIGNED','STARTED','COMPLETED','CANCELLED','ASSIGNEE_REMOVED')),
  "version" INTEGER NOT NULL CHECK ("version" > 0),
  "reason" VARCHAR(500), "before" JSONB, "after" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("actionId", "ticketId") REFERENCES "ActionTaken"("id", "ticketId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ActionTakenEvent_actionId_version_key" ON "ActionTakenEvent"("actionId", "version");
CREATE UNIQUE INDEX "ActionTakenEvent_id_actionId_ticketId_key" ON "ActionTakenEvent"("id", "actionId", "ticketId");
CREATE INDEX "ActionTakenEvent_ticketId_createdAt_id_idx" ON "ActionTakenEvent"("ticketId", "createdAt", "id");
CREATE INDEX "ActionTakenEvent_actionId_createdAt_id_idx" ON "ActionTakenEvent"("actionId", "createdAt", "id");

CREATE TABLE "ActionWriteReceipt" (
  "id" SERIAL PRIMARY KEY,
  "ticketId" INTEGER NOT NULL REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "actorId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "requestId" UUID NOT NULL, "operation" VARCHAR(100) NOT NULL, "payloadHash" VARCHAR(64) NOT NULL,
  "actionId" INTEGER NOT NULL, "eventId" INTEGER NOT NULL,
  "actionVersion" INTEGER NOT NULL CHECK ("actionVersion" > 0),
  "ticketVersion" INTEGER NOT NULL CHECK ("ticketVersion" > 0),
  FOREIGN KEY ("actionId", "ticketId") REFERENCES "ActionTaken"("id", "ticketId") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("eventId", "actionId", "ticketId") REFERENCES "ActionTakenEvent"("id", "actionId", "ticketId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ActionWriteReceipt_ticketId_actorId_requestId_key" ON "ActionWriteReceipt"("ticketId", "actorId", "requestId");

CREATE TABLE "TicketTransitionEvent" (
  "id" SERIAL PRIMARY KEY,
  "ticketId" INTEGER NOT NULL REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "actorId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "fromStatus" "TicketStatus" NOT NULL, "toStatus" "TicketStatus" NOT NULL,
  "cycle" INTEGER NOT NULL CHECK ("cycle" > 0),
  "ticketVersion" INTEGER NOT NULL CHECK ("ticketVersion" > 0),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "TicketTransitionEvent_ticketId_ticketVersion_key" ON "TicketTransitionEvent"("ticketId", "ticketVersion");
CREATE INDEX "TicketTransitionEvent_ticketId_createdAt_id_idx" ON "TicketTransitionEvent"("ticketId", "createdAt", "id");
CREATE INDEX "Ticket_status_itPriority_idx" ON "Ticket"("status", "itPriority");
CREATE INDEX "Ticket_requesterId_resolvedAt_idx" ON "Ticket"("requesterId", "resolvedAt");
CREATE INDEX "Ticket_updatedAt_id_idx" ON "Ticket"("updatedAt", "id");

-- API writes append events; database users cannot accidentally rewrite historical evidence.
-- TRUNCATE/DROP are reserved for guarded disposable test schemas and backup recovery.
CREATE FUNCTION "reject_lab4_history_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Lab 4 history and receipts are append-only'; END;
$$;
CREATE TRIGGER "ActionTakenEvent_append_only" BEFORE UPDATE OR DELETE ON "ActionTakenEvent"
  FOR EACH ROW EXECUTE FUNCTION "reject_lab4_history_mutation"();
CREATE TRIGGER "TicketTransitionEvent_append_only" BEFORE UPDATE OR DELETE ON "TicketTransitionEvent"
  FOR EACH ROW EXECUTE FUNCTION "reject_lab4_history_mutation"();
CREATE TRIGGER "ActionWriteReceipt_append_only" BEFORE UPDATE OR DELETE ON "ActionWriteReceipt"
  FOR EACH ROW EXECUTE FUNCTION "reject_lab4_history_mutation"();
COMMIT;
