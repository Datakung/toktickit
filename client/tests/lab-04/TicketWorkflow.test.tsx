import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import * as api from "../../src/api.js";
import { StaffTicketDetailPage } from "../../src/StaffTicketDetailPage.js";
import { WorkflowHistory } from "../../src/WorkflowHistory.js";
import { ResolutionChecklist } from "../../src/ResolutionChecklist.js";
import { emptyActionPage, emptyWorkflowHistory, requireMockedNetwork } from "../support/action-fixtures.js";
requireMockedNetwork();
const ticket: api.StaffTicketDetail = {
  id: 8, ticketNumber: "TKT-WORKFLOW-8", summary: "VPN fix", description: "Cannot connect", status: "OPEN", version: 1,
  resolutionCycle: 1, resolvedAt: null, requesterResolutionIndicatedAt: null,
  createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z", requestedPriority: "HIGH", itPriority: "MEDIUM",
  requester: { id: 2, displayName: "Anan", email: "anan@example.test" }, owner: null,
  category: { id: 1, name: "Network" }, relatedSystem: { id: 1, name: "VPN" }, attachments: [],
};
const ready = (): api.ActionPage => ({ ...emptyActionPage(1), resolutionGate: { cycle: 1, completedCount: 1, unfinishedCount: 0, outstandingFollowUpCount: 0, meetsActionRequirements: true } });
function setup(summary: api.ActionPage | Promise<api.ActionPage> = ready(), detail = ticket) {
  let current = detail;
  vi.spyOn(api, "getStaffTicket").mockImplementation(async () => current);
  vi.spyOn(api, "getStaffOwners").mockResolvedValue({ items: [] });
  vi.spyOn(api, "getActionAssignees").mockResolvedValue({ items: [] });
  const actions = vi.spyOn(api, "getActions").mockImplementation(async () => summary);
  const comments: api.EntryPage = { items: [], page: 1, pageSize: 20, total: 0, totalPages: 1 };
  vi.spyOn(api, "getPublicComments").mockResolvedValue(comments);
  vi.spyOn(api, "getInternalNotes").mockResolvedValue(comments);
  const view = render(<StaffTicketDetailPage ticketId="8" onNavigate={vi.fn()} />);
  return { actions, view, update(value: api.StaffTicketDetail) { current = value; } };
}
async function select(value = "RESOLVED") {
  await screen.findByRole("heading", { name: "TKT-WORKFLOW-8" });
  await waitFor(() => expect(screen.getByRole("button", { name: "Refresh actions" })).toBeEnabled());
  await waitFor(() => expect(screen.getByLabelText("Change status to", { exact: true })).toBeEnabled());
  await userEvent.selectOptions(screen.getByLabelText("Change status to", { exact: true }), value);
  expect(screen.getByLabelText("Change status to", { exact: true })).toHaveValue(value);
}
it.each([
  { status: "NEW", next: ["OPEN", "CANCELLED"] },
  { status: "OPEN", next: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"] },
  { status: "IN_PROGRESS", next: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"] },
  { status: "WAITING_FOR_REQUESTER", next: ["IN_PROGRESS", "RESOLVED", "CANCELLED"] },
  { status: "RESOLVED", next: ["CLOSED", "REOPENED"] },
  { status: "CLOSED", next: ["REOPENED"] },
  { status: "REOPENED", next: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"] },
  { status: "CANCELLED", next: [] },
] as { status: api.TicketStatus; next: api.TicketStatus[] }[])("keeps current $status separate and preserves every valid next status", async ({ status, next }) => {
  const save = vi.spyOn(api, "setStaffTicketStatus");
  setup(ready(), { ...ticket, status });
  await screen.findByRole("heading", { name: "TKT-WORKFLOW-8" });
  await waitFor(() => expect(screen.getByRole("button", { name: "Refresh actions" })).toBeEnabled());
  expect(screen.getByRole("group", { name: "Current status" })).toHaveTextContent(api.statusLabel(status));
  const change = screen.getByLabelText(status === "NEW" ? "Choose an action" : "Change status to", { exact: true });
  expect(change).toHaveValue("");
  expect(within(change).getAllByRole("option").map(option => (option as HTMLOptionElement).value)).toEqual(["", ...next]);
  expect(screen.getByRole("button", { name: status === "NEW" ? "Open Ticket" : "Save Status" })).toBeDisabled();
  expect(save).not.toHaveBeenCalled();
  if (!next.length) expect(change).toBeDisabled();
});
it("keeps saved status visible during and after opening, without choosing the following transition", async () => {
  const f = setup(ready(), { ...ticket, status: "NEW" });
  let finish!: (value: api.StaffTicketDetail) => void;
  const save = vi.spyOn(api, "setStaffTicketStatus").mockReturnValue(new Promise(resolve => { finish = resolve; }));
  await screen.findByRole("heading", { name: "TKT-WORKFLOW-8" });
  await waitFor(() => expect(screen.getByRole("button", { name: "Refresh actions" })).toBeEnabled());
  await screen.findByRole("heading", { name: "Open ticket" });
  expect(screen.queryByRole("heading", { name: "Update ticket status" })).not.toBeInTheDocument();
  let change = screen.getByLabelText("Choose an action", { exact: true });
  await userEvent.selectOptions(change, "OPEN");
  expect(screen.getByRole("group", { name: "Current status" })).toHaveTextContent("New");
  expect(screen.getByText("New → Open. Not saved yet.")).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Open Ticket" }));
  expect(save).toHaveBeenCalledWith(8, "OPEN", 1);
  expect(screen.getByRole("group", { name: "Current status" })).toHaveTextContent("New");
  const opened = { ...ticket, version: 2 }; f.update(opened);
  f.actions.mockResolvedValue({ ...ready(), ticketVersion: 2 });
  await act(async () => finish(opened));
  await screen.findByText("Status saved.");
  await waitFor(() => expect(screen.getByRole("button", { name: "Refresh actions" })).toBeEnabled());
  expect(screen.queryByRole("heading", { name: "Open ticket" })).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Update ticket status" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Update ticket status" })).toHaveFocus();
  change = screen.getByLabelText("Change status to", { exact: true });
  expect(screen.getByRole("group", { name: "Current status" })).toHaveTextContent("Open");
  expect(change).toHaveValue("");
  expect(within(change).getAllByRole("option").map(option => (option as HTMLOptionElement).value))
    .toEqual(["", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"]);
  expect(screen.getByRole("button", { name: "Save Status" })).toBeDisabled();
  await userEvent.selectOptions(change, "IN_PROGRESS");
  expect(screen.getByRole("group", { name: "Current status" })).toHaveTextContent("Open");
  await userEvent.selectOptions(change, "");
  expect(screen.getByRole("button", { name: "Save Status" })).toBeDisabled();
  expect(save).toHaveBeenCalledTimes(1);
});
it("does not reveal ticket progress when opening is rejected", async () => {
  setup(ready(), { ...ticket, status: "NEW" });
  vi.spyOn(api, "setStaffTicketStatus").mockRejectedValue(new api.ApiError(400, "INVALID_TRANSITION", "Opening rejected."));
  await screen.findByRole("heading", { name: "TKT-WORKFLOW-8" });
  await waitFor(() => expect(screen.getByRole("button", { name: "Refresh actions" })).toBeEnabled());
  await userEvent.selectOptions(screen.getByLabelText("Choose an action", { exact: true }), "OPEN");
  await userEvent.click(screen.getByRole("button", { name: "Open Ticket" }));
  await screen.findByText("Opening rejected.");
  expect(screen.getByRole("heading", { name: "Open ticket" })).toBeVisible();
  expect(screen.queryByRole("heading", { name: "Update ticket status" })).not.toBeInTheDocument();
  expect(screen.getByRole("group", { name: "Current status" })).toHaveTextContent("New");
  expect(screen.getByLabelText("Choose an action", { exact: true })).toHaveValue("OPEN");
});
it("keeps cancellation from New available with the original confirmation and unfinished-work gate", async () => {
  const summary = emptyActionPage(1); summary.resolutionGate.unfinishedCount = 1;
  const f = setup(summary, { ...ticket, status: "NEW" });
  const save = vi.spyOn(api, "setStaffTicketStatus").mockImplementation(async () => {
    const cancelled = { ...ticket, status: "CANCELLED" as const, version: 2 };
    f.update(cancelled); f.actions.mockResolvedValue(emptyActionPage(2)); return cancelled;
  });
  await screen.findByRole("heading", { name: "TKT-WORKFLOW-8" });
  await waitFor(() => expect(screen.getByRole("button", { name: "Refresh actions" })).toBeEnabled());
  await userEvent.selectOptions(screen.getByLabelText("Choose an action", { exact: true }), "CANCELLED");
  expect(screen.getByRole("button", { name: "Cancel Ticket" })).toBeDisabled();
  await userEvent.click(screen.getByLabelText("I understand this is a terminal status."));
  expect(screen.getByRole("button", { name: "Cancel Ticket" })).toBeDisabled();
  f.actions.mockResolvedValue(emptyActionPage(1));
  await userEvent.click(screen.getByRole("button", { name: "Refresh actions" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Cancel Ticket" })).toBeEnabled());
  await userEvent.click(screen.getByRole("button", { name: "Cancel Ticket" }));
  await screen.findByText("Status saved."); expect(save).toHaveBeenCalledWith(8, "CANCELLED", 1);
  expect(screen.getByRole("group", { name: "Current status" })).toHaveTextContent("Cancelled");
  expect(screen.queryByRole("heading", { name: "Open ticket" })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Update ticket status" })).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Ticket status" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Save Status" })).toBeDisabled();
});
it("retains the saved current status and unsaved choice when a transition is rejected", async () => {
  setup();
  const save = vi.spyOn(api, "setStaffTicketStatus").mockRejectedValue(new api.ApiError(400, "INVALID_TRANSITION", "Status change rejected."));
  await screen.findByRole("heading", { name: "TKT-WORKFLOW-8" });
  await waitFor(() => expect(screen.getByRole("button", { name: "Refresh actions" })).toBeEnabled());
  await userEvent.selectOptions(screen.getByLabelText("Change status to", { exact: true }), "IN_PROGRESS");
  await userEvent.click(screen.getByRole("button", { name: "Save Status" }));
  await screen.findByText("Status change rejected.");
  expect(screen.getByRole("group", { name: "Current status" })).toHaveTextContent("Open");
  expect(screen.getByLabelText("Change status to", { exact: true })).toHaveValue("IN_PROGRESS");
  expect(save).toHaveBeenCalledTimes(1);
});
it.each([
  { name: "ready", completed: 1, unfinished: 0, followUp: 0, met: [true, true, true] },
  { name: "unfinished without completed work", completed: 0, unfinished: 1, followUp: 0, met: [false, false, true] },
  { name: "completed with follow-up", completed: 1, unfinished: 0, followUp: 1, met: [true, true, false] },
])("shows green checks and red crosses for $name without relying on colour alone", ({ completed, unfinished, followUp, met }) => {
  const summary = ready();
  Object.assign(summary.resolutionGate, { completedCount: completed, unfinishedCount: unfinished, outstandingFollowUpCount: followUp, meetsActionRequirements: met.every(Boolean) });
  render(<ResolutionChecklist ticket={ticket} summary={summary} />);
  const region = screen.getByRole("region", { name: "Resolution checklist" });
  const rows = within(region).getAllByRole("listitem");
  rows.forEach((row, index) => {
    expect(row).toHaveClass(met[index] ? "resolution-requirement-met" : "resolution-requirement-unmet");
    expect(row).toHaveTextContent(met[index] ? /^✓Met:/ : /^✕Not met:/);
    expect(row.querySelector(".resolution-requirement-icon")).toHaveAttribute("aria-hidden", "true");
  });
  expect(within(region).getByRole("status")).toHaveClass(met.every(Boolean) ? "resolution-state-ready" : "resolution-state-blocked");
});
it.each(["RESOLVED", "CANCELLED"] as const)("keeps the overall $status checklist notice neutral rather than suggesting an available resolution", status => {
  render(<ResolutionChecklist ticket={{ ...ticket, status }} summary={ready()} />);
  expect(screen.getByRole("status")).toHaveClass("resolution-state-neutral");
  expect(screen.queryByText("Ready to resolve")).not.toBeInTheDocument();
});
it("does not colour stale checklist requirements as met or unmet", () => {
  render(<ResolutionChecklist ticket={ticket} summary={{ ...ready(), ticketVersion: 2 }} />);
  expect(screen.getByRole("status")).toHaveClass("resolution-state-neutral");
  expect(screen.queryAllByRole("listitem")).toHaveLength(0);
});
it.each(["empty", "unfinished", "follow-up"])("blocks resolution for %s work from the whole-cycle summary, not page-local items", async kind => {
  const summary = ready();
  if (kind === "empty") summary.resolutionGate.completedCount = 0;
  if (kind === "unfinished") summary.resolutionGate.unfinishedCount = 1;
  if (kind === "follow-up") summary.resolutionGate.outstandingFollowUpCount = 1;
  summary.resolutionGate.meetsActionRequirements = false;
  setup(summary); await select();
  expect(screen.getByRole("button", { name: "Save Status" })).toBeDisabled();
  expect(screen.getByRole("region", { name: "Resolution checklist" })).toHaveTextContent("Not ready to resolve");
});
it("requires confirmation, sends only status/version, then refreshes gate and formal history", async () => {
  const f = setup(), save = vi.spyOn(api, "setStaffTicketStatus").mockImplementation(async () => {
    const next = { ...ticket, status: "RESOLVED" as const, version: 2, resolvedAt: "2026-10-01T00:00:00Z" };
    f.update(next); f.actions.mockResolvedValue({ ...ready(), ticketVersion: 2 }); return next;
  });
  await select(); expect(screen.getByRole("button", { name: "Save Status" })).toBeDisabled();
  await userEvent.click(screen.getByLabelText("I understand this is a terminal status."));
  await userEvent.click(screen.getByRole("button", { name: "Save Status" }));
  await screen.findByText("Status saved."); expect(save).toHaveBeenCalledTimes(1); expect(save).toHaveBeenCalledWith(8, "RESOLVED", 1);
  await waitFor(() => expect(f.actions).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(api.getWorkflowHistory).toHaveBeenCalledTimes(2));
});
it.each(["version", "cycle", "gate-cycle", "failed"])("does not show ready for a %s checklist snapshot", async kind => {
  const summary = ready();
  if (kind === "version") summary.ticketVersion = 2;
  if (kind === "cycle") summary.currentCycle = 2;
  if (kind === "gate-cycle") summary.resolutionGate.cycle = 2;
  setup(summary);
  if (kind === "failed") vi.mocked(api.getActions).mockRejectedValue(new Error("Offline"));
  await screen.findByRole("heading", { name: "TKT-WORKFLOW-8" });
  await waitFor(() => expect(api.getActions).toHaveBeenCalled());
  expect(screen.queryByText("Ready to resolve")).not.toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Resolution checklist" })).toHaveTextContent(/unavailable|loading|refresh/i);
});
it("does not claim readiness or permit resolution while the authoritative summary is still loading", async () => {
  let finish!: (value: api.ActionPage) => void;
  setup(new Promise(resolve => { finish = resolve; }));
  await screen.findByRole("heading", { name: "TKT-WORKFLOW-8" });
  expect(screen.queryByText("Ready to resolve")).not.toBeInTheDocument(); expect(screen.getByRole("button", { name: "Save Status" })).toBeDisabled();
  await act(async () => finish(ready())); await select();
  expect(screen.getByRole("region", { name: "Resolution checklist" })).toHaveTextContent("Ready to resolve");
});
it("blocks cancellation while unfinished actions remain, but allows cancellation without completed work", async () => {
  const summary = emptyActionPage(1); summary.resolutionGate.unfinishedCount = 1;
  const f = setup(summary); await select("CANCELLED");
  await userEvent.click(screen.getByLabelText("I understand this is a terminal status."));
  expect(screen.getByRole("button", { name: "Save Status" })).toBeDisabled();
  f.actions.mockResolvedValue(emptyActionPage(1)); await userEvent.click(screen.getByRole("button", { name: "Refresh actions" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Save Status" })).toBeEnabled());
});
it("keeps all writes blocked after an uncertain status save until explicit reload", async () => {
  setup(); const save = vi.spyOn(api, "setStaffTicketStatus").mockRejectedValue(new TypeError("Response lost"));
  await select(); await userEvent.click(screen.getByLabelText("I understand this is a terminal status."));
  await userEvent.click(screen.getByRole("button", { name: "Save Status" }));
  await screen.findByText(/Status save outcome unknown/);
  expect(screen.getByRole("button", { name: "Save Status" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Save Owner" })).toBeDisabled(); expect(save).toHaveBeenCalledTimes(1);
  await userEvent.click(screen.getByRole("button", { name: "Reload Ticket" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Save Owner" })).toBeEnabled());
});
it("reopening displays a new cycle with no inherited readiness or invented legacy resolved date", async () => {
  const closed = { ...ticket, status: "CLOSED" as const }, f = setup(ready(), closed);
  const save = vi.spyOn(api, "setStaffTicketStatus").mockImplementation(async () => {
    const next = { ...ticket, status: "REOPENED" as const, version: 2, resolutionCycle: 2 };
    f.update(next); f.actions.mockResolvedValue(emptyActionPage(2, 2)); return next;
  });
  await select("REOPENED"); await userEvent.click(screen.getByRole("button", { name: "Save Status" }));
  await screen.findByText("Status saved."); expect(save).toHaveBeenCalled();
  await waitFor(() => expect(screen.getByRole("region", { name: "Resolution checklist" })).toHaveTextContent("Cycle 2"));
  expect(screen.queryByText("Ready to resolve")).not.toBeInTheDocument();
});
it("renders read-only paged transition history and recovers a failed read", async () => {
  const event: api.WorkflowTransition = { id: 1, fromStatus: "OPEN", toStatus: "RESOLVED", cycle: 1, ticketVersion: 2, actor: { id: 9, displayName: "Mali" }, createdAt: "2026-10-01T00:00:00Z" };
  const read = vi.mocked(api.getWorkflowHistory).mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce({ ...emptyWorkflowHistory(), items: [event], total: 21, totalPages: 2 }).mockResolvedValueOnce({ ...emptyWorkflowHistory(), items: [{ ...event, id: 21, toStatus: "REOPENED", cycle: 2 }], total: 21, totalPages: 2, page: 2 });
  render(<WorkflowHistory ticketId={8} version={2} />);
  await userEvent.click(await screen.findByRole("button", { name: "Retry workflow history" }));
  expect(await screen.findByText("Open → Resolved")).toBeVisible(); expect(screen.getByText("Mali")).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Next transitions" }));
  await screen.findByText("Open → Reopened"); expect(read).toHaveBeenLastCalledWith(8, 2);
  expect(within(screen.getByRole("region", { name: "Workflow history" })).queryByRole("button", { name: /edit|delete/i })).not.toBeInTheDocument();
});
it("ignores history replies for a previously viewed Ticket", async () => {
  let finish!: (value: api.WorkflowHistoryPage) => void;
  vi.mocked(api.getWorkflowHistory).mockImplementation(id => id === 8 ? new Promise(resolve => { finish = resolve; }) : Promise.resolve(emptyWorkflowHistory()));
  const view = render(<WorkflowHistory ticketId={8} version={1} />); view.rerender(<WorkflowHistory ticketId={9} version={1} />);
  await screen.findByText("No recorded transitions since the Lab 4 upgrade.");
  await act(async () => finish({ ...emptyWorkflowHistory(), items: [{ id: 1, fromStatus: "OPEN", toStatus: "RESOLVED", cycle: 1, ticketVersion: 2, actor: { id: 9, displayName: "Old actor" }, createdAt: "2026-10-01T00:00:00Z" }] }));
  expect(screen.queryByText("Old actor")).not.toBeInTheDocument();
});
