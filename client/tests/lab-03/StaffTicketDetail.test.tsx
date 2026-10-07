import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import { StaffTicketDetailPage } from "../../src/StaffTicketDetailPage.js";
import { emptyActionPage, requireMockedNetwork } from "../support/action-fixtures.js";

requireMockedNetwork();

const detail: api.StaffTicketDetail = {
  id: 8, ticketNumber: "TKT-OPS-8", summary: "VPN unavailable", description: "Cannot connect from home",
  requestedPriority: "HIGH", itPriority: "MEDIUM", status: "OPEN", version: 1,
  requesterResolutionIndicatedAt: null, createdAt: "2026-09-25T00:00:00Z", updatedAt: "2026-09-25T01:00:00Z",
  requester: { id: 2, displayName: "Anan", email: "anan@example.test" }, owner: null,
  category: { id: 1, name: "Network" }, relatedSystem: { id: 2, name: "VPN" }, attachments: [],
};

function setup() {
  let current = { ...detail };
  const actions = vi.spyOn(api, "getActions").mockImplementation(async () => emptyActionPage(current.version));
  vi.spyOn(api, "getActionAssignees").mockResolvedValue({ items: [] });
  vi.spyOn(api, "getStaffTicket").mockImplementation(async () => current);
  vi.spyOn(api, "getStaffOwners").mockResolvedValue({ items: [{ id: 9, displayName: "Mali Support", role: "IT_STAFF" }] });
  vi.spyOn(api, "getPublicComments").mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 1 });
  vi.spyOn(api, "getInternalNotes").mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 1 });
  render(<StaffTicketDetailPage ticketId="8" onNavigate={vi.fn()} />);
  return { actions, setTicket(value: api.StaffTicketDetail) { current = value; } };
}

afterEach(() => vi.restoreAllMocks());

describe("Staff Ticket Detail", () => {
  it("loads safe context and claims using the displayed version", async () => {
    const fixture = setup();
    const claim = vi.spyOn(api, "claimStaffTicket").mockImplementation(async () => {
      const updated: api.StaffTicketDetail = { ...detail, owner: { id: 9, displayName: "Mali Support" }, version: 2 };
      fixture.setTicket(updated);
      return updated;
    });
    expect(await screen.findByRole("heading", { name: "TKT-OPS-8" })).toHaveFocus();
    await waitFor(() => expect(screen.getByRole("button", { name: "Claim Ticket" })).toBeEnabled());
    await userEvent.click(screen.getByRole("button", { name: "Claim Ticket" }));
    await waitFor(() => expect(claim).toHaveBeenCalledWith(8, 1));
    expect(await screen.findByText("Claim saved.")).toBeVisible();
    expect(screen.getAllByText("Mali Support").length).toBeGreaterThan(0);
    await waitFor(() => expect(fixture.actions).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole("button", { name: "Refresh actions" })).toBeEnabled());
    expect(await fixture.actions.mock.results[1].value).toEqual(emptyActionPage(2));
  });

  it("keeps a stale owner choice until explicit reload", async () => {
    const save = vi.spyOn(api, "setStaffTicketOwner").mockRejectedValue(
      new api.ApiError(409, "VERSION_CONFLICT", "This Ticket changed. Reload and review before saving."),
    );
    setup();
    await screen.findByRole("heading", { name: "TKT-OPS-8" });
    await waitFor(() => expect(screen.getByLabelText("Owner")).toBeEnabled());
    await userEvent.selectOptions(screen.getByLabelText("Owner"), "9");
    await userEvent.click(screen.getByRole("button", { name: "Save Owner" }));
    expect(save).toHaveBeenCalledWith(8, 9, 1);
    expect(await screen.findByText(/Ticket changed/)).toBeVisible();
    expect(screen.getByLabelText("Owner")).toHaveValue("9");
    await userEvent.click(screen.getByRole("button", { name: "Reload Ticket" }));
    await waitFor(() => expect(api.getStaffTicket).toHaveBeenCalledTimes(4));
  });

  it("separates Public Comments and Internal Notes", async () => {
    setup();
    expect(await screen.findByRole("heading", { name: "Public Comments" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Internal Notes" })).toBeVisible();
    expect(screen.getByText(/Visible only to IT Staff/)).toBeVisible();
    await screen.findByText("No actions on this page.");
  });
});
