import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import { MyTicketsPage, defaultTicketListQuery } from "../../src/MyTicketsPage.js";

const requester: api.DevelopmentRequester = {
  id: 1,
  displayName: "Anan Chaiyasit",
  email: "anan.chaiyasit@example.test",
};

const ticket: api.TicketListItem = {
  id: 41,
  ticketNumber: "TKT-20260901-ABC123",
  summary: "Cannot connect to VPN",
  requestedPriority: "HIGH",
  itPriority: null,
  status: "NEW",
  createdAt: "2026-09-01T03:00:00.000Z",
  updatedAt: "2026-09-01T04:00:00.000Z",
  category: { id: 1, name: "Account and Access" },
  relatedSystem: { id: 2, name: "Network and VPN" },
};

function response(
  data: api.TicketListItem[],
  overrides: Partial<api.TicketListResponse["meta"]> = {},
): api.TicketListResponse {
  return {
    data,
    meta: {
      page: 1,
      pageSize: 10,
      totalItems: data.length,
      totalPages: data.length === 0 ? 0 : 1,
      search: "",
      filters: {
        categoryId: null,
        relatedSystemId: null,
        requestedPriority: null,
        status: null,
      },
      sort: "updatedAt",
      direction: "desc",
      ...overrides,
    },
  };
}

