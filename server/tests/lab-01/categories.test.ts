import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("GET /api/categories", () => {
  it("returns the four seeded categories in id order", async () => {
    const requester = await getPrisma().user.findFirstOrThrow({ where: { role: "REQUESTER", isActive: true } });
    const res = await request(app).get("/api/categories").set("X-Development-Requester-Id", String(requester.id));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(4);

    expect(
      res.body.map((category: { name: string }) => category.name),
    ).toEqual([
      "Account and Access",
      "Hardware",
      "Software",
      "Network",
    ]);

    const ids = res.body.map((category: { id: number }) => category.id);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
  });
});
