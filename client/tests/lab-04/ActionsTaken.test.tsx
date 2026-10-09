import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import { ActionsTaken, bangkokInput, bangkokInstant } from "../../src/ActionsTaken.js";

const ticket = { id: 8, version: 1, resolutionCycle: 1, resolvedAt: null, status: "OPEN", createdAt: "2026-09-01T00:00:00Z" } as api.StaffTicketDetail;
const record: api.ActionTakenRecord = {
  id: 12, ticketId: 8, cycle: 1, state: "PLANNED", actionAt: "2026-09-25T01:00:00Z",
  description: "Investigate VPN", result: "", assignee: null, createdBy: { id: 9, displayName: "Mali" },
  performedBy: null, performedAt: null, followUpRequired: false, followUpNote: "", attachmentNotes: "",
  cancellationReason: null, version: 1, createdAt: "2026-09-25T01:00:00Z", updatedAt: "2026-09-25T01:00:00Z",
};
const page = { items: [record], page: 1, pageSize: 20, total: 1, totalPages: 1, ticketVersion: 1, currentCycle: 1 } as api.ActionPage;
function setup(staff = true, options: { action?: api.ActionTakenRecord; status?: api.TicketStatus; link?: string } = {}) {
  const action = options.action ?? record;
  vi.spyOn(api, "getActions").mockResolvedValue({ ...page, items: [action] });
  vi.spyOn(api, "getAction").mockResolvedValue({ action, ticketVersion: 1, currentCycle: 1 });
  vi.spyOn(api, "getActionHistory").mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 1 });
  vi.spyOn(api, "getActionAssignees").mockResolvedValue({ items: [{ id: 9, displayName: "Mali", role: "IT_STAFF" }] });
  const context = { ...ticket, status: options.status ?? ticket.status };
  vi.spyOn(api, "getStaffTicket").mockResolvedValue(context);
  return render(<ActionsTaken ticket={context} staff={staff} userId={9} actorName="Mali" linkedActionId={options.link} />);
}
async function open(edit = true) {
  await userEvent.click(await screen.findByRole("button", { name: "View action 12" }));
  await screen.findByRole("heading", { name: "Action 12" });
  const button = screen.queryByRole("button", { name: "Edit action" });
  if (edit && button) await userEvent.click(button);
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); sessionStorage.clear(); });
describe("Actions Taken", () => {
  it.each(["PLANNED", "IN_PROGRESS"] as const)("shows permitted progress controls in %s view mode without opening the editor", async state => {
    setup(true, { action: { ...record, state } }); await open(false);
    expect(screen.getByRole("region", { name: "Action state controls" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Complete action" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Cancel action" })).toBeEnabled();
    expect(!!screen.queryByRole("button", { name: "Start action" })).toBe(state === "PLANNED");
    expect(screen.queryByRole("form", { name: "Edit action fields" })).not.toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Action assignment" })).not.toBeInTheDocument();
  });
  it("starts work directly from view mode with only a state save", async () => {
    const write = vi.spyOn(api, "writeAction").mockResolvedValue({ actionId: 12, eventId: 1, actionVersion: 2, ticketVersion: 2, replayed: false });
    setup(); await open(false);
    vi.mocked(api.getAction).mockResolvedValue({ action: { ...record, state: "IN_PROGRESS", version: 2 }, ticketVersion: 2, currentCycle: 1 });
    vi.mocked(api.getActions).mockResolvedValue({ ...page, ticketVersion: 2 });
    vi.mocked(api.getStaffTicket).mockResolvedValue({ ...ticket, version: 2 });
    await userEvent.click(screen.getByRole("button", { name: "Start action" }));
    await screen.findByText("Action state saved.");
    expect(write).toHaveBeenCalledTimes(1);
    expect(write.mock.calls[0][1]).toBe("state");
    expect(write.mock.calls[0][3]).toMatchObject({ state: "IN_PROGRESS", version: 1, ticketVersion: 1 });
    expect(write.mock.calls[0][3]).not.toHaveProperty("description");
    expect(screen.queryByRole("button", { name: "Start action" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Description")).not.toBeInTheDocument();
  });
  it.each(["COMPLETED", "CANCELLED"] as const)("confirms %s directly without editing or saving fields", async state => {
    const write = vi.spyOn(api, "writeAction").mockResolvedValue({ actionId: 12, eventId: 1, actionVersion: 2, ticketVersion: 2, replayed: false });
    setup(); await open(false);
    const completed = state === "COMPLETED";
    const button = () => screen.getByRole("button", { name: completed ? "Complete action" : "Cancel action" });
    await userEvent.click(button());
    const label = completed ? "Completion Result" : "Cancellation reason";
    expect(screen.getByLabelText(label)).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "Back without changing state" }));
    expect(button()).toHaveFocus(); expect(write).not.toHaveBeenCalled();
    await userEvent.click(button());
    const form = screen.getByRole("form", { name: completed ? "Confirm completion" : "Confirm cancellation" });
    fireEvent.submit(form); expect(write).not.toHaveBeenCalled();
    await userEvent.click(screen.getByLabelText(completed ? "I confirm I performed this work." : "I confirm cancellation of this action."));
    fireEvent.submit(form); expect(write).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText(label), "Verified work outcome");
    vi.mocked(api.getAction).mockResolvedValue({ action: { ...record, state, version: 2, result: completed ? "Verified work outcome" : "", cancellationReason: completed ? null : "Verified work outcome" }, ticketVersion: 2, currentCycle: 1 });
    vi.mocked(api.getActions).mockResolvedValue({ ...page, ticketVersion: 2 });
    vi.mocked(api.getStaffTicket).mockResolvedValue({ ...ticket, version: 2 });
    await userEvent.click(screen.getByRole("button", { name: completed ? "Confirm complete" : "Confirm cancel action" }));
    await screen.findByText("Action state saved.");
    expect(write).toHaveBeenCalledTimes(1); expect(write.mock.calls[0][1]).toBe("state");
    expect(write.mock.calls[0][3]).toMatchObject({ state, result: completed ? "Verified work outcome" : "", cancellationReason: completed ? "" : "Verified work outcome" });
    expect(write.mock.calls[0][3]).not.toHaveProperty("description");
    expect(screen.queryByLabelText("Description")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Action state controls" })).not.toBeInTheDocument();
  });
  it("recovers an uncertain direct completion with the same intent and no field editor", async () => {
    const write = vi.spyOn(api, "writeAction").mockRejectedValueOnce(new TypeError("Lost response"))
      .mockResolvedValueOnce({ actionId: 12, eventId: 1, actionVersion: 2, ticketVersion: 2, replayed: true });
    const rendered = setup(); await open(false);
    await userEvent.click(screen.getByRole("button", { name: "Complete action" }));
    await userEvent.type(screen.getByLabelText("Completion Result"), "VPN restored");
    await userEvent.click(screen.getByLabelText("I confirm I performed this work."));
    await userEvent.click(screen.getByRole("button", { name: "Confirm complete" }));
    await screen.findByText(/Save outcome unknown/);
    expect(screen.getByRole("button", { name: "Edit action" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Close detail" })).toBeDisabled();
    rendered.unmount(); setup();
    await screen.findByText(/unknown after reload/);
    expect(screen.queryByRole("form", { name: "Edit action fields" })).not.toBeInTheDocument();
    vi.mocked(api.getAction).mockResolvedValue({ action: { ...record, state: "COMPLETED", result: "VPN restored", version: 2 }, ticketVersion: 2, currentCycle: 1 });
    vi.mocked(api.getActions).mockResolvedValue({ ...page, ticketVersion: 2 });
    vi.mocked(api.getStaffTicket).mockResolvedValue({ ...ticket, version: 2 });
    await userEvent.click(screen.getByRole("button", { name: "Retry same save" }));
    await screen.findByText("Action state saved.");
    expect(write).toHaveBeenCalledTimes(2); expect(write.mock.calls[1]).toEqual(write.mock.calls[0]);
    expect(screen.queryByLabelText("Description")).not.toBeInTheDocument();
  });
  it.each([true, false])("closes action details and audit without changing data (staff=%s)", async staff => {
    const write = vi.spyOn(api, "writeAction");
    setup(staff); await open(false);
    const close = screen.getByRole("button", { name: "Close detail" });
    close.focus(); await userEvent.keyboard("{Enter}");
    expect(screen.queryByRole("region", { name: "Action 12 details" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Action audit history" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View action 12" })).toHaveFocus();
    await open(false);
    expect(screen.getByRole("region", { name: "Action 12 details" })).toHaveTextContent("Investigate VPN");
    expect(screen.getByRole("region", { name: "Action audit history" })).toBeVisible();
    expect(write).not.toHaveBeenCalled();
  });
  it("explicitly discards unsaved fields and assignment when closing an editor's detail", async () => {
    const write = vi.spyOn(api, "writeAction");
    setup(); await open();
    await userEvent.type(screen.getByLabelText("Description"), " unsaved");
    await userEvent.selectOptions(screen.getByLabelText("Action assignee"), "9");
    await userEvent.click(screen.getByRole("button", { name: "Discard changes and close detail" }));
    expect(screen.queryByLabelText("Description")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Action audit history" })).not.toBeInTheDocument();
    await open();
    expect(screen.getByLabelText("Description")).toHaveValue("Investigate VPN");
    expect(screen.getByLabelText("Action assignee")).toHaveValue("");
    expect(write).not.toHaveBeenCalled();
  });
  it("keeps a closed deep-linked action closed when refreshing the list", async () => {
    setup(true, { link: "12" });
    await screen.findByRole("heading", { name: "Action 12" });
    await userEvent.click(screen.getByRole("button", { name: "Close detail" }));
    await userEvent.click(screen.getByRole("button", { name: "Refresh actions" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "View action 12" })).toBeEnabled());
    expect(screen.queryByRole("region", { name: "Action 12 details" })).not.toBeInTheDocument();
    expect(api.getAction).toHaveBeenCalledTimes(1);
  });
  it("ignores a late audit response after closing and reopening the detail", async () => {
    setup();
    let finish!: (value: api.ActionHistoryPage) => void;
    vi.mocked(api.getActionHistory).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    await open(false);
    await screen.findByText("Loading audit history…");
    await userEvent.click(screen.getByRole("button", { name: "Close detail" }));
    await open(false);
    await screen.findByText("No revisions on this page.");
    finish({ items: [], page: 2, pageSize: 20, total: 22, totalPages: 2 });
    await waitFor(() => expect(screen.getByText("History page 1 of 1 · 0 revisions")).toBeVisible());
    expect(screen.queryByText("History page 2 of 2 · 22 revisions")).not.toBeInTheDocument();
  });
  it("views saved details and audit history before explicitly opening the editor", async () => {
    const write = vi.spyOn(api, "writeAction");
    setup(); await open(false);
    expect(screen.getByRole("heading", { name: "Action 12" })).toHaveFocus();
    expect(screen.getByRole("region", { name: "Action 12 details" })).toHaveTextContent("Investigate VPN");
    expect(screen.getByRole("region", { name: "Action audit history" })).toBeVisible();
    expect(screen.queryByRole("form", { name: "Edit action fields" })).not.toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Action assignment" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Complete action" })).toBeVisible();
    const edit = screen.getByRole("button", { name: "Edit action" });
    expect(edit).toHaveAttribute("aria-expanded", "false");
    edit.focus(); await userEvent.keyboard("{Enter}");
    expect(screen.getByLabelText("Action Date/Time (Bangkok)")).toHaveFocus();
    expect(screen.getByRole("button", { name: "Close editor" })).toHaveAttribute("aria-expanded", "true");
    await userEvent.type(screen.getByLabelText("Description"), " unsaved");
    await userEvent.click(screen.getByRole("button", { name: "Close editor" }));
    expect(screen.getByRole("button", { name: "Edit action" })).toHaveFocus();
    expect(screen.queryByLabelText("Description")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Edit action" }));
    expect(screen.getByLabelText("Description")).toHaveValue("Investigate VPN");
    expect(write).not.toHaveBeenCalled();
  });
  it("opens a Staff deep link in view mode without automatically editing", async () => {
    setup(true, { link: "12" });
    expect(await screen.findByRole("heading", { name: "Action 12" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Edit action" })).toBeVisible();
    expect(screen.queryByLabelText("Description")).not.toBeInTheDocument();
  });
  it("returns to view mode when another action is chosen", async () => {
    setup(); await open(); await userEvent.type(screen.getByLabelText("Description"), " draft");
    vi.mocked(api.getActions).mockResolvedValue({ ...page, items: [record, { ...record, id: 13 }] });
    await userEvent.click(screen.getByRole("button", { name: "Refresh actions" }));
    await screen.findByRole("button", { name: "View action 13" });
    vi.mocked(api.getAction).mockResolvedValue({ action: { ...record, id: 13 }, ticketVersion: 1, currentCycle: 1 });
    await userEvent.click(screen.getByRole("button", { name: "View action 13" }));
    expect(await screen.findByRole("heading", { name: "Action 13" })).toHaveFocus();
    expect(screen.queryByLabelText("Description")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit action" })).toHaveAttribute("aria-expanded", "false");
  });
  it("returns a newly created action to view mode", async () => {
    vi.spyOn(api, "writeAction").mockResolvedValue({ actionId: 12, eventId: 1, actionVersion: 1, ticketVersion: 1, replayed: false });
    setup(); await userEvent.click(await screen.findByRole("button", { name: "New action" }));
    await userEvent.type(screen.getByLabelText("Description"), "Investigate VPN");
    await userEvent.click(screen.getByRole("button", { name: "Create action" }));
    await screen.findByText("Action created.");
    expect(screen.queryByLabelText("Description")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit action" })).toHaveAttribute("aria-expanded", "false");
  });
  it("shows Requester records and history without mutation controls", async () => {
    setup(false);
    await userEvent.click(await screen.findByRole("button", { name: "View action 12" }));
    expect(await screen.findByRole("heading", { name: "Action 12" })).toHaveFocus();
    expect(screen.getAllByText("Not recorded yet")[0]).toBeVisible();
    expect(screen.queryByRole("button", { name: "New action" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save action" })).not.toBeInTheDocument();
    expect(api.getActionAssignees).not.toHaveBeenCalled();
    expect(screen.queryByRole("region", { name: "Action state controls" })).not.toBeInTheDocument();
  });
  it("keeps fields and assignment as independent saves", async () => {
    const edit = vi.spyOn(api, "writeAction").mockResolvedValue({ actionId: 12, eventId: 1, actionVersion: 2, ticketVersion: 2, replayed: false });
    setup();
    await userEvent.click(await screen.findByRole("button", { name: "View action 12" }));
    await userEvent.click(await screen.findByRole("button", { name: "Edit action" }));
    vi.mocked(api.getStaffTicket).mockResolvedValue({ ...ticket, version: 2 });
    vi.mocked(api.getActions).mockResolvedValue({ ...page, ticketVersion: 2 });
    vi.mocked(api.getAction).mockResolvedValue({ action: { ...record, version: 2, description: "Checked VPN" }, ticketVersion: 2, currentCycle: 1 });
    await userEvent.selectOptions(screen.getByLabelText("Action assignee"), "9");
    await userEvent.clear(screen.getByLabelText("Description"));
    await userEvent.type(screen.getByLabelText("Description"), "Checked VPN");
    await userEvent.click(screen.getByRole("button", { name: "Save action" }));
    await screen.findByText("Action changes saved.");
    expect(edit).toHaveBeenCalledTimes(1);
    expect(edit.mock.calls[0][1]).toBe("edit");
    expect(edit.mock.calls[0][3]).not.toHaveProperty("assigneeId");
    expect(screen.getByLabelText("Action assignee")).toHaveValue("9");
  });
  it("retries an unknown create with exactly the same payload and key", async () => {
    const write = vi.spyOn(api, "writeAction").mockRejectedValueOnce(new TypeError("Network lost"))
      .mockResolvedValueOnce({ actionId: 12, eventId: 1, actionVersion: 1, ticketVersion: 1, replayed: true });
    setup();
    await userEvent.click(await screen.findByRole("button", { name: "New action" }));
    await userEvent.type(screen.getByLabelText("Description"), "Investigate VPN");
    await userEvent.click(screen.getByRole("button", { name: "Create action" }));
    expect(await screen.findByText(/outcome unknown/i)).toBeVisible();
    expect(screen.getByLabelText("Description")).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Retry same save" }));
    await waitFor(() => expect(write).toHaveBeenCalledTimes(2));
    expect(write.mock.calls[0]).toEqual(write.mock.calls[1]);
    await screen.findByText("Action created.");
  });
  it("preserves field success and retries only an uncertain later assignment", async () => {
    const write = vi.spyOn(api, "writeAction").mockResolvedValueOnce({ actionId: 12, eventId: 1, actionVersion: 2, ticketVersion: 2, replayed: false })
      .mockRejectedValueOnce(new TypeError("response lost")).mockResolvedValueOnce({ actionId: 12, eventId: 2, actionVersion: 3, ticketVersion: 3, replayed: true });
    setup(); await open();
    await userEvent.selectOptions(screen.getByLabelText("Action assignee"), "9");
    vi.mocked(api.getStaffTicket).mockResolvedValue({ ...ticket, version: 2 });
    vi.mocked(api.getActions).mockResolvedValue({ ...page, ticketVersion: 2 });
    vi.mocked(api.getAction).mockResolvedValue({ action: { ...record, version: 2 }, ticketVersion: 2, currentCycle: 1 });
    await userEvent.click(screen.getByRole("button", { name: "Save action" })); await screen.findByText("Action changes saved.");
    await userEvent.click(screen.getByRole("button", { name: "Save assignment" }));
    expect(await screen.findByText(/Action changes saved; assignment outcome unknown/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Save action" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Discard changes and close detail" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Complete action" })).toBeDisabled();
    vi.mocked(api.getStaffTicket).mockResolvedValue({ ...ticket, version: 3 });
    vi.mocked(api.getActions).mockResolvedValue({ ...page, ticketVersion: 3 });
    vi.mocked(api.getAction).mockResolvedValue({ action: { ...record, version: 3 }, ticketVersion: 3, currentCycle: 1 });
    await userEvent.click(screen.getByRole("button", { name: "Retry same save" }));
    await screen.findByText(/Assignment saved/);
    expect(write.mock.calls.map(call => call[1])).toEqual(["edit", "assign", "assign"]);
    expect(write.mock.calls[1]).toEqual(write.mock.calls[2]);
    expect(write.mock.calls[1][3]).toMatchObject({ version: 2, ticketVersion: 2, assigneeId: 9 });
  });
  it("retains a rejected assignment without resubmitting successful fields", async () => {
    const write = vi.spyOn(api, "writeAction").mockResolvedValueOnce({ actionId: 12, eventId: 1, actionVersion: 1, ticketVersion: 1, replayed: false })
      .mockRejectedValueOnce(new api.ApiError(400, "INVALID_ASSIGNEE", "Choose an active Staff account."));
    setup(); await open();
    await userEvent.selectOptions(screen.getByLabelText("Action assignee"), "9");
    await userEvent.click(screen.getByRole("button", { name: "Save action" })); await screen.findByText("Action changes saved.");
    vi.mocked(api.getActionAssignees).mockResolvedValue({ items: [] });
    await userEvent.click(screen.getByRole("button", { name: "Save assignment" }));
    expect(await screen.findByText(/Action changes saved; assignment not saved/)).toBeVisible();
    expect(screen.getByLabelText("Action assignee")).toHaveValue("9");
    await screen.findByRole("option", { name: /No longer eligible/ });
    expect(write).toHaveBeenCalledTimes(2);
  });
  it("refreshes a confirmed create without repeating it after read failure", async () => {
    const write = vi.spyOn(api, "writeAction").mockResolvedValue({ actionId: 12, eventId: 1, actionVersion: 1, ticketVersion: 1, replayed: false });
    setup(); await userEvent.click(await screen.findByRole("button", { name: "New action" }));
    await userEvent.type(screen.getByLabelText("Description"), "Check router");
    vi.mocked(api.getActions).mockRejectedValueOnce(new TypeError("read failed"));
    await userEvent.click(screen.getByRole("button", { name: "Create action" }));
    expect(await screen.findByText(/Saved; refresh to load current record/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Create action" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Refresh saved record" }));
    await screen.findByText("Action created.");
    expect(api.getAction).toHaveBeenLastCalledWith(8, 12);
    expect(write).toHaveBeenCalledTimes(1);
  });
  it("blocks all writes after conflict until explicit authoritative reload", async () => {
    vi.spyOn(api, "writeAction").mockRejectedValue(new api.ApiError(409, "VERSION_CONFLICT", "This Ticket changed. Reload and review."));
    setup(); await open();
    await userEvent.type(screen.getByLabelText("Description"), " unsaved investigation");
    await userEvent.click(screen.getByRole("button", { name: "Save action" }));
    await screen.findByText(/Ticket changed/);
    expect(screen.getByLabelText("Description")).toHaveValue("Investigate VPN unsaved investigation");
    expect(screen.getByRole("button", { name: "Save assignment" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Reload and review" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Save action" })).toBeEnabled());
    expect(screen.getByLabelText("Description")).toHaveValue("Investigate VPN unsaved investigation");
  });
  it("keeps fields unsaved when only assignment succeeds", async () => {
    vi.spyOn(api, "writeAction").mockResolvedValue({ actionId: 12, eventId: 1, actionVersion: 1, ticketVersion: 1, replayed: false });
    setup(); await open(); await userEvent.type(screen.getByLabelText("Description"), " draft");
    await userEvent.selectOptions(screen.getByLabelText("Action assignee"), "9");
    await userEvent.click(screen.getByRole("button", { name: "Save assignment" }));
    await screen.findByText(/Assignment saved/);
    expect(screen.getByLabelText("Description")).toHaveValue("Investigate VPN draft");
    expect(api.writeAction).toHaveBeenCalledWith(8, "assign", 12, expect.not.objectContaining({ description: expect.anything() }));
  });
  it("requires a retained follow-up explanation when clearing an existing flag", async () => {
    const write = vi.spyOn(api, "writeAction");
    setup(true, { action: { ...record, followUpRequired: true, followUpNote: "Check tomorrow" } }); await open();
    await userEvent.click(screen.getByLabelText("Follow-Up Required"));
    await userEvent.clear(screen.getByLabelText("Follow-up Note"));
    fireEvent.submit(screen.getByRole("form", { name: "Edit action fields" }));
    expect(await screen.findByText(/Explain the follow-up/)).toBeVisible();
    expect(write).not.toHaveBeenCalled();
  });
  it("explains completed corrections and never offers assignment or state reversal", async () => {
    const write = vi.spyOn(api, "writeAction");
    setup(true, { action: { ...record, state: "COMPLETED", result: "Fixed", performedBy: { id: 10, displayName: "Suda" }, performedAt: record.actionAt } });
    await open(); expect(screen.getByLabelText("Change reason")).toBeRequired();
    fireEvent.submit(screen.getByRole("form", { name: "Edit action fields" }));
    await screen.findByText(/Explain the correction/);
    expect(screen.queryByLabelText("Action assignee")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start action" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Action state controls" })).not.toBeInTheDocument();
    expect(write).not.toHaveBeenCalled();
  });
  it.each(["RESOLVED", "CLOSED", "CANCELLED"] as const)("makes %s Tickets read-only", async status => {
    setup(true, { status }); await open();
    expect(screen.getByText(/Actions cannot be changed/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Save action" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New action" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Edit action" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Action state controls" })).not.toBeInTheDocument();
  });
  it.each([{ state: "CANCELLED" as const, cycle: 1 }, { state: "PLANNED" as const, cycle: 0 }])("locks cancelled and prior-cycle records: %j", async values => {
    setup(true, { action: { ...record, ...values } }); await open();
    expect(screen.queryByRole("button", { name: "Save action" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit action" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Action state controls" })).not.toBeInTheDocument();
  });
  it("confirms actual performer, requires Result and supports backing out", async () => {
    const write = vi.spyOn(api, "writeAction").mockResolvedValue({ actionId: 12, eventId: 1, actionVersion: 1, ticketVersion: 1, replayed: false });
    setup(); await open(); await userEvent.click(screen.getByRole("button", { name: "Complete action" }));
    expect(screen.getByLabelText("Completion Result")).toHaveFocus();
    expect(screen.getByText(/records Mali as the actual performer/)).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Back without changing state" }));
    expect(screen.getByRole("button", { name: "Complete action" })).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "Complete action" }));
    await userEvent.click(screen.getByLabelText("I confirm I performed this work."));
    fireEvent.submit(screen.getByRole("form", { name: "Confirm completion" }));
    expect(write).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText("Completion Result"), "VPN restored");
    vi.mocked(api.getAction).mockResolvedValue({ action: { ...record, state: "COMPLETED", result: "VPN restored", version: 2 }, ticketVersion: 2, currentCycle: 1 });
    vi.mocked(api.getActions).mockResolvedValue({ ...page, ticketVersion: 2 });
    vi.mocked(api.getStaffTicket).mockResolvedValue({ ...ticket, version: 2 });
    await userEvent.click(screen.getByRole("button", { name: "Confirm complete" }));
    await screen.findByText("Action state saved.");
    expect(write).toHaveBeenCalledWith(8, "state", 12, expect.objectContaining({ state: "COMPLETED", result: "VPN restored", cancellationReason: "" }));
    expect(write.mock.calls[0][3]).not.toHaveProperty("performedBy");
    expect(screen.getByLabelText("Result")).toHaveValue("VPN restored");
    expect(write).toHaveBeenCalledTimes(1);
  });
  it("requires explicit cancellation confirmation and reason", async () => {
    const write = vi.spyOn(api, "writeAction").mockResolvedValue({ actionId: 12, eventId: 1, actionVersion: 1, ticketVersion: 1, replayed: false });
    setup(); await open(); await userEvent.click(screen.getByRole("button", { name: "Cancel action" }));
    await userEvent.type(screen.getByLabelText("Cancellation reason"), "Duplicate investigation");
    fireEvent.submit(screen.getByRole("form", { name: "Confirm cancellation" }));
    expect(write).not.toHaveBeenCalled();
    await userEvent.click(screen.getByLabelText("I confirm cancellation of this action."));
    await userEvent.click(screen.getByRole("button", { name: "Confirm cancel action" }));
    await screen.findByText("Action state saved.");
    expect(write).toHaveBeenCalledWith(8, "state", 12, expect.objectContaining({ state: "CANCELLED", cancellationReason: "Duplicate investigation" }));
  });
  it("reads the exact linked action even when it is not on the first page", async () => {
    setup(false, { link: "77", action: { ...record, id: 77 } });
    expect(await screen.findByRole("heading", { name: "Action 77" })).toHaveFocus();
    expect(api.getAction).toHaveBeenCalledWith(8, 77);
  });
  it("rejects malformed linked IDs without fetching a different action", async () => {
    setup(false, { link: "2147483648" });
    expect(await screen.findByText(/linked action is unavailable/)).toBeVisible();
    expect(api.getAction).not.toHaveBeenCalled();
  });
  it("pages immutable history and renders snapshot text safely", async () => {
    setup(false); await open();
    vi.mocked(api.getActionHistory).mockResolvedValue({ items: [{ id: 1, actionId: 12, kind: "EDITED", version: 2, actor: record.createdBy, createdAt: record.createdAt, reason: "Correction", before: null, after: { description: "<script>alert(1)</script>" } }], page: 1, pageSize: 20, total: 21, totalPages: 2 });
    await userEvent.click(screen.getByRole("button", { name: "Refresh actions" }));
    await screen.findByText(/Edited · Revision 2/);
    expect(screen.getByRole("heading", { name: "What changed" })).toBeVisible();
    expect(screen.getByText(/Changed by Mali/)).toBeVisible();
    expect(screen.getByText("Technical details").closest("details")).not.toHaveAttribute("open");
    await userEvent.click(screen.getByText("Technical details"));
    expect(document.querySelector("script")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Next history" }));
    await waitFor(() => expect(api.getActionHistory).toHaveBeenLastCalledWith(8, 12, 2));
  });
  it("blocks saves from a mixed parent/action snapshot", async () => {
    setup(); await open();
    vi.mocked(api.getAction).mockResolvedValue({ action: record, ticketVersion: 2, currentCycle: 1 });
    await userEvent.click(screen.getByRole("button", { name: "Refresh actions" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Save action" })).toBeDisabled();
  });
  it("does not leak a draft across users", async () => {
    const rendered = setup(); await open(); await userEvent.type(screen.getByLabelText("Description"), " private draft");
    rendered.rerender(<ActionsTaken ticket={ticket} staff={false} userId={2} actorName="Anan" />);
    await screen.findByRole("button", { name: "View action 12" });
    expect(screen.queryByDisplayValue(/private draft/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save action" })).not.toBeInTheDocument();
  });
  it("recovers the same unknown intent after a full component reload", async () => {
    const write = vi.spyOn(api, "writeAction").mockRejectedValueOnce(new TypeError("response lost"))
      .mockResolvedValueOnce({ actionId: 12, eventId: 1, actionVersion: 1, ticketVersion: 1, replayed: true });
    const rendered = setup(); await userEvent.click(await screen.findByRole("button", { name: "New action" }));
    await userEvent.type(screen.getByLabelText("Description"), "Recover after reload");
    await userEvent.click(screen.getByRole("button", { name: "Create action" }));
    await screen.findByText(/Save outcome unknown/); rendered.unmount();
    render(<ActionsTaken ticket={ticket} staff userId={9} actorName="Mali" />);
    await screen.findByText(/unknown after reload/);
    await userEvent.click(screen.getByRole("button", { name: "Retry same save" }));
    await screen.findByText("Action created.");
    expect(write.mock.calls[0]).toEqual(write.mock.calls[1]);
    expect(sessionStorage.length).toBe(0);
  });
  it("clears retry journals on authentication loss without retaining other-user input", () => {
    sessionStorage.setItem(`${api.ACTION_RETRY_PREFIX}9:8`, "pending");
    api.clearAuthentication();
    expect(sessionStorage.getItem(`${api.ACTION_RETRY_PREFIX}9:8`)).toBeNull();
  });
  it("keeps action and history paging separate", async () => {
    setup(false); await open();
    vi.mocked(api.getActions).mockResolvedValue({ ...page, total: 21, totalPages: 2 });
    await userEvent.click(screen.getByRole("button", { name: "Refresh actions" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Next actions" })).toBeEnabled());
    await userEvent.click(screen.getByRole("button", { name: "Next actions" }));
    await waitFor(() => expect(api.getActions).toHaveBeenLastCalledWith(8, 2));
    expect(within(screen.getByRole("navigation", { name: "Audit history pages" })).getByRole("button", { name: "Next history" })).toBeDisabled();
  });
  it("uses explicit Bangkok offsets including whole-minute input", () => {
    expect(bangkokInput("2026-09-25T01:00:00Z")).toBe("2026-09-25T08:00:00");
    expect(bangkokInstant("2026-09-25T08:00")).toBe("2026-09-25T08:00:00+07:00");
    expect(bangkokInput("2026-09-25T01:00:00.123Z")).toBe("2026-09-25T08:00:00.123");
  });
  it("does not submit a second mutation while the first is pending", async () => {
    let finish!: (receipt: api.ActionReceipt) => void;
    const write = vi.spyOn(api, "writeAction").mockReturnValue(new Promise(resolve => { finish = resolve; }));
    setup(); await open();
    fireEvent.submit(screen.getByRole("form", { name: "Edit action fields" }));
    fireEvent.submit(screen.getByRole("form", { name: "Action assignment" }));
    expect(write).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Save assignment" })).toBeDisabled();
    finish({ actionId: 12, eventId: 1, actionVersion: 1, ticketVersion: 1, replayed: false });
    await screen.findByText("Action changes saved.");
  });
  it("ignores a late record response after Ticket navigation", async () => {
    let finish!: (detail: Awaited<ReturnType<typeof api.getAction>>) => void;
    const rendered = setup(false);
    vi.mocked(api.getAction).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    await userEvent.click(await screen.findByRole("button", { name: "View action 12" }));
    vi.mocked(api.getActions).mockResolvedValue({ ...page, items: [{ ...record, id: 55, ticketId: 13, description: "New Ticket work" }] });
    rendered.rerender(<ActionsTaken ticket={{ ...ticket, id: 13 }} staff={false} userId={9} actorName="Mali" />);
    await screen.findByText("New Ticket work");
    finish({ action: { ...record, description: "Late old record" }, ticketVersion: 1, currentCycle: 1 });
    await waitFor(() => expect(screen.queryByText("Late old record")).not.toBeInTheDocument());
    expect(screen.queryByRole("heading", { name: "Action 12" })).not.toBeInTheDocument();
  });
  it("handles empty and failed reads without inventing records or ready state", async () => {
    setup(false);
    vi.mocked(api.getActions).mockResolvedValue({ ...page, items: [], total: 0 });
    await userEvent.click(await screen.findByRole("button", { name: "Refresh actions" }));
    expect(await screen.findByText("No actions on this page.")).toBeVisible();
    vi.mocked(api.getActions).mockRejectedValue(new TypeError("offline"));
    await userEvent.click(screen.getByRole("button", { name: "Refresh actions" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be loaded");
    expect(screen.queryByText(/ready to resolve/i)).not.toBeInTheDocument();
  });
});
