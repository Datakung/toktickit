import { PrismaClient } from "@prisma/client";
import { seedDatabase } from "../prisma/seed.js";
import { deployTestMigrations } from "./support/deploy-test-migrations.js";

export default async function globalSetup() {
  deployTestMigrations();

  const prisma = new PrismaClient();
  try {
    await seedDatabase(prisma);
  } finally {
    await prisma.$disconnect();
  }
}
