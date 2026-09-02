import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import { CreateTicketPage } from "../../src/CreateTicketPage.js";
import { MyTicketsPage, defaultTicketListQuery } from "../../src/MyTicketsPage.js";
import { TicketDetailPage } from "../../src/TicketDetailPage.js";

const requester: api.DevelopmentRequester = {
  id: 1,
  displayName: "Anan Chaiyasit",
  email: "anan.chaiyasit@example.test",
};

const activeAttachment: api.AttachmentMetadata = {
  id: 21,
  ticketId: 41,
  originalName: "release-evidence.png",
  mimeType: "image/png",
  sizeBytes: 9,
  createdAt: "2026-09-01T03:10:00.000Z",
  removed: false,
  removedAt: null,
  removalReason: null,
  removedByRequesterId: null,
};

function ticketDetail(attachments = [activeAttachment]): api.TicketDetail {
  return {
    id: 41,
    ticketNumber: "TKT-20260901-QA0001",
    requester,
    category: { id: 1, name: "Hardware" },
    relatedSystem: { id: 2, name: "Network and VPN" },
    summary: "Release safe-error audit",
    description: "The form and Attachment actions must remain safely recoverable.",
    requestedPriority: "MEDIUM",
    itPriority: null,
    status: "NEW",
    createdAt: "2026-09-01T03:00:00.000Z",
    updatedAt: "2026-09-01T03:00:00.000Z",
    attachments,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(URL, "createObjectURL");
  Reflect.deleteProperty(URL, "revokeObjectURL");
});

