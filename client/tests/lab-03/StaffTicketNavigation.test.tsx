import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import { StaffTicketDetailPage } from "../../src/StaffTicketDetailPage.js";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

const first: api.StaffTicketDetail = {
  id: 8, ticketNumber: "TKT-OPS-8", summary: "Old ticket", description: "Old detail",
  requestedPriority: "HIGH", itPriority: "MEDIUM", status: "OPEN", version: 1,
  requesterResolutionIndicatedAt: null, createdAt: "2026-09-25T00:00:00Z", updatedAt: "2026-09-25T01:00:00Z",
  requester: { id: 2, displayName: "Anan", email: "anan@example.test" }, owner: null,
  category: { id: 1, name: "Network" }, relatedSystem: { id: 2, name: "VPN" }, attachments: [],
};
const second: api.StaffTicketDetail = { ...first, id: 9, ticketNumber: "TKT-OPS-9", summary: "New ticket" };

function mockCommunications() {
  const empty = { items: [], page: 1, pageSize: 20, total: 0, totalPages: 1 };
  vi.spyOn(api, "getStaffOwners").mockResolvedValue({ items: [] });
  vi.spyOn(api, "getPublicComments").mockResolvedValue(empty);
  vi.spyOn(api, "getInternalNotes").mockResolvedValue(empty);
}

afterEach(() => vi.restoreAllMocks());

describe("Staff Ticket navigation", () => {
  it("ignores an old detail response that arrives after the new ticket", async () => {
    mockCommunications();
    const old = deferred<api.StaffTicketDetail>();
    vi.spyOn(api, "getStaffTicket").mockImplementation(id => id === "8" ? old.promise : Promise.resolve(second));
    const view = render(<StaffTicketDetailPage ticketId="8" onNavigate={vi.fn()} />);
    view.rerender(<StaffTicketDetailPage ticketId="9" onNavigate={vi.fn()} />);
    expect(await screen.findByRole("heading", { name: "TKT-OPS-9" })).toBeVisible();
    await act(async () => { old.resolve(first); });
    expect(screen.queryByRole("heading", { name: "TKT-OPS-8" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "TKT-OPS-9" })).toBeVisible();
  });

  it("ignores an old action response after moving to another ticket", async () => {
    mockCommunications();
    vi.spyOn(api, "getStaffTicket").mockImplementation(id => Promise.resolve(id === "8" ? first : second));
    const claim = deferred<api.StaffTicketDetail>();
    vi.spyOn(api, "claimStaffTicket").mockReturnValue(claim.promise);
    const view = render(<StaffTicketDetailPage ticketId="8" onNavigate={vi.fn()} />);
    await screen.findByRole("heading", { name: "TKT-OPS-8" });
    await userEvent.click(screen.getByRole("button", { name: "Claim Ticket" }));
    view.rerender(<StaffTicketDetailPage ticketId="9" onNavigate={vi.fn()} />);
    expect(await screen.findByRole("heading", { name: "TKT-OPS-9" })).toBeVisible();
    await act(async () => { claim.resolve({ ...first, owner: { id: 4, displayName: "Mali" }, version: 2 }); });
    expect(screen.queryByText("Claim saved.")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "TKT-OPS-9" })).toBeVisible();
  });
});
