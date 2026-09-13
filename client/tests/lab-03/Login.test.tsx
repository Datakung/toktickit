import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import App from "../../src/App.js";

const requester: api.CurrentUser = { id:1, displayName:"Anan Chaiyasit", email:"anan.chaiyasit@example.test", role:"REQUESTER", isActive:true, mustChangePassword:false };
describe("Lab 3 authenticated shell", () => {
  beforeEach(() => { window.history.replaceState({},"","/login"); });
  afterEach(() => vi.restoreAllMocks());
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
