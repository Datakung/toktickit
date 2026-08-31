import type { PrismaClient } from "@prisma/client";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPrisma } from "../src/prisma.js";

export async function seedDatabase(prisma: PrismaClient = getPrisma()) {
  const categories = [
    { name: "Account and Access" },
    { name: "Hardware" },
    { name: "Software" },
    { name: "Network" },
  ];
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: { isActive: true },
      create: { name: cat.name, isActive: true },
    });
  }

  const relatedSystems = [
    "Email and Collaboration",
    "Finance and ERP",
    "Human Resources",
    "Learning Management",
    "Network and VPN",
    "Student Information System",
  ];

  for (const name of relatedSystems) {
    await prisma.relatedSystem.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }

  const requesters = [
    {
      displayName: "Anan Chaiyasit",
      email: "anan.chaiyasit@example.test",
      isActive: true,
    },
    {
      displayName: "Kanya Srisuk",
      email: "kanya.srisuk@example.test",
      isActive: true,
    },
    {
      displayName: "Narin Wongsa",
      email: "narin.wongsa@example.test",
      isActive: true,
    },
    {
      displayName: "Ploy Rattanakul",
      email: "ploy.rattanakul@example.test",
      isActive: true,
    },
    {
      displayName: "Somchai Inactive",
      email: "somchai.inactive@example.test",
      isActive: false,
    },
  ];

  for (const requester of requesters) {
    await prisma.requesterUser.upsert({
      where: { email: requester.email },
      update: {
        displayName: requester.displayName,
        isActive: requester.isActive,
      },
      create: requester,
    });
  }
}

async function main() {
  const prisma = getPrisma();
  await seedDatabase(prisma);
  console.log("Lab 2 seed completed.");
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const modulePath = path.resolve(fileURLToPath(import.meta.url));

if (entryPath === modulePath) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await getPrisma().$disconnect();
    });
}
