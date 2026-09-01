import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import { CreateTicketPage } from "../../src/CreateTicketPage.js";
import { attachmentSelectionError } from "../../src/CreateTicketPage.js";

const requester: api.DevelopmentRequester = {
  id: 1,
  displayName: "Anan Chaiyasit",
  email: "anan.chaiyasit@example.test",
};

describe("Create Ticket", () => {
  beforeEach(() => {
    vi.spyOn(api, "getCategories").mockResolvedValue([{ id: 1, name: "Hardware" }]);
    vi.spyOn(api, "getRelatedSystems").mockResolvedValue([{ id: 2, name: "Network and VPN" }]);
  });

  afterEach(() => vi.restoreAllMocks());

  async function completeRequiredFields(user: ReturnType<typeof userEvent.setup>) {
    await user.selectOptions(await screen.findByLabelText(/Category/), "1");
    await user.selectOptions(screen.getByLabelText(/Related System/), "2");
    await user.selectOptions(screen.getByLabelText(/Requested Priority/), "HIGH");
    await user.type(screen.getByLabelText(/Summary/), "Cannot connect to VPN");
    await user.type(
      screen.getByLabelText(/Description/),
      "The VPN gateway cannot be reached from home.",
    );
  }

  it("renders reference choices and read-only generated context", async () => {
    render(<CreateTicketPage requester={requester} />);

    expect(await screen.findByRole("option", { name: "Hardware" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Network and VPN" })).toBeInTheDocument();
    expect(screen.getAllByText("Generated after submission", { selector: "strong" })).toHaveLength(2);
    expect(screen.getByText("Not assigned")).toBeInTheDocument();
  });

  it("shows all client validation errors without making a request", async () => {
    const create = vi.spyOn(api, "createTicket");
    const user = userEvent.setup();
    render(<CreateTicketPage requester={requester} />);

    await screen.findByRole("option", { name: "Hardware" });
    await user.click(screen.getByRole("button", { name: "Create Ticket" }));

    expect(screen.getByText("Select a Category.")).toBeInTheDocument();
    expect(screen.getByText("Select a Related System.")).toBeInTheDocument();
    expect(screen.getByText("Select a Requested Priority.")).toBeInTheDocument();
    expect(screen.getByText("Summary must be between 5 and 120 characters.")).toBeInTheDocument();
    expect(screen.getByText("Description must be between 10 and 4000 characters.")).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it("prevents repeated submission and presents the official Ticket Number", async () => {
    let resolveCreate!: (ticket: api.CreatedTicket) => void;
    const create = vi.spyOn(api, "createTicket").mockReturnValue(new Promise((resolve) => {
      resolveCreate = resolve;
    }));
    const user = userEvent.setup();
    render(<CreateTicketPage requester={requester} />);
    await completeRequiredFields(user);

    const submit = screen.getByRole("button", { name: "Create Ticket" });
    await user.dblClick(submit);
    expect(create).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Creating Ticket…" })).toBeDisabled();

    resolveCreate({
      id: 42,
      ticketNumber: "TKT-20260901-A1B2C3",
      requesterId: requester.id,
      status: "NEW",
      createdAt: "2026-09-01T03:00:00.000Z",
    });

    expect(await screen.findByRole("heading", { name: "TKT-20260901-A1B2C3" })).toBeInTheDocument();
    const ticketDate = screen.getByText("Ticket Date").parentElement;
    expect(ticketDate).toHaveTextContent(/2026/);
    expect(ticketDate).not.toHaveTextContent(/2569/);
    expect(screen.getByRole("button", { name: "Ticket created" })).toBeDisabled();
  });

  it("preserves entered values when Ticket creation fails safely", async () => {
    vi.spyOn(api, "createTicket").mockRejectedValue(
      new api.ApiError(500, "TICKET_CREATE_FAILED", "The Ticket could not be created. Try again."),
    );
    const user = userEvent.setup();
    render(<CreateTicketPage requester={requester} />);
    await completeRequiredFields(user);

    await user.click(screen.getByRole("button", { name: "Create Ticket" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("The Ticket could not be created");
    expect(screen.getByLabelText(/Summary/)).toHaveValue("Cannot connect to VPN");
    expect(screen.getByRole("button", { name: "Create Ticket" })).toBeEnabled();
  });

  it("rejects a detectable file signature mismatch before submission", async () => {
    const disguised = new File(["not a PDF"], "evidence.pdf", { type: "application/pdf" });

    await expect(attachmentSelectionError(disguised)).resolves.toBe(
      "evidence.pdf does not match its declared file type.",
    );
  });

  it("keeps the created Ticket when one initial file upload fails", async () => {
    vi.spyOn(api, "createTicket").mockResolvedValue({
      id: 43,
      ticketNumber: "TKT-20260901-Z9Y8X7",
      requesterId: requester.id,
      status: "NEW",
      createdAt: "2026-09-01T03:00:00.000Z",
    });
    vi.spyOn(api, "uploadTicketAttachment")
      .mockResolvedValueOnce({
        id: 1, ticketId: 43, originalName: "one.png", mimeType: "image/png",
        sizeBytes: 9, createdAt: "2026-09-01T03:00:01.000Z",
      })
      .mockRejectedValueOnce(new api.ApiError(500, "ATTACHMENT_UPLOAD_FAILED", "Upload failed."));
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    const user = userEvent.setup();
    render(<CreateTicketPage requester={requester} />);
    await completeRequiredFields(user);
    await user.upload(screen.getByLabelText("Choose files"), [
      new File([png], "one.png", { type: "image/png" }),
      new File([png], "two.png", { type: "image/png" }),
    ]);
    await screen.findByText("one.png");

    await user.click(screen.getByRole("button", { name: "Create Ticket" }));

    expect(await screen.findByRole("heading", { name: "TKT-20260901-Z9Y8X7" })).toBeInTheDocument();
    await waitFor(() => expect(api.uploadTicketAttachment).toHaveBeenCalledTimes(2));
    expect(screen.getByText("succeeded")).toBeInTheDocument();
    expect(screen.getByText("failed")).toBeInTheDocument();
    expect(screen.getByText("Upload failed.")).toBeInTheDocument();
  });
});
