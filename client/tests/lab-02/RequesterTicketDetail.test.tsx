import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import { TicketDetailPage } from "../../src/TicketDetailPage.js";

const requester: api.DevelopmentRequester = {
  id: 1,
  displayName: "Anan Chaiyasit",
  email: "anan.chaiyasit@example.test",
};

function detail(): api.TicketDetail {
  return {
    id: 41,
    ticketNumber: "TKT-20260901-ABC123",
    requester,
    category: { id: 1, name: "Hardware" },
    relatedSystem: { id: 2, name: "Student Information System" },
    summary: "Laptop screen flickers",
    description: "The screen flickers after the laptop resumes from sleep.",
    requestedPriority: "HIGH",
    itPriority: null,
    status: "NEW",
    createdAt: "2026-09-01T03:00:00.000Z",
    updatedAt: "2026-09-01T04:00:00.000Z",
    attachments: [],
  };
}

afterEach(() => vi.restoreAllMocks());

describe("Requester Ticket Detail", () => {
  it("clears stale content while loading and renders the approved fields read-only", async () => {
    let resolveDetail!: (value: api.TicketDetail) => void;
    vi.spyOn(api, "getTicket").mockReturnValue(new Promise((resolve) => {
      resolveDetail = resolve;
    }));

    render(<TicketDetailPage requester={requester} ticketId="41" onNavigate={vi.fn()} />);
    expect(screen.getByText("Loading Ticket Detail…").closest("section"))
      .toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText("Laptop screen flickers")).not.toBeInTheDocument();

    resolveDetail(detail());
    expect(await screen.findByRole("heading", { name: "TKT-20260901-ABC123" })).toBeVisible();
    expect(screen.getByText("Laptop screen flickers")).toBeVisible();
    expect(screen.getByText("The screen flickers after the laptop resumes from sleep.")).toBeVisible();
    expect(screen.getByText("Hardware")).toBeVisible();
    expect(screen.getByText("Student Information System")).toBeVisible();
    expect(screen.getByText("Not assigned")).toBeVisible();
    expect(screen.queryByRole("textbox", { name: /Summary/i })).not.toBeInTheDocument();
    expect(api.getTicket).toHaveBeenCalledWith(requester.id, "41");
  });

  it("uses application navigation for Back to My Tickets", async () => {
    vi.spyOn(api, "getTicket").mockResolvedValue(detail());
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<TicketDetailPage requester={requester} ticketId="41" onNavigate={onNavigate} />);

    await screen.findByText("Laptop screen flickers");
    await user.click(screen.getByRole("link", { name: /Back to My Tickets/ }));
    expect(onNavigate).toHaveBeenCalledWith("/tickets");
  });

  it("shows the same safe unavailable state for invalid or non-owned Tickets", async () => {
    vi.spyOn(api, "getTicket").mockRejectedValue(
      new api.ApiError(404, "TICKET_NOT_FOUND", "Ticket not found."),
    );
    render(<TicketDetailPage requester={requester} ticketId="999" onNavigate={vi.fn()} />);

    expect(await screen.findByRole("heading", { name: "Ticket unavailable" })).toBeVisible();
    expect(screen.getByText(/could not be found or is not available/)).toBeVisible();
    expect(screen.queryByText("Laptop screen flickers")).not.toBeInTheDocument();
  });

  it("offers Retry after a safe unexpected failure", async () => {
    vi.spyOn(api, "getTicket")
      .mockRejectedValueOnce(new api.ApiError(500, "TICKET_RETRIEVAL_FAILED", "Try again."))
      .mockResolvedValueOnce(detail());
    const user = userEvent.setup();
    render(<TicketDetailPage requester={requester} ticketId="41" onNavigate={vi.fn()} />);

    expect(await screen.findByRole("heading", { name: "Ticket Detail is unavailable" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(api.getTicket).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Laptop screen flickers")).toBeVisible();
  });
});
