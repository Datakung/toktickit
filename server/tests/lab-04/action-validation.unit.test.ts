import { describe, expect, it } from "vitest";
import { parseActionWrite, parseActionPage, parseWorkQuery } from "../../src/actions/action-validation.js";

const fields = { actionAt: "2026-10-05T12:00:00+07:00", description: " Fix ", result: "", followUpRequired: false, followUpNote: "", attachmentNotes: "" };
const create = { ...fields, assigneeId: null, ticketVersion: 1, requestId: "12345678-1234-4234-8234-123456789abc" };
describe("Action validation (UNIT-01)", () => {
  it("normalizes text and equivalent offset instants without accepting backend identity", () => {
    expect(parseActionWrite("create", create)).toMatchObject({ description: "Fix", actionAt: new Date("2026-10-05T05:00:00Z") });
    expect(() => parseActionWrite("create", { ...create, performedById: 1 })).toThrow();
  });
  it.each([{ description: " " }, { description: "x".repeat(4001) }, { result: "x".repeat(4001) }, { attachmentNotes: "x".repeat(2001) }, { followUpRequired: "false" }, { followUpRequired: true }, { actionAt: "2026-10-05T12:00" }, { actionAt: "2026-02-30T12:00:00Z" }, { requestId: "bad" }, { ticketVersion: 2147483648 }, { assigneeId: 0 }])("rejects invalid fields %j", change => {
    expect(() => parseActionWrite("create", { ...create, ...change })).toThrow();
  });
  it("accepts exact bounds and strict independent field/assignment contracts", () => {
    expect(parseActionWrite("create", { ...create, description: "x".repeat(4000), followUpRequired: true, followUpNote: "x".repeat(2000) })).toHaveProperty("description");
    const edit = { ...fields, version: 1, ticketVersion: 1, requestId: create.requestId, changeReason: "" };
    expect(parseActionWrite("edit", edit)).toHaveProperty("version", 1);
    expect(() => parseActionWrite("edit", { ...edit, assigneeId: 1 })).toThrow();
    expect(() => parseActionWrite("assign", { assigneeId: 1, version: 1, ticketVersion: 1, requestId: create.requestId, description: "bad" })).toThrow();
  });
  it("validates transition-specific result and cancellation reason", () => {
    const base = { version: 1, ticketVersion: 1, requestId: create.requestId, result: "", cancellationReason: "" };
    expect(() => parseActionWrite("state", { ...base, state: "COMPLETED" })).toThrow();
    expect(() => parseActionWrite("state", { ...base, state: "CANCELLED" })).toThrow();
    expect(parseActionWrite("state", { ...base, state: "CANCELLED", cancellationReason: "Duplicate work" })).toHaveProperty("state", "CANCELLED");
  });
  it("rejects non-scalar/unknown/unsafe page and work queries", () => {
    expect(parseActionPage({})).toEqual({ page: 1, pageSize: 20 });
    for (const q of [{ page: ["1", "2"] }, { page: "2147483648" }, { pageSize: "5" }, { cycle: "1" }]) expect(() => parseActionPage(q)).toThrow();
    for (const q of [{ assignedTo: "1" }, { assignedTo: "me", performedBy: "me" }, { state: "PLANNED", stateGroup: "active" }, { performedSince: "2026-10-05T00:00:00Z" }]) expect(() => parseWorkQuery(q)).toThrow();
  });
});
