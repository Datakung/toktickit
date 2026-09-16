import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import App from "../../src/App.js";

const requester: api.CurrentUser = { id:1, displayName:"Anan Chaiyasit", email:"anan.chaiyasit@example.test", role:"REQUESTER", isActive:true, mustChangePassword:false };
describe("Lab 3 authenticated shell", () => {
  beforeEach(() => { window.history.replaceState({},"","/login"); });
  afterEach(() => vi.restoreAllMocks());
  function mockTickets() {
    vi.spyOn(api,"getAdminUsers").mockResolvedValue({ items: [] });
    vi.spyOn(api,"getCategories").mockResolvedValue([]);
    vi.spyOn(api,"getRelatedSystems").mockResolvedValue([]);
    return vi.spyOn(api,"getTickets").mockResolvedValue({data:[],meta:{page:1,pageSize:10,totalItems:0,totalPages:0,search:"",filters:{categoryId:null,relatedSystemId:null,requestedPriority:null,status:null},sort:"updatedAt",direction:"desc"}});
  }
  it.each(["REQUESTER", "IT_STAFF", "ADMINISTRATOR"] as const)("allows a normal %s to open and complete password change", async role => {
    window.history.replaceState({}, "", "/change-password");
    const account = { ...requester, role };
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(account);
    vi.spyOn(api, "changePassword").mockResolvedValue(account);
    mockTickets();
    const user = userEvent.setup(); render(<App/>);
    await screen.findByRole("heading", { name: "Change your password" });
    await user.type(screen.getByLabelText("Current password"), "current-password-value");
    await user.type(screen.getByLabelText("New password"), "another-private-password");
    await user.type(screen.getByLabelText("Confirm new password"), "another-private-password");
    await user.click(screen.getByRole("button", { name: "Change password" }));
    await waitFor(() => expect(location.pathname).toBe(role === "ADMINISTRATOR" ? "/admin/users" : role === "IT_STAFF" ? "/staff/tickets" : "/tickets"));
    await user.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByRole("heading", { name: "Change your password" })).toBeInTheDocument();
  });
  it.each([new TypeError("Network unavailable"), new api.ApiError(500, "AUTHENTICATION_FAILED", "Unavailable")])("retains the session on failed logout and supports reload and retry: %s", async failure => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(requester);
    const signOut = vi.spyOn(api, "logout").mockRejectedValue(failure);
    mockTickets();
    const user = userEvent.setup(); const view = render(<App/>);
    await user.click(await screen.findByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Your session may still be active");
    expect(screen.queryByRole("heading", { name: "Sign in" })).not.toBeInTheDocument();
    view.unmount(); render(<App/>);
    expect(await screen.findByText("Signed in · Requester")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    await screen.findByRole("alert");
    signOut.mockResolvedValue(undefined);
    await user.click(screen.getByRole("button", { name: "Retry sign out" }));
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });
  it("returns to login after a protected 401 and blocks stale back navigation without logout", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(requester);
    const signOut = vi.spyOn(api, "logout");
    const tickets = mockTickets();
    tickets.mockRejectedValue(new api.ApiError(401, "AUTHENTICATION_REQUIRED", "Sign in to continue."));
    render(<App/>);
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(signOut).not.toHaveBeenCalled();
    act(() => { history.pushState({}, "", "/tickets/1"); window.dispatchEvent(new PopStateEvent("popstate")); });
    await waitFor(() => expect(location.pathname).toBe("/login"));
    expect(screen.queryByText("Signed in · Requester")).not.toBeInTheDocument();
  });
  it("handles an already revoked session during sign-out", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(requester);
    vi.spyOn(api, "logout").mockRejectedValue(new api.ApiError(401, "AUTHENTICATION_REQUIRED", "Sign in to continue."));
    mockTickets(); const user = userEvent.setup(); render(<App/>);
    await user.click(await screen.findByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("shows a neutral loading state before session discovery finishes", () => {
    vi.spyOn(api,"getCurrentUser").mockReturnValue(new Promise(()=>{})); render(<App/>);
    expect(screen.getByRole("heading",{name:"Loading TokTickIT…"})).toBeInTheDocument();
  });
  it("shows login and clears the password after a safe failure", async () => {
    vi.spyOn(api,"getCurrentUser").mockRejectedValue(new api.ApiError(401,"AUTHENTICATION_REQUIRED","Sign in to continue."));
    vi.spyOn(api,"login").mockRejectedValue(new api.ApiError(401,"INVALID_CREDENTIALS","Email or password is incorrect."));
    const user=userEvent.setup(); render(<App/>); await screen.findByRole("heading",{name:"Sign in"});
    expect(screen.getByRole("button", { name: "Show password" })).toHaveAttribute("aria-pressed", "false");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
    await user.type(screen.getByLabelText("Email"),requester.email); await user.type(screen.getByLabelText("Password"),"not-the-password"); await user.click(screen.getByRole("button",{name:"Sign in"}));
    expect(await screen.findByRole("alert")).toHaveTextContent("Email or password is incorrect"); expect(screen.getByRole("alert")).toHaveTextContent("Contact your TokTickIT administrator"); expect(screen.getByLabelText("Password")).toHaveValue("");
  });
  it("routes initial credentials only to mandatory password change", async () => {
    vi.spyOn(api,"getCurrentUser").mockRejectedValue(new Error());
    vi.spyOn(api,"login").mockResolvedValue({...requester,mustChangePassword:true});
    const user=userEvent.setup(); render(<App/>); await screen.findByRole("heading",{name:"Sign in"});
    await user.type(screen.getByLabelText("Email"),requester.email); await user.type(screen.getByLabelText("Password"),"initial-fixture-password"); await user.click(screen.getByRole("button",{name:"Sign in"}));
    expect(await screen.findByRole("heading",{name:"Change your password"})).toBeInTheDocument(); expect(screen.queryByText("My Tickets")).not.toBeInTheDocument();
  });
  it("changes the password and enters the Requester workspace", async () => {
    vi.spyOn(api,"getCurrentUser").mockResolvedValue({...requester,mustChangePassword:true});
    vi.spyOn(api,"changePassword").mockResolvedValue(requester);
    vi.spyOn(api,"getCategories").mockResolvedValue([]); vi.spyOn(api,"getRelatedSystems").mockResolvedValue([]); vi.spyOn(api,"getTickets").mockResolvedValue({data:[],meta:{page:1,pageSize:10,totalItems:0,totalPages:0,search:"",filters:{categoryId:null,relatedSystemId:null,requestedPriority:null,status:null},sort:"updatedAt",direction:"desc"}});
    const user=userEvent.setup(); render(<App/>); await screen.findByRole("heading",{name:"Change your password"});
    await user.type(screen.getByLabelText("Current password"),"initial-fixture-password"); await user.type(screen.getByLabelText("New password"),"changed-fixture-password"); await user.type(screen.getByLabelText("Confirm new password"),"changed-fixture-password"); await user.click(screen.getByRole("button",{name:"Change password"}));
    expect(await screen.findByRole("heading",{name:"My Tickets"})).toBeInTheDocument(); expect(screen.getByText("Signed in · Requester")).toBeInTheDocument();
  });
  it("renders role-specific placeholders instead of Requester navigation", async () => {
    vi.spyOn(api,"getCurrentUser").mockResolvedValue({...requester,role:"IT_STAFF"}); render(<App/>);
    expect(await screen.findByRole("heading",{name:"IT Staff"})).toBeInTheDocument(); expect(screen.queryByText("Create Ticket")).not.toBeInTheDocument();
  });
});
