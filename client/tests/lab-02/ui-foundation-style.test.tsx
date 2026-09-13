import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import App from "../../src/App.js";

const requester: api.CurrentUser = {
  id: 1,
  displayName: "Anan Chaiyasit",
  email: "anan.chaiyasit@example.test",
  role: "REQUESTER",
  isActive: true,
  mustChangePassword: false,
};

describe("Zen Green authenticated Requester foundation", () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState({}, "", "/tickets");
    vi.spyOn(api, "getCategories").mockResolvedValue([]);
    vi.spyOn(api, "getRelatedSystems").mockResolvedValue([]);
    vi.spyOn(api, "getTickets").mockResolvedValue({
      data: [],
      meta: {
        page: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 0,
        search: "",
        filters: {
          categoryId: null,
          relatedSystemId: null,
          requestedPriority: null,
          status: null,
        },
        sort: "updatedAt",
        direction: "desc",
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses accessible sign-in controls and the approved component hierarchy", async () => {
    vi.spyOn(api, "getCurrentUser").mockRejectedValue(
      new api.ApiError(401, "AUTHENTICATION_REQUIRED", "Sign in to continue."),
    );

    render(<App />);

    await screen.findByRole("heading", { name: "Sign in" });
    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "username");
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
    expect(screen.getByRole("button", { name: "Sign in" })).toHaveClass(
      "primary-button",
    );
    expect(screen.getByRole("heading", { name: "Sign in" }).closest(".selection-card"))
      .not.toBeNull();
  });

  it("provides real navigation links and an accessible mobile disclosure", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(requester);
    const user = userEvent.setup();

    render(<App />);

    await screen.findByRole("heading", { name: "My Tickets" });
    await screen.findByRole("heading", { name: "You have no Tickets yet" });
    // CSS is loaded in Vitest so the desktop viewport hides this mobile-only
    // control. Query the element directly because this test verifies its
    // disclosure semantics, not its visibility at the current viewport.
    const menu = document.querySelector<HTMLButtonElement>(".mobile-nav-toggle");
    expect(menu).not.toBeNull();
    const navigation = screen.getByRole("navigation", { name: "Primary navigation" });
    const myTickets = within(navigation).getByRole("link", { name: "My Tickets" });
    const createTicket = within(navigation).getByRole("link", { name: "Create Ticket" });

    expect(menu).toHaveAttribute("aria-expanded", "false");
    expect(menu).toHaveAttribute("aria-controls", "primary-navigation");
    expect(myTickets).toHaveAttribute("href", "/tickets");
    expect(myTickets).toHaveAttribute("aria-current", "page");
    expect(createTicket).toHaveAttribute("href", "/tickets/new");

    await user.click(menu!);
    expect(menu).toHaveAttribute("aria-expanded", "true");

    await user.click(createTicket);
    expect(window.location.pathname).toBe("/tickets/new");
    expect(createTicket).toHaveAttribute("aria-current", "page");
    expect(menu).toHaveAttribute("aria-expanded", "false");
  });
});
