-- Align the database constraint with the approved Lab 2 BR-10 limit.
ALTER TABLE "Ticket" ALTER COLUMN "description" TYPE VARCHAR(4000);
