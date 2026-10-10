import { afterEach, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RequesterDashboard } from "../../src/DashboardPage.js";
import * as dashboard from "../../src/dashboard-api.js";
import { ApiError } from "../../src/api.js";
import { dashboardUser, requesterDashboard } from "../support/dashboard-fixtures.js";
afterEach(() => vi.restoreAllMocks());
it("does not fabricate zero counts before loading and focuses the heading", () => {
  vi.spyOn(dashboard, "getRequesterDashboard").mockReturnValue(new Promise(() => {}));
  render(<RequesterDashboard user={dashboardUser} onNavigate={vi.fn()}/>);
  expect(screen.getByRole("status")).toHaveTextContent("Loading dashboard");
  expect(screen.queryByText("0")).not.toBeInTheDocument(); expect(screen.getByRole("heading", { name: "My Dashboard" })).toHaveFocus();
});
it("shows genuine zeros, honest empty states, captured ranges and working drill-downs", async () => {
  vi.spyOn(dashboard, "getRequesterDashboard").mockResolvedValue(requesterDashboard()); const navigate = vi.fn();
  render(<RequesterDashboard user={dashboardUser} onNavigate={navigate}/>);
  const active = await screen.findByRole("link", { name: /Active Tickets 0/ }); expect(active).toHaveAttribute("href", "/tickets?statusGroup=active");
  expect(screen.getByText("No Tickets waiting for you.")).toBeInTheDocument(); expect(screen.getByText(/Snapshot:/)).toHaveTextContent("19:00");
  expect(screen.getByRole("link", { name: /Recently Resolved/ })).toHaveAttribute("href", requesterDashboard().drillDown.recentlyResolved);
  expect(screen.getByRole("link", { name: "View all recent tickets" })).toHaveTextContent(/^View all$/);
  expect(screen.getByRole("link", { name: "View all recent tickets" })).toHaveAttribute("href", requesterDashboard().drillDown.recentTickets);
  expect(screen.getByRole("link", { name: "View all waiting for me" })).toHaveTextContent(/^View all$/);
  expect(screen.getByRole("link", { name: "View all waiting for me" })).toHaveAttribute("href", requesterDashboard().drillDown.attentionTickets);
  await userEvent.click(active); expect(navigate).toHaveBeenCalledWith("/tickets?statusGroup=active");
});
it("retains a labelled old snapshot on refresh failure, retries, but clears protected data on 403", async () => {
  const value = requesterDashboard(); value.metrics.activeTickets = 9;
  const read = vi.spyOn(dashboard, "getRequesterDashboard").mockResolvedValue(value); const user = userEvent.setup();
  render(<RequesterDashboard user={dashboardUser} onNavigate={vi.fn()}/>); await screen.findByRole("link", { name: /Active Tickets 9/ });
  read.mockRejectedValueOnce(new Error("private detail")); await user.click(screen.getByRole("button", { name: "Refresh dashboard" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Not refreshed"); expect(screen.getByRole("link", { name: /Active Tickets 9/ })).toBeInTheDocument();
  expect(screen.queryByText("private detail")).not.toBeInTheDocument(); await user.click(screen.getByRole("button", { name: "Retry dashboard" }));
  await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  read.mockRejectedValueOnce(new ApiError(403, "FORBIDDEN", "Private reason")); await user.click(screen.getByRole("button", { name: "Refresh dashboard" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Your role cannot open"); expect(screen.queryByRole("link", { name: /Active Tickets/ })).not.toBeInTheDocument();
});
it("ignores a late response after changing signed-in identity", async () => {
  let finish!: (value: dashboard.RequesterDashboardData) => void;
  vi.spyOn(dashboard, "getRequesterDashboard").mockReturnValueOnce(new Promise(resolve => { finish = resolve; })).mockResolvedValue(requesterDashboard());
  const view = render(<RequesterDashboard user={dashboardUser} onNavigate={vi.fn()}/>);
  view.rerender(<RequesterDashboard user={{ ...dashboardUser, id: 2, displayName: "Kanya" }} onNavigate={vi.fn()}/>);
  await screen.findByRole("link", { name: /Active Tickets 0/ }); const old = requesterDashboard(); old.metrics.activeTickets = 999; finish(old);
  await waitFor(() => expect(screen.getByRole("link", { name: /Active Tickets 0/ })).toBeInTheDocument()); expect(screen.queryByText("999")).not.toBeInTheDocument();
});
