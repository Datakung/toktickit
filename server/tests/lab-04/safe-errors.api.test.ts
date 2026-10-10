import request from "supertest";
import { expect, it, vi } from "vitest";
import { app } from "../../src/app.js";
import { actionPath, createBody, db, login, origin, setupActionFixture, ticket, user, write } from "./action-fixture.js";

setupActionFixture();
const canary = "quality-gate-internal-error-canary";

it.each(["REQUESTER", "IT_STAFF", "ADMINISTRATOR"] as const)("%s dashboard fails safely then recovers without fabricated totals", async role => {
  const actor = await user(role), session = await login(actor);
  await ticket("OPEN", role === "REQUESTER" ? actor.id : undefined);
  const route = role === "REQUESTER" ? "/api/dashboard/requester" : "/api/dashboard/staff";
  const before = await session.agent.get(route);
  expect(before.status).toBe(200);
  const failure = vi.spyOn(db, "$transaction").mockRejectedValueOnce(new Error(canary));
  try {
    const response = await session.agent.get(route);
    expect(response.status).toBe(500);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body).toEqual({ error: { code: "DASHBOARD_LOAD_FAILED", message: "The dashboard could not be loaded. Try again." } });
    expect(JSON.stringify(response.body)).not.toContain(canary);
    expect(response.body.metrics).toBeUndefined();
  } finally { failure.mockRestore(); }
  expect((await request(app).get("/api/health")).status).toBe(200);
  const recovered = await session.agent.get(route);
  expect(recovered.status).toBe(200);
  expect(recovered.body.metrics).toEqual(before.body.metrics);
});

it("failed action create returns a safe error with no partial write and retries exactly once", async () => {
  const session = await login(await user()), parent = await ticket(), payload = createBody();
  const failure = vi.spyOn(db, "$transaction").mockRejectedValueOnce(new Error(canary));
  try {
    const response = await write(session, actionPath(parent.id), "post", payload);
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: { code: "ACTION_OPERATION_FAILED", message: "The action operation is unavailable. Try again." } });
    expect(JSON.stringify(response.body)).not.toContain(canary);
  } finally { failure.mockRestore(); }
  expect(await db.actionTaken.count()).toBe(0);
  expect(await db.actionTakenEvent.count()).toBe(0);
  expect(await db.actionWriteReceipt.count()).toBe(0);
  expect((await db.ticket.findUniqueOrThrow({ where: { id: parent.id } })).version).toBe(parent.version);
  expect((await request(app).get("/api/health")).status).toBe(200);
  expect((await write(session, actionPath(parent.id), "post", payload)).status).toBe(201);
  expect((await write(session, actionPath(parent.id), "post", payload)).status).toBe(200);
  expect(await db.actionTaken.count()).toBe(1);
  expect(await db.actionTakenEvent.count()).toBe(1);
  expect(await db.actionWriteReceipt.count()).toBe(1);
});

it("malformed JSON has generic feedback and does not make the service unhealthy", async () => {
  const session = await login(await user()), parent = await ticket();
  const response = await session.agent.post(actionPath(parent.id)).set("Origin", origin).set("X-CSRF-Token", session.token)
    .set("Content-Type", "application/json").send('{"description":"' + canary);
  expect(response.status).toBe(400);
  expect(response.body).toEqual({ error: { code: "INVALID_JSON", message: "Request body must be valid JSON." } });
  expect(JSON.stringify(response.body)).not.toContain(canary);
  expect(await db.actionTaken.count()).toBe(0);
  expect((await request(app).get("/api/health")).status).toBe(200);
});
