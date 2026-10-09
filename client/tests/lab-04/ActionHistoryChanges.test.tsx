import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { ActionHistoryChanges } from "../../src/ActionHistoryChanges.js";
import type { ActionEvent } from "../../src/api.js";

const event: ActionEvent = { id: 1, actionId: 12, kind: "EDITED", version: 2,
  actor: { id: 9, displayName: "Mali Support" }, createdAt: "2026-10-09T10:08:00Z", reason: null,
  before: { description: "Investigate VPN", result: "", state: "PLANNED", followUpRequired: true, followUpNote: "Check tomorrow", assigneeId: 10 },
  after: { description: "VPN connection restored", result: "", state: "PLANNED", followUpRequired: false, followUpNote: "Check tomorrow", assigneeId: 10 } };
afterEach(cleanup);
describe("Readable Action audit changes", () => {
  it("shows only changed fields, including Yes to No, without changing the snapshots", () => {
    const original = JSON.stringify(event);
    render(<ActionHistoryChanges event={event} />);
    expect(screen.getByRole("heading", { name: "What changed" })).toBeVisible();
    expect(screen.getAllByRole("term").map(term => term.textContent)).toEqual(["Description", "Follow-up required"]);
    expect(screen.getByText("Investigate VPN")).toBeVisible(); expect(screen.getByText("VPN connection restored")).toBeVisible();
    expect(screen.getByText("Yes")).toBeVisible(); expect(screen.getByText("No")).toBeVisible();
    expect(screen.queryByText("Check tomorrow")).not.toBeInTheDocument(); expect(JSON.stringify(event)).toBe(original);
  });
  it("shows creation's initial details without an empty Before column or internal record IDs", () => {
    render(<ActionHistoryChanges event={{ ...event, kind: "CREATED", version: 1, before: null,
      after: { id: 12, ticketId: 8, description: "Investigate VPN", state: "PLANNED", followUpRequired: false, assigneeId: null, createdById: 9 } }} />);
    expect(screen.getByRole("heading", { name: "Action created" })).toBeVisible();
    expect(screen.queryByText("Before")).not.toBeInTheDocument(); expect(screen.queryByText("After")).not.toBeInTheDocument();
    expect(screen.getByText("Planned")).toBeVisible(); expect(screen.getByText("No")).toBeVisible();
    expect(screen.getByText("Unassigned")).toBeVisible(); expect(screen.getByText("Mali Support")).toBeVisible();
    expect(screen.queryByText("ticketId")).not.toBeInTheDocument();
  });
  it("formats completion state, performer and time with the event actor and Bangkok timezone", () => {
    render(<ActionHistoryChanges event={{ ...event, kind: "COMPLETED", before: { state: "IN_PROGRESS", performedAt: null, performedById: null },
      after: { state: "COMPLETED", performedAt: "2026-10-09T10:08:00Z", performedById: 9 } }} />);
    expect(screen.getByText("In progress")).toBeVisible(); expect(screen.getByText("Completed")).toBeVisible();
    expect(screen.getByText("Mali Support")).toBeVisible(); expect(screen.getByText("9 Oct 2026, 17:08 (Bangkok)")).toBeVisible();
    expect(screen.getAllByText("Not recorded")).toHaveLength(2);
  });
  it("keeps a recorded account ID when no matching actor name is available, including unassignment", () => {
    render(<ActionHistoryChanges event={{ ...event, kind: "ASSIGNED", before: { assigneeId: 10 }, after: { assigneeId: null } }} />);
    expect(screen.getByText("Account #10")).toBeVisible(); expect(screen.getByText("Unassigned")).toBeVisible();
    expect(screen.queryByText("Mali Support")).not.toBeInTheDocument();
  });
  it("renders HTML-like and multiline plain text safely and handles empty values", () => {
    render(<ActionHistoryChanges event={{ ...event, before: { result: "", cancellationReason: null },
      after: { result: "<script>alert(1)</script>\nVerified", cancellationReason: "No longer needed" } }} />);
    expect(screen.getByText(/<script>alert\(1\)<\/script>/)).toBeVisible(); expect(document.querySelector("script")).toBeNull();
    expect(screen.getByText("Not recorded")).toBeVisible(); expect(screen.getByText("None")).toBeVisible();
  });
  it("explains no field differences and handles incomplete legacy snapshots without inventing creation", () => {
    const result = render(<ActionHistoryChanges event={{ ...event, before: event.after }} />);
    expect(screen.getByText(/No field changes recorded/)).toBeVisible();
    result.rerender(<ActionHistoryChanges event={{ ...event, before: null, after: { description: "Legacy change", actionAt: "invalid-time" } }} />);
    expect(screen.getByRole("heading", { name: "What changed" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Action created" })).not.toBeInTheDocument();
    expect(screen.getByText("invalid-time")).toBeVisible();
    const description = screen.getByText("Description").closest("div")!;
    expect(within(description).getByText("Not recorded")).toBeVisible();
  });
});
