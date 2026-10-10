import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import { TicketDetailPage } from "../../src/TicketDetailPage.js";
import { emptyActionPage, requireMockedNetwork } from "../support/action-fixtures.js";

requireMockedNetwork();

const requester: api.DevelopmentRequester = { id: 2, displayName: "Anan", email: "anan@example.test" };
const detail: api.TicketDetail = {
  id: 8, ticketNumber: "TKT-OPS-8", summary: "VPN unavailable", description: "Cannot connect",
  requestedPriority: "HIGH", itPriority: "MEDIUM", status: "OPEN", version: 3,
  requesterResolutionIndicatedAt: null, createdAt: "2026-09-25T00:00:00Z", updatedAt: "2026-09-25T01:00:00Z",
  requester, owner: null, category: { id: 1, name: "Network" }, relatedSystem: { id: 2, name: "VPN" }, attachments: [],
};

function setup() {
  let current = { ...detail };
  vi.spyOn(api, "getTicket").mockImplementation(async () => current);
  const actions = vi.spyOn(api, "getActions").mockImplementation(async () => emptyActionPage(current.version));
  vi.spyOn(api, "getPublicComments").mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 1 });
  render(<TicketDetailPage requester={requester} ticketId="8" onNavigate={vi.fn()} onRequesterUnavailable={vi.fn()} />);
  return { actions, setTicket(value: api.TicketDetail) { current = value; } };
}

afterEach(() => vi.restoreAllMocks());

describe("Requester communication", () => {
  it("indicates apparent resolution without a formal status change", async () => {
    const fixture = setup();
    const indicate = vi.spyOn(api, "indicateTicketResolution").mockImplementation(async () => {
      const updated: api.TicketDetail = {
        ...detail, version: 4, requesterResolutionIndicatedAt: "2026-09-25T02:00:00Z", updatedAt: "2026-09-25T02:00:00Z",
      };
      fixture.setTicket(updated);
      return updated;
    });
    await screen.findByText("No actions on this page.");
    await userEvent.click(await screen.findByRole("button", { name: "Problem Appears Resolved" }));
    await waitFor(() => expect(indicate).toHaveBeenCalledWith(8, 3));
    expect(await screen.findByText(/You indicated apparent resolution/)).toBeVisible();
    expect(screen.getAllByText("Open").length).toBeGreaterThan(0);
    await waitFor(() => expect(fixture.actions).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole("button", { name: "Refresh actions" })).toBeEnabled());
    expect(await fixture.actions.mock.results[1].value).toEqual(emptyActionPage(4));
  });

  it("shows Public Comments but never requests Internal Notes", async () => {
    const internalNotes = vi.spyOn(api, "getInternalNotes");
    setup();
    expect(await screen.findByRole("heading", { name: "Public Comments" })).toBeVisible();
    await screen.findByText("No actions on this page.");
    expect(screen.queryByText("Internal Notes")).not.toBeInTheDocument();
    expect(internalNotes).not.toHaveBeenCalled();
    expect(api.getActions).toHaveBeenCalledWith(8, 1);
  });
});