describe("My Tickets", () => {
  beforeEach(() => {
    vi.spyOn(api, "getCategories").mockResolvedValue([
      { id: 1, name: "Account and Access" },
    ]);
    vi.spyOn(api, "getRelatedSystems").mockResolvedValue([
      { id: 2, name: "Network and VPN" },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows loading before rendering owned results and accessible open actions", async () => {
    let resolveTickets!: (value: api.TicketListResponse) => void;
    vi.spyOn(api, "getTickets").mockReturnValue(new Promise((resolve) => {
      resolveTickets = resolve;
    }));

    render(<MyTicketsPage requester={requester} onNavigate={vi.fn()} onRequesterUnavailable={vi.fn()} />);

    expect(screen.getByText("Loading your Tickets…")).toHaveAttribute("aria-busy", "true");
    resolveTickets(response([ticket]));

    expect(await screen.findAllByText(ticket.summary)).toHaveLength(2);
    expect(screen.getAllByText(ticket.ticketNumber).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: ticket.ticketNumber })).toHaveAttribute(
      "href",
      `/tickets/${ticket.id}`,
    );
    expect(screen.getByRole("link", { name: `View Ticket ${ticket.ticketNumber}` }))
      .toHaveAttribute("href", `/tickets/${ticket.id}`);
  });

  it("sends combined search, filter, sort, and pagination controls", async () => {
    const getTickets = vi.spyOn(api, "getTickets").mockResolvedValue(response([ticket], {
      totalItems: 12,
      totalPages: 2,
    }));
    const user = userEvent.setup();

    render(<MyTicketsPage requester={requester} onNavigate={vi.fn()} onRequesterUnavailable={vi.fn()} />);
    await screen.findAllByText(ticket.summary);

    await user.type(screen.getByRole("searchbox", { name: /Ticket Number or Summary/i }), " VPN ");
    await user.click(screen.getByRole("button", { name: "Search" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Category filter" }), "1");
    await user.selectOptions(screen.getByRole("combobox", { name: "Related System filter" }), "2");
    await user.selectOptions(screen.getByRole("combobox", { name: "Requested Priority filter" }), "HIGH");
    await user.selectOptions(screen.getByRole("combobox", { name: "Status filter" }), "NEW");
    await user.selectOptions(screen.getByRole("combobox", { name: "Sort by" }), "ticketNumber");
    await user.selectOptions(screen.getByRole("combobox", { name: "Direction" }), "asc");
    await user.selectOptions(screen.getByRole("combobox", { name: "Tickets per page" }), "20");

    await waitFor(() => {
      expect(getTickets).toHaveBeenLastCalledWith(requester.id, {
        search: "VPN",
        categoryId: 1,
        relatedSystemId: 2,
        requestedPriority: "HIGH",
        status: "NEW",
        sort: "ticketNumber",
        direction: "asc",
        page: 1,
        pageSize: 20,
      });
    });
  });

  it("distinguishes an empty account from an active query with no results", async () => {
    vi.spyOn(api, "getTickets").mockImplementation(async (_requesterId, query) =>
      response([], { search: query.search }));
    const user = userEvent.setup();

    render(
      <MyTicketsPage requester={requester} onNavigate={vi.fn()} onRequesterUnavailable={vi.fn()} />,
    );
    expect(await screen.findByRole("heading", { name: "You have no Tickets yet" }))
      .toBeInTheDocument();
    expect(screen.queryByText("No Tickets match your search")).not.toBeInTheDocument();

    await user.type(screen.getByRole("searchbox"), "missing");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByRole("heading", { name: "No Tickets match your search" }))
      .toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Clear Filters" })).toHaveLength(2);
  });

  it("clears all controls back to the documented defaults", async () => {
    const getTickets = vi.spyOn(api, "getTickets").mockResolvedValue(response([ticket]));
    const user = userEvent.setup();

    render(<MyTicketsPage requester={requester} onNavigate={vi.fn()} onRequesterUnavailable={vi.fn()} />);
    await screen.findAllByText(ticket.summary);
    await user.selectOptions(screen.getByRole("combobox", { name: "Requested Priority filter" }), "HIGH");
    await user.selectOptions(screen.getByRole("combobox", { name: "Direction" }), "asc");
    await user.click(screen.getByRole("button", { name: "Clear Filters" }));

    await waitFor(() => {
      expect(getTickets).toHaveBeenLastCalledWith(requester.id, defaultTicketListQuery);
    });
  });

  it("requests the next one-based page and exposes accurate pagination controls", async () => {
    const getTickets = vi.spyOn(api, "getTickets").mockImplementation(
      async (_requesterId, query) => response([ticket], {
        page: query.page,
        totalItems: 12,
        totalPages: 2,
      }),
    );
    const user = userEvent.setup();

    render(<MyTicketsPage requester={requester} onNavigate={vi.fn()} onRequesterUnavailable={vi.fn()} />);
    await screen.findByText("Page 1 of 2");
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Next" }));

    await screen.findByText("Page 2 of 2");
    expect(getTickets).toHaveBeenLastCalledWith(requester.id, {
      ...defaultTicketListQuery,
      page: 2,
    });
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled();
  });

  it("shows a safe recoverable failure without stale rows", async () => {
    vi.spyOn(api, "getTickets")
      .mockRejectedValueOnce(new Error("private database detail"))
      .mockResolvedValueOnce(response([ticket]));
    const user = userEvent.setup();

    render(<MyTicketsPage requester={requester} onNavigate={vi.fn()} onRequesterUnavailable={vi.fn()} />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Your Tickets are unavailable");
    expect(alert).not.toHaveTextContent("private database detail");
    expect(screen.queryByText(ticket.summary)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findAllByText(ticket.summary)).toHaveLength(2);
  });

  it("removes the old Requester's rows before loading a new Requester", async () => {
    let resolveSecond!: (value: api.TicketListResponse) => void;
    vi.spyOn(api, "getTickets")
      .mockResolvedValueOnce(response([ticket]))
      .mockReturnValueOnce(new Promise((resolve) => { resolveSecond = resolve; }));
    const secondRequester = { ...requester, id: 2, displayName: "Kanya Srisuk" };

    const { rerender } = render(
      <MyTicketsPage requester={requester} onNavigate={vi.fn()} onRequesterUnavailable={vi.fn()} />,
    );
    await screen.findAllByText(ticket.summary);

    rerender(<MyTicketsPage requester={secondRequester} onNavigate={vi.fn()} onRequesterUnavailable={vi.fn()} />);
    expect(screen.queryByText(ticket.summary)).not.toBeInTheDocument();
    expect(screen.getByText("Loading your Tickets…")).toBeInTheDocument();
    resolveSecond(response([]));
    expect(await screen.findByRole("heading", { name: "You have no Tickets yet" }))
      .toBeInTheDocument();
  });
});
