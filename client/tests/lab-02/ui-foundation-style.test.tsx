import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import App, { DEVELOPMENT_REQUESTER_STORAGE_KEY } from "../../src/App.js";

describe("Zen Green requester-context foundation", () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState({}, "", "/select-requester");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses accessible control semantics and the approved component hierarchy", async () => {
    vi.spyOn(api, "getDevelopmentRequesters").mockResolvedValue([
      {
        id: 1,
        displayName: "Anan Chaiyasit",
        email: "anan.chaiyasit@example.test",
      },
    ]);

    render(<App />);

    await screen.findByRole("option", { name: /Anan Chaiyasit/i });
    const select = screen.getByRole("combobox", {
      name: /Development Requester/i,
    });
    expect(select).toHaveAttribute("aria-describedby", "requester-help");
    expect(select.closest(".selection-card")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Continue" })).toHaveClass(
      "primary-button",
    );
  });

  it("provides real navigation links and an accessible mobile disclosure", async () => {
    sessionStorage.setItem(DEVELOPMENT_REQUESTER_STORAGE_KEY, "1");
    window.history.replaceState({}, "", "/tickets");
    vi.spyOn(api, "getDevelopmentRequesters").mockResolvedValue([
      {
        id: 1,
        displayName: "Anan Chaiyasit",
        email: "anan.chaiyasit@example.test",
      },
    ]);
    const user = userEvent.setup();

    render(<App />);

    await screen.findByRole("heading", { name: "Requester context ready" });
    const menu = screen.getByRole("button", { name: "Menu" });
    const myTickets = screen.getByRole("link", { name: "My Tickets" });
    const createTicket = screen.getByRole("link", { name: "Create Ticket" });

    expect(menu).toHaveAttribute("aria-expanded", "false");
    expect(menu).toHaveAttribute("aria-controls", "primary-navigation");
    expect(myTickets).toHaveAttribute("href", "/tickets");
    expect(myTickets).toHaveAttribute("aria-current", "page");
    expect(createTicket).toHaveAttribute("href", "/tickets/new");

    await user.click(menu);
    expect(menu).toHaveAttribute("aria-expanded", "true");

    await user.click(createTicket);
    expect(window.location.pathname).toBe("/tickets/new");
    expect(createTicket).toHaveAttribute("aria-current", "page");
    expect(menu).toHaveAttribute("aria-expanded", "false");
  });
});
