import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import App, { DEVELOPMENT_REQUESTER_STORAGE_KEY } from "../../src/App.js";

const requesters: api.DevelopmentRequester[] = [
  { id: 1, displayName: "Anan Chaiyasit", email: "anan.chaiyasit@example.test" },
  { id: 2, displayName: "Kanya Srisuk", email: "kanya.srisuk@example.test" },
];

describe("Development Requester selection", () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState({}, "", "/select-requester");
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

  it("shows an accessible loading state while Requesters load", () => {
    vi.spyOn(api, "getDevelopmentRequesters").mockReturnValue(new Promise(() => {}));

    render(<App />);

    expect(screen.getByText("Loading Development Requesters…")).toHaveAttribute(
      "aria-live",
      "polite",
    );
    expect(
      screen.getByRole("combobox", { name: /Development Requester/i }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("stores an active selection for this tab and displays it in the shell", async () => {
    vi.spyOn(api, "getDevelopmentRequesters").mockResolvedValue(requesters);
    const user = userEvent.setup();

    render(<App />);

    await screen.findByRole("option", { name: /Kanya Srisuk/i });
    await user.selectOptions(
      screen.getByRole("combobox", { name: /Development Requester/i }),
      "2",
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(sessionStorage.getItem(DEVELOPMENT_REQUESTER_STORAGE_KEY)).toBe("2");
    expect(window.location.pathname).toBe("/tickets");
    expect(screen.getAllByText("Kanya Srisuk")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Change Requester" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "My Tickets" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "You have no Tickets yet" }))
      .toBeInTheDocument();
  });

  it("shows an empty state without a Continue action", async () => {
    vi.spyOn(api, "getDevelopmentRequesters").mockResolvedValue([]);

    render(<App />);

    expect(
      await screen.findByText("No active Development Requesters are available."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continue" })).not.toBeInTheDocument();
  });

  it("shows a safe failure and retries without fabricated options", async () => {
    vi.spyOn(api, "getDevelopmentRequesters")
      .mockRejectedValueOnce(new Error("private server detail"))
      .mockResolvedValueOnce(requesters);
    const user = userEvent.setup();

    render(<App />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Development Requesters are unavailable");
    expect(alert).not.toHaveTextContent("private server detail");
    expect(screen.queryByRole("option", { name: /Anan/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("option", { name: /Anan Chaiyasit/i })).toBeInTheDocument();
  });

  it("clears an unavailable stored Requester and returns to selection", async () => {
    sessionStorage.setItem(DEVELOPMENT_REQUESTER_STORAGE_KEY, "999");
    window.history.replaceState({}, "", "/tickets");
    vi.spyOn(api, "getDevelopmentRequesters").mockResolvedValue(requesters);

    render(<App />);

    await screen.findByRole("option", { name: /Anan Chaiyasit/i });
    expect(
      screen.getByRole("combobox", { name: /Development Requester/i }),
    ).toBeInTheDocument();
    expect(sessionStorage.getItem(DEVELOPMENT_REQUESTER_STORAGE_KEY)).toBeNull();
    expect(window.location.pathname).toBe("/select-requester");
  });

  it("Change Requester clears session context and requester-specific UI", async () => {
    sessionStorage.setItem(DEVELOPMENT_REQUESTER_STORAGE_KEY, "1");
    window.history.replaceState({}, "", "/tickets");
    vi.spyOn(api, "getDevelopmentRequesters").mockResolvedValue(requesters);
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Change Requester" }));

    expect(sessionStorage.getItem(DEVELOPMENT_REQUESTER_STORAGE_KEY)).toBeNull();
    expect(window.location.pathname).toBe("/select-requester");
    expect(screen.queryByText("Anan Chaiyasit")).not.toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /Development Requester/i }),
    ).toBeInTheDocument();
  });

  it("supports a direct owned Ticket Detail route and clears it on Requester change", async () => {
    sessionStorage.setItem(DEVELOPMENT_REQUESTER_STORAGE_KEY, "1");
    window.history.replaceState({}, "", "/tickets/41");
    vi.spyOn(api, "getDevelopmentRequesters").mockResolvedValue(requesters);
    vi.spyOn(api, "getTicket").mockResolvedValue({
      id: 41,
      ticketNumber: "TKT-20260901-ABC123",
      requester: requesters[0],
      category: { id: 1, name: "Hardware" },
      relatedSystem: { id: 2, name: "Network and VPN" },
      summary: "Owned Ticket Detail",
      description: "Only the selected Requester can read this Ticket.",
      requestedPriority: "HIGH",
      itPriority: null,
      status: "NEW",
      createdAt: "2026-09-01T03:00:00.000Z",
      updatedAt: "2026-09-01T04:00:00.000Z",
      attachments: [],
    });
    const user = userEvent.setup();

    render(<App />);
    expect(await screen.findByRole("heading", { name: "TKT-20260901-ABC123" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Change Requester" }));

    expect(window.location.pathname).toBe("/select-requester");
    expect(screen.queryByText("Owned Ticket Detail")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Development Requester/i })).toBeVisible();
  });

  it("clears requester context and explains a Ticket Detail 403", async () => {
    sessionStorage.setItem(DEVELOPMENT_REQUESTER_STORAGE_KEY, "1");
    window.history.replaceState({}, "", "/tickets/41");
    vi.spyOn(api, "getDevelopmentRequesters").mockResolvedValue(requesters);
    vi.spyOn(api, "getTicket").mockRejectedValue(
      new api.ApiError(403, "REQUESTER_UNAVAILABLE", "Internal requester detail."),
    );

    render(<App />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Requester selection required");
    expect(alert).toHaveTextContent("selected Development Requester is no longer available");
    expect(alert).not.toHaveTextContent("Internal requester detail");
    expect(sessionStorage.getItem(DEVELOPMENT_REQUESTER_STORAGE_KEY)).toBeNull();
    expect(window.location.pathname).toBe("/select-requester");
    expect(screen.getByRole("combobox", { name: /Development Requester/i })).toBeVisible();
    expect(screen.queryByRole("option", { name: /Anan Chaiyasit/i })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Kanya Srisuk/i })).toBeVisible();
    expect(screen.getAllByRole("option")).toHaveLength(2);
  });

  it("keeps browser route changes and the rendered screen synchronized", async () => {
    vi.spyOn(api, "getDevelopmentRequesters").mockResolvedValue(requesters);
    const user = userEvent.setup();

    render(<App />);

    await screen.findByRole("option", { name: /Anan Chaiyasit/i });
    await user.selectOptions(
      screen.getByRole("combobox", { name: /Development Requester/i }),
      "1",
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(
      screen.getByRole("heading", { name: "My Tickets" }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "You have no Tickets yet" }))
      .toBeInTheDocument();

    act(() => {
      window.history.replaceState({}, "", "/select-requester");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(
      screen.getByRole("combobox", { name: /Development Requester/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "My Tickets" }),
    ).not.toBeInTheDocument();

    act(() => {
      window.history.replaceState({}, "", "/tickets");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(
      screen.getByRole("heading", { name: "My Tickets" }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "You have no Tickets yet" }))
      .toBeInTheDocument();
  });
});
