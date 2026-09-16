import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import { StaffTicketQueuePage } from "../../src/StaffTicketQueuePage.js";
const item: api.QueueItem = { id: 7, ticketNumber: "TKT-QUEUE-7", summary: "VPN unavailable", requestedPriority: "HIGH", itPriority: "MEDIUM", status: "IN_PROGRESS", createdAt: "2026-09-16T00:00:00Z", updatedAt: "2026-09-16T01:00:00Z", version: 1, requester: { id: 2, displayName: "Anan Requester" }, owner: null, category: { id: 1, name: "Network" }, relatedSystem: { id: 2, name: "VPN" } };
const response: api.QueueResponse = { items: [item], page: 1, pageSize: 10, total: 1, totalPages: 1 };
beforeEach(() => {
  vi.spyOn(api, "getCategories").mockResolvedValue([{ id: 1, name: "Network" }]);
  vi.spyOn(api, "getRelatedSystems").mockResolvedValue([{ id: 2, name: "VPN" }]);
  vi.spyOn(api, "getStaffOwners").mockResolvedValue({ items: [{ id: 3, displayName: "Mali Support", role: "IT_STAFF" }] });
  vi.spyOn(api, "getStaffQueue").mockResolvedValue(response);
});
afterEach(() => vi.restoreAllMocks());
describe("Staff Ticket Queue", () => {
  it("renders a useful unassigned summary and detail action", async () => {
    const navigate = vi.fn(); render(<StaffTicketQueuePage onNavigate={navigate}/>);
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
    expect(await screen.findByText("TKT-QUEUE-7")).toBeInTheDocument();
    expect(screen.getByText("Anan Requester")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Unassigned" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "In Progress" })).toBeInTheDocument(); expect(screen.getByText("HIGH")).toBeInTheDocument(); expect(screen.getByText("MEDIUM")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("link", { name: "Open TKT-QUEUE-7" }));
    expect(navigate).toHaveBeenCalledWith("/staff/tickets/7");
  });
  it("combines filters, resets page and clears controls", async () => {
    const user = userEvent.setup(); render(<StaffTicketQueuePage onNavigate={vi.fn()}/>); await screen.findByText("TKT-QUEUE-7");
    await user.type(screen.getByLabelText("Ticket Number or Summary"), "vpn"); await user.click(screen.getByRole("button", { name: "Search" }));
    await user.selectOptions(screen.getByLabelText("Owner"), "3"); await user.selectOptions(screen.getByLabelText("Assignment"), "true");
    expect(screen.getByLabelText("Owner")).toHaveValue("");
    await user.selectOptions(screen.getByLabelText("Status"), "IN_PROGRESS"); await user.selectOptions(screen.getByLabelText("IT Priority"), "HIGH");
    await waitFor(() => expect(api.getStaffQueue).toHaveBeenLastCalledWith(expect.objectContaining({ q: "vpn", unassigned: "true", status: "IN_PROGRESS", itPriority: "HIGH", page: 1 })));
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(api.getStaffQueue).toHaveBeenLastCalledWith(expect.objectContaining({ q: "", unassigned: "", status: "", itPriority: "" })));
  });
  it("shows empty and recoverable failure states", async () => {
    vi.mocked(api.getStaffQueue).mockResolvedValueOnce({ ...response, items: [], total: 0 });
    const { unmount } = render(<StaffTicketQueuePage onNavigate={vi.fn()}/>);
    expect(await screen.findByText("No tickets in the queue.")).toBeInTheDocument(); unmount();
    vi.mocked(api.getStaffQueue).mockRejectedValueOnce(new api.ApiError(500, "QUEUE_LOAD_FAILED", "Safe queue failure")).mockResolvedValue(response);
    render(<StaffTicketQueuePage onNavigate={vi.fn()}/>);
    expect(await screen.findByRole("alert")).toHaveTextContent("Safe queue failure");
    await userEvent.setup().click(screen.getByRole("button", { name: "Retry queue" }));
    expect(await screen.findByText("TKT-QUEUE-7")).toBeInTheDocument();
  });
  it("retains controls while reference choices fail and retries", async () => {
    vi.mocked(api.getStaffOwners).mockRejectedValueOnce(new Error("private"));
    render(<StaffTicketQueuePage onNavigate={vi.fn()}/>);
    const alert = await screen.findByRole("alert"); expect(alert).not.toHaveTextContent("private");
    await userEvent.setup().click(screen.getByRole("button", { name: "Retry filter choices" }));
    await waitFor(() => expect(api.getStaffOwners).toHaveBeenCalledTimes(2));
  });
});
