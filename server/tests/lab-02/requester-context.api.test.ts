import express from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { app } from "../../src/app.js";
import {
  developmentRequesterContext,
  type DevelopmentRequesterLocals,
} from "../../src/middleware/development-requester-context.js";
import { getPrisma } from "../../src/prisma.js";
import { seedDatabase } from "../../prisma/seed.js";

const prisma = getPrisma();
let requesterId: number;

beforeAll(async () => {
  await seedDatabase(prisma);
  requesterId = (await prisma.user.findFirstOrThrow({ where: { role: "REQUESTER", isActive: true }, orderBy: { id: "asc" } })).id;
});

afterAll(async () => {
  await prisma.category.deleteMany({
    where: { name: "Retired Test Category" },
  });
  await prisma.relatedSystem.deleteMany({
    where: { name: "Retired Test System" },
  });
});

describe("Lab 2 reference and requester APIs", () => {
  it("keeps the four active Lab 1 categories in stable ID order", async () => {
    await prisma.category.upsert({
      where: { name: "Retired Test Category" },
      update: { isActive: false },
      create: { name: "Retired Test Category", isActive: false },
    });

    const response = await request(app).get("/api/categories").set("X-Development-Requester-Id", String(requesterId));

    expect(response.status).toBe(200);
    expect(response.body.map((item: { name: string }) => item.name)).toEqual([
      "Account and Access",
      "Hardware",
      "Software",
      "Network",
    ]);
    expect(response.body).not.toContainEqual(
      expect.objectContaining({ name: "Retired Test Category" }),
    );
    const ids = response.body.map((item: { id: number }) => item.id);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
  });

  it("returns only active Related Systems in deterministic name order", async () => {
    await prisma.relatedSystem.upsert({
      where: { name: "Retired Test System" },
      update: { isActive: false },
      create: { name: "Retired Test System", isActive: false },
    });

    const response = await request(app).get("/api/related-systems").set("X-Development-Requester-Id", String(requesterId));

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(6);
    expect(response.body).not.toContainEqual(
      expect.objectContaining({ name: "Retired Test System" }),
    );
    const names = response.body.map((item: { name: string }) => item.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("removes the Development Requester lookup endpoint", async () => {
    const response = await request(app).get("/api/development-requesters");
    expect(response.status).toBe(404);
  });

  it("is idempotent when the approved seed runs repeatedly", async () => {
    const before = {
      categories: await prisma.category.count(),
      systems: await prisma.relatedSystem.count(),
      requesters: await prisma.user.count(),
    };

    await seedDatabase(prisma);
    await seedDatabase(prisma);

    await expect(prisma.category.count()).resolves.toBe(before.categories);
    await expect(prisma.relatedSystem.count()).resolves.toBe(before.systems);
    await expect(prisma.user.count()).resolves.toBe(before.requesters);
  });

});

describe("Development Requester context middleware", () => {
  const scopedApp = express();

  scopedApp.get(
    "/probe",
    developmentRequesterContext,
    (_request, response: express.Response<unknown, DevelopmentRequesterLocals>) => {
      const requester = response.locals.developmentRequester;
      response.status(200).json({
        id: requester.id,
        displayName: requester.displayName,
        email: requester.email,
      });
    },
  );

  it.each([
    undefined,
    "0",
    "-1",
    "1.5",
    "abc",
    "2147483648",
    "9007199254740992",
  ])(
    "does not accept invalid legacy header value %s as authentication",
    async (header) => {
      const call = request(scopedApp).get("/probe");
      if (header !== undefined) call.set("X-Development-Requester-Id", header);

      const response = await call;

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message: "Sign in to continue.",
        },
      });
    },
  );

  it("returns 403 for an inactive Requester", async () => {
    const inactive = await prisma.user.findFirstOrThrow({
      where: { isActive: false, role: "REQUESTER" },
    });

    const response = await request(scopedApp)
      .get("/probe")
      .set("X-Development-Requester-Id", String(inactive.id));

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("REQUESTER_UNAVAILABLE");
  });

  it("accepts an active Requester and exposes only the validated context", async () => {
    const active = await prisma.user.findFirstOrThrow({
      where: { isActive: true, role: "REQUESTER" },
      orderBy: { id: "asc" },
    });

    const response = await request(scopedApp)
      .get("/probe")
      .set("X-Development-Requester-Id", String(active.id));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: active.id,
      displayName: active.displayName,
      email: active.email,
    });
  });
});
