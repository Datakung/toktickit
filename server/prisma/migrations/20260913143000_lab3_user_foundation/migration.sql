BEGIN;

-- Abort before changing any data; never merge accounts with normalized collisions.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "RequesterUser" GROUP BY lower(btrim(email)) HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Normalized email collision. Review accounts before migrating.';
  END IF;
  IF EXISTS (SELECT 1 FROM "RequesterUser" WHERE btrim(email) = '') THEN
    RAISE EXCEPTION 'Empty email. Review accounts before migrating.';
  END IF;
END $$;

CREATE TYPE "UserRole" AS ENUM ('REQUESTER', 'IT_STAFF', 'ADMINISTRATOR');
ALTER TABLE "RequesterUser" RENAME TO "User";
ALTER SEQUENCE "RequesterUser_id_seq" RENAME TO "User_id_seq";
ALTER TABLE "User" RENAME CONSTRAINT "RequesterUser_pkey" TO "User_pkey";
ALTER INDEX "RequesterUser_email_key" RENAME TO "User_email_key";
ALTER TABLE "User"
  ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'REQUESTER',
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
UPDATE "User" SET email = lower(btrim(email));

ALTER TABLE "Attachment" RENAME COLUMN "removedByRequesterId" TO "removedByUserId";
ALTER TABLE "Attachment" RENAME CONSTRAINT "Attachment_removedByRequesterId_fkey" TO "Attachment_removedByUserId_fkey";

-- Preserve all existing non-null priorities and timestamps.
UPDATE "Ticket" SET "itPriority" = "requestedPriority" WHERE "itPriority" IS NULL;

CREATE TABLE "Session" (
  "id" SERIAL PRIMARY KEY,
  "tokenHash" VARCHAR(64) NOT NULL,
  "csrfHash" VARCHAR(64) NOT NULL,
  "userId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
COMMIT;
