import { afterEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readListSearch, listSearch } from "../../src/list-url.js";
import { MyTicketsPage, defaultTicketListQuery } from "../../src/MyTicketsPage.js";
import { StaffTicketQueuePage, defaultQueueQuery } from "../../src/StaffTicketQueuePage.js";
import { StaffActionsPage } from "../../src/StaffActionsPage.js";
import * as api from "../../src/api.js";
import * as dashboards from "../../src/dashboard-api.js";
import { dashboardUser } from "../support/dashboard-fixtures.js";
afterEach(() => vi.restoreAllMocks());
it.each(["status=NEW&status=OPEN", "statusGroup=active&status=NEW", "updatedSince=2026-10-01T00:00:00Z", "updatedSince=2026-02-30T00:00:00Z&updatedUntil=2026-10-01T00:00:00Z", "resolvedSince=2026-10-01T00:00:00Z&resolvedUntil=2026-10-10T00:00:00Z", "page=99999999999999999", "requesterId=2"])("fails closed on malformed dashboard-list URL %s", search => {
  expect(readListSearch(search, defaultTicketListQuery, "requester").error).not.toBe("");
});
it("round-trips captured ranges, owner and pagination without moving the timestamps", () => {
  const search = "ownerId=12&statusGroup=active&updatedSince=2026-10-03T12%3A00%3A00.000Z&updatedUntil=2026-10-10T12%3A00%3A00.000Z&page=2";
  const parsed = readListSearch(search, defaultQueueQuery, "staff"); expect(parsed.error).toBe(""); expect(parsed.query.ownerId).toBe("12");
  expect(readListSearch(listSearch(parsed.query), defaultQueueQuery, "staff").query).toEqual(parsed.query);
});
it("omits cleared optional queue filters instead of sending the text undefined", async () => {
  const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ items: [], page: 1, pageSize: 10, total: 0, totalPages: 1 }), { status: 200, headers: { "Content-Type": "application/json" } }));
  await api.getStaffQueue({ ...defaultQueueQuery, statusGroup: undefined, updatedSince: undefined, updatedUntil: undefined });
  const url = new URL(String(fetch.mock.calls[0][0])); expect(url.searchParams.has("statusGroup")).toBe(false); expect(url.searchParams.has("updatedSince")).toBe(false); expect(url.href).not.toContain("undefined");
});
function references() { vi.spyOn(api, "getCategories").mockResolvedValue([]); vi.spyOn(api, "getRelatedSystems").mockResolvedValue([]); vi.spyOn(api, "getStaffOwners").mockResolvedValue({ items: [] }); }
it("hydrates the Requester status-group control and retains it when paging", async () => {
  references(); const read = vi.spyOn(api, "getTickets").mockResolvedValue({ data: [{ id: 1, ticketNumber: "TKT-1", summary: "Help", category: { id: 1, name: "A" }, relatedSystem: { id: 1, name: "B" }, requestedPriority: "HIGH", itPriority: "HIGH", status: "OPEN", createdAt: "2026-10-10T12:00:00Z", updatedAt: "2026-10-10T12:00:00Z" }], meta: { page: 1, pageSize: 10, totalItems: 20, totalPages: 2, search: "", filters: { categoryId: null, relatedSystemId: null, requestedPriority: null, status: null }, sort: "updatedAt", direction: "desc" } }); const navigate = vi.fn();
  render(<MyTicketsPage requester={dashboardUser} urlSearch="statusGroup=active" onNavigate={navigate} onRequesterUnavailable={vi.fn()}/>);
  await screen.findByText("20 Tickets"); expect(read).toHaveBeenCalledWith(1, expect.objectContaining({ statusGroup: "active" })); expect(screen.getByLabelText("Status filter")).toHaveValue("active");
  await userEvent.click(screen.getByRole("button", { name: "Next" })); const search = navigate.mock.calls[0][0].split("?")[1]; expect(new URLSearchParams(search).get("statusGroup")).toBe("active"); expect(new URLSearchParams(search).get("page")).toBe("2");
});
it("does not request an unfiltered queue for an invalid URL", async () => {
  references(); const read = vi.spyOn(api, "getStaffQueue"); render(<StaffTicketQueuePage urlSearch="ownerId=1&unassigned=true" onNavigate={vi.fn()}/>);
  expect(await screen.findByRole("alert")).toHaveTextContent("owner or unassigned"); expect(read).not.toHaveBeenCalled();
});
it("renders malformed Requester date feedback without formatting invalid timestamps or fetching Tickets", async () => {
  references(); const read = vi.spyOn(api, "getTickets"); render(<MyTicketsPage requester={dashboardUser} urlSearch="updatedSince=invalid&updatedUntil=invalid" onNavigate={vi.fn()} onRequesterUnavailable={vi.fn()}/>);
  expect(await screen.findByRole("alert")).toHaveTextContent("two valid ISO timestamps"); expect(read).not.toHaveBeenCalled();
});
it("fetches current-user work and opens the intended action", async () => {
  vi.spyOn(dashboards, "getActionWork").mockResolvedValue({ items: [{ id: 23, actionNumber: 3, ticketId: 7, ticketNumber: "TKT-7", summary: "Work", state: "PLANNED", assignee: null, performedBy: null, performedAt: null, cycle: 2, ticketStatus: "OPEN", version: 1 }], page: 1, pageSize: 20, total: 1, totalPages: 1 }); const navigate = vi.fn();
  render(<StaffActionsPage urlSearch="assignedTo=me&stateGroup=active" onNavigate={navigate}/>);
  await userEvent.click(await screen.findByRole("link", { name: "View Action 3" })); expect(navigate).toHaveBeenCalledWith("/staff/tickets/7?tab=actions&actionId=23");
});
