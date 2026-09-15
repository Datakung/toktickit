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
      update: {},
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
      update: {},
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
    await prisma.user.upsert({
      where: { email: requester.email },
      update: {},
      create: requester,
    });
  }

  const staff = [
    { displayName: "Mali Support", email: "mali.support@example.test", isActive: true },
    { displayName: "Wichai Support", email: "wichai.support@example.test", isActive: true },
    { displayName: "Suda Support", email: "suda.support@example.test", isActive: true },
    { displayName: "Retired Support", email: "retired.support@example.test", isActive: false },
  ];
  for (const user of staff) {
    await prisma.user.upsert({ where: { email: user.email }, update: {}, create: { ...user, role: "IT_STAFF" } });
  }
  await prisma.user.upsert({
    where: { email: "admin@example.test" }, update: {},
    create: { displayName: "Local Administrator", email: "admin@example.test", role: "ADMINISTRATOR" },
  });
}

async function main() {
  const prisma = getPrisma();
  await seedDatabase(prisma);
  console.log("Lab 3 account/reference seed completed. Provision initial credentials separately.");
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