describe("release-wide safe and recoverable UI failures", () => {
  it("recovers reference loading and preserves Create Ticket input across a safe retry", async () => {
    vi.spyOn(api, "getCategories")
      .mockRejectedValueOnce(new Error("private reference database detail"))
      .mockResolvedValueOnce([{ id: 1, name: "Hardware" }]);
    vi.spyOn(api, "getRelatedSystems").mockResolvedValue([
      { id: 2, name: "Network and VPN" },
    ]);
    vi.spyOn(api, "createTicket")
      .mockRejectedValueOnce(new api.ApiError(
        500,
        "TICKET_CREATE_FAILED",
        "The Ticket could not be created. Try again.",
      ))
      .mockResolvedValueOnce({
        id: 41,
        ticketNumber: "TKT-20260901-QA0001",
        requesterId: requester.id,
        status: "NEW",
        createdAt: "2026-09-01T03:00:00.000Z",
      });
    const user = userEvent.setup();

    render(<CreateTicketPage requester={requester} onRequesterUnavailable={vi.fn()} />);

    const referenceAlert = await screen.findByRole("alert");
    expect(referenceAlert).toHaveTextContent("Ticket form is unavailable");
    expect(referenceAlert).not.toHaveTextContent("private reference database detail");
    await user.click(within(referenceAlert).getByRole("button", { name: "Retry" }));

    await user.selectOptions(await screen.findByLabelText(/Category/), "1");
    await user.selectOptions(screen.getByLabelText(/Related System/), "2");
    await user.selectOptions(screen.getByLabelText(/Requested Priority/), "MEDIUM");
    await user.type(screen.getByLabelText(/Summary/), "Safe retry retains this summary");
    await user.type(
      screen.getByLabelText(/Description/),
      "The first API attempt will fail without clearing this description.",
    );
    await user.click(screen.getByRole("button", { name: "Create Ticket" }));

    const createAlert = await screen.findByRole("alert");
    expect(createAlert).toHaveTextContent("The Ticket could not be created");
    expect(screen.getByLabelText(/Summary/)).toHaveValue("Safe retry retains this summary");
    await user.click(screen.getByRole("button", { name: "Create Ticket" }));
    expect(await screen.findByRole("heading", { name: "TKT-20260901-QA0001" }))
      .toBeVisible();
    expect(api.createTicket).toHaveBeenCalledTimes(2);
  });

  it("removes stale list data and retries while reference filters fail safely", async () => {
    vi.spyOn(api, "getCategories").mockRejectedValue(
      new Error("private reference database detail"),
    );
    vi.spyOn(api, "getRelatedSystems").mockResolvedValue([]);
    vi.spyOn(api, "getTickets")
      .mockRejectedValueOnce(new Error("private ticket database detail"))
      .mockResolvedValueOnce({
        data: [],
        meta: {
          ...defaultTicketListQuery,
          totalItems: 0,
          totalPages: 0,
          filters: {
            categoryId: null,
            relatedSystemId: null,
            requestedPriority: null,
            status: null,
          },
        },
      });
    const user = userEvent.setup();

    render(
      <MyTicketsPage
        requester={requester}
        onNavigate={vi.fn()}
        onRequesterUnavailable={vi.fn()}
      />,
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Your Tickets are unavailable");
    expect(alert).not.toHaveTextContent("private ticket database detail");
    expect(await screen.findByText(/filters are temporarily unavailable/i)).toBeVisible();
    await user.click(within(alert).getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("heading", { name: "You have no Tickets yet" }))
      .toBeVisible();
  });

  it("retries detail metadata, upload, content, and removal without exposing internals", async () => {
    vi.spyOn(api, "getTicket")
      .mockRejectedValueOnce(new api.ApiError(
        500,
        "TICKET_RETRIEVAL_FAILED",
        "private detail database path",
      ))
      .mockResolvedValueOnce(ticketDetail());
    vi.spyOn(api, "uploadTicketAttachment")
      .mockRejectedValueOnce(new Error("private upload path"))
      .mockResolvedValueOnce({
        ...activeAttachment,
        id: 22,
        originalName: "retry.png",
      });
    vi.spyOn(api, "getAttachmentContent")
      .mockRejectedValueOnce(new api.ApiError(
        500,
        "ATTACHMENT_CONTENT_FAILED",
        "Attachment content could not be loaded. Try again.",
      ))
      .mockResolvedValueOnce({
        blob: new Blob(["image"], { type: "image/png" }),
        filename: activeAttachment.originalName,
        mimeType: "image/png",
      });
    vi.spyOn(api, "removeTicketAttachment")
      .mockRejectedValueOnce(new api.ApiError(
        500,
        "ATTACHMENT_REMOVE_FAILED",
        "The Attachment could not be removed. Try again.",
      ))
      .mockResolvedValueOnce({
        ...activeAttachment,
        removed: true,
        removedAt: "2026-09-01T05:00:00.000Z",
        removalReason: "Release evidence is outdated.",
        removedByRequesterId: requester.id,
      });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:release-evidence"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    const user = userEvent.setup();

    render(
      <TicketDetailPage
        requester={requester}
        ticketId="41"
        onNavigate={vi.fn()}
        onRequesterUnavailable={vi.fn()}
      />,
    );

    const detailAlert = await screen.findByRole("alert");
    expect(detailAlert).toHaveTextContent("The Ticket could not be loaded");
    expect(detailAlert).not.toHaveTextContent("private detail database path");
    await user.click(within(detailAlert).getByRole("button", { name: "Retry" }));
    const attachmentItem = (await screen.findByText(activeAttachment.originalName)).closest("li")!;

    const png = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
    ]);
    await user.upload(
      screen.getByLabelText("Choose file"),
      new File([png], "retry.png", { type: "image/png" }),
    );
    await user.click(screen.getByRole("button", { name: "Upload" }));
    expect(await screen.findByText("The Attachment could not be uploaded. Try again."))
      .toBeVisible();
    await user.click(screen.getByRole("button", { name: "Retry Upload" }));
    expect(await screen.findByText("retry.png uploaded successfully.")).toBeVisible();

    await user.click(within(attachmentItem).getByRole("button", { name: "Preview" }));
    expect(await within(attachmentItem).findByRole("alert"))
      .toHaveTextContent("Attachment content could not be loaded");
    await user.click(within(attachmentItem).getByRole("button", { name: "Preview" }));
    expect(await screen.findByRole("dialog", { name: `Preview ${activeAttachment.originalName}` }))
      .toBeVisible();
    await user.click(screen.getByRole("button", { name: "Close" }));

    await user.click(within(attachmentItem).getByRole("button", { name: "Remove" }));
    await user.type(screen.getByLabelText(/Removal reason/), "Release evidence is outdated.");
    await user.click(screen.getByRole("button", { name: "Confirm Remove" }));
    expect(await screen.findByText("The Attachment could not be removed. Try again."))
      .toBeVisible();
    await user.click(screen.getByRole("button", { name: "Confirm Remove" }));
    await waitFor(() => expect(
      within(attachmentItem).getByText("Removed", { selector: "span" }),
    ).toBeVisible());
  });
});
