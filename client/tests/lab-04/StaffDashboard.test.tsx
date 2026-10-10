import { afterEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StaffDashboard, DashboardLink } from "../../src/DashboardPage.js";
import * as dashboard from "../../src/dashboard-api.js";
import { dashboardUser, staffDashboard } from "../support/dashboard-fixtures.js";
afterEach(() => vi.restoreAllMocks());
it.each(["IT_STAFF", "ADMINISTRATOR"] as const)("%s sees all explicit zero groups and current-user work links, not Requester creation", async role => {
  const data = staffDashboard(); data.metrics.myAssignedActions = 3;
  data.recentPerformedActions = [{ id: 25, actionNumber: 2, ticketId: 4, ticketNumber: "TKT-4", summary: "Checked router", state: "COMPLETED", performedAt: data.asOf }];
  vi.spyOn(dashboard, "getStaffDashboard").mockResolvedValue(data);
  render(<StaffDashboard user={{ ...dashboardUser, role }} onNavigate={vi.fn()}/>);
  expect(await screen.findByRole("link", { name: /My Assigned Actions 3/ })).toHaveAttribute("href", data.drillDown.myAssignedActions);
  expect(screen.getByRole("link", { name: "Closed 0" })).toHaveAttribute("href", "/staff/tickets?status=CLOSED");
  expect(screen.getByRole("link", { name: "HIGH 0" })).toHaveAttribute("href", "/staff/tickets?statusGroup=active&itPriority=HIGH");
  expect(screen.getByRole("link", { name: /TKT-4 · Action 2/ })).toHaveAttribute("href", "/staff/tickets/4?tab=actions&actionId=25");
  expect(screen.getByRole("link", { name: "View all my performed actions" })).toHaveTextContent(/^View all$/);
  expect(screen.getByRole("link", { name: "View all my performed actions" })).toHaveAttribute("href", data.drillDown.recentPerformedActions);
  expect(screen.getByRole("link", { name: "View all recent tickets" })).toHaveTextContent(/^View all$/);
  expect(screen.getByRole("link", { name: "View all recent tickets" })).toHaveAttribute("href", data.drillDown.recentTickets);
  expect(screen.queryByRole("link", { name: "Create Ticket" })).not.toBeInTheDocument();
});
it.each(["https://example.test", "/staff/tickets?ownerId=1&unassigned=true", "/tickets?requesterId=2", "/tickets?status=NEW&status=OPEN"])("refuses an unsupported link %s", href => {
  render(<DashboardLink href={href} onNavigate={vi.fn()}>Metric</DashboardLink>); expect(screen.queryByRole("link")).not.toBeInTheDocument(); expect(screen.getByText(/link unavailable/)).toBeInTheDocument();
});
