import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import { AdminUsersPage } from "../../src/AdminUsersPage.js";
import App from "../../src/App.js";

const admin: api.AdminUser = { id: 10, displayName: "Local Administrator", email: "admin@example.test", role: "ADMINISTRATOR", isActive: true, mustChangePassword: false, version: 1, createdAt: "2026-09-15T00:00:00Z", updatedAt: "2026-09-15T00:00:00Z" };
const target: api.AdminUser = { ...admin, id: 11, displayName: "Mali Support", email: "mali@example.test", role: "IT_STAFF" };
beforeEach(() => { vi.spyOn(api, "getAdminUsers").mockResolvedValue({ items: [admin, target] }); });
afterEach(() => { vi.restoreAllMocks(); });
function view(onSelfChanged = vi.fn()) { return render(<AdminUsersPage currentUser={admin} onSelfChanged={onSelfChanged}/>); }
describe("Administrator user management", () => {
  it("loads, searches by explicit submit and filters roles", async () => {
    const user = userEvent.setup(); view(); expect(screen.getByRole("status")).toHaveTextContent("Loading users");
    await screen.findByRole("button", { name: "Edit Mali Support" });
    await user.type(screen.getByLabelText("Name or email"), "mali");
    expect(api.getAdminUsers).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() => expect(api.getAdminUsers).toHaveBeenLastCalledWith("mali", "", ""));
    await user.selectOptions(screen.getByLabelText("Role filter"), "IT_STAFF");
    await waitFor(() => expect(api.getAdminUsers).toHaveBeenLastCalledWith("mali", "IT_STAFF", ""));
    await user.selectOptions(screen.getByLabelText("Status filter"), "true");
    await waitFor(() => expect(api.getAdminUsers).toHaveBeenLastCalledWith("mali", "IT_STAFF", "true"));
    await user.selectOptions(screen.getByLabelText("Status filter"), "false");
    await waitFor(() => expect(api.getAdminUsers).toHaveBeenLastCalledWith("mali", "IT_STAFF", "false"));
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(api.getAdminUsers).toHaveBeenLastCalledWith("", "", ""));
    expect(screen.getByLabelText("Status filter")).toHaveValue("");
  });
  it("retries a safe load failure and distinguishes no results", async () => {
    vi.mocked(api.getAdminUsers).mockRejectedValueOnce(new Error("private details")).mockResolvedValue({ items: [] });
    const user = userEvent.setup(); view();
    expect(await screen.findByRole("alert")).not.toHaveTextContent("private");
    await user.click(screen.getByRole("button", { name: "Retry loading users" }));
    expect(await screen.findByText("No users available.")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Status filter"), "false");
    expect(await screen.findByText("No users match these filters.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    await user.type(screen.getByLabelText("Name or email"), "missing");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(await screen.findByText("No users match these filters.")).toBeInTheDocument();
  });
  it("retains non-secret create input, clears failed passwords and shows field validation", async () => {
    vi.spyOn(api, "createAdminUser").mockRejectedValue(new api.ApiError(409, "EMAIL_CONFLICT", "This email is already in use.", { email: "Choose another email address." }));
    const user = userEvent.setup(); view();
    await user.click(screen.getByRole("button", { name: "Create user" }));
    await user.type(screen.getByLabelText("Name", { exact: true }), "New Person");
    await user.type(screen.getByLabelText("Email", { exact: true }), "new@example.test");
    await user.type(screen.getByLabelText("Initial password"), "Initial-fixture-2026!");
    await user.click(screen.getByRole("button", { name: "Save user" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("already in use");
    expect(screen.getByLabelText("Name", { exact: true })).toHaveValue("New Person");
    expect(screen.getByLabelText("Initial password")).toHaveValue("");
    expect(screen.getByLabelText("Email", { exact: true })).toHaveAttribute("aria-invalid", "true");
  });
  it("requires explicit confirmation for resets, disables repeat submission and reports success", async () => {
    let finish!: (value: api.AdminUser) => void;
    const reset = vi.spyOn(api, "resetAdminPassword").mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const user = userEvent.setup(); view();
    await user.click(await screen.findByRole("button", { name: "Reset password for Mali Support" }));
    await user.type(screen.getByLabelText("Initial password"), "Initial-fixture-2026!");
    await user.click(screen.getByRole("button", { name: "Confirm password reset" }));
    expect(reset).not.toHaveBeenCalled();
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Confirm password reset" }));
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    finish({ ...target, version: 2, mustChangePassword: true });
    expect(await screen.findByRole("status")).toHaveTextContent("Initial password reset");
    expect(reset).toHaveBeenCalledTimes(1);
  });
  it("preserves a stale edit until explicit reload and uses the newly read version", async () => {
    const edit = vi.spyOn(api, "editAdminUser").mockRejectedValueOnce(new api.ApiError(409, "VERSION_CONFLICT", "This account changed.")).mockResolvedValue({ ...target, version: 4 });
    const user = userEvent.setup(); view();
    await user.click(await screen.findByRole("button", { name: "Edit Mali Support" }));
    await user.clear(screen.getByLabelText("Name", { exact: true })); await user.type(screen.getByLabelText("Name", { exact: true }), "My edit");
    await user.click(screen.getByRole("button", { name: "Save user" }));
    await screen.findByRole("alert"); expect(screen.getByLabelText("Name", { exact: true })).toHaveValue("My edit");
    vi.mocked(api.getAdminUsers).mockResolvedValue({ items: [{ ...target, displayName: "Other edit", version: 3 }] });
    await user.click(screen.getByRole("button", { name: "Reload account" }));
    await waitFor(() => expect(screen.getByLabelText("Name", { exact: true })).toHaveValue("Other edit"));
    await user.click(screen.getByRole("button", { name: "Save user" }));
    expect(edit).toHaveBeenLastCalledWith(target.id, expect.objectContaining({ version: 3, displayName: "Other edit" }));
  });
  it("invalidates the shell after resetting its own account", async () => {
    vi.spyOn(api, "resetAdminPassword").mockResolvedValue({ ...admin, version: 2, mustChangePassword: true });
    const changed = vi.fn(); const user = userEvent.setup(); view(changed);
    await user.click(await screen.findByRole("button", { name: "Reset password for Local Administrator" }));
    await user.type(screen.getByLabelText("Initial password"), "Initial-fixture-2026!");
    await user.click(screen.getByRole("checkbox")); await user.click(screen.getByRole("button", { name: "Confirm password reset" }));
    await waitFor(() => expect(changed).toHaveBeenCalledWith(expect.objectContaining({ mustChangePassword: true }), true));
  });
  it.each(["REQUESTER", "IT_STAFF"] as const)("shows forbidden feedback on a direct Admin route for %s", async role => {
    history.replaceState({}, "", "/admin/users");
    vi.spyOn(api, "getCurrentUser").mockResolvedValue({ ...admin, role });
    render(<App/>);
    expect(await screen.findByRole("heading", { name: "Access denied" })).toBeInTheDocument();
    expect(api.getAdminUsers).not.toHaveBeenCalled();
  });
});
