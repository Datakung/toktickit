import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import { TicketDetailPage } from "../../src/TicketDetailPage.js";

const requester: api.DevelopmentRequester = {
  id: 1,
  displayName: "Anan Chaiyasit",
  email: "anan.chaiyasit@example.test",
};

const activeAttachment: api.AttachmentMetadata = {
  id: 21,
  ticketId: 41,
  originalName: "evidence.png",
  mimeType: "image/png",
  sizeBytes: 9,
  createdAt: "2026-09-01T03:10:00.000Z",
  removed: false,
  removedAt: null,
  removalReason: null,
  removedByRequesterId: null,
};

const removedAttachment: api.AttachmentMetadata = {
  id: 22,
  ticketId: 41,
  originalName: "old-report.pdf",
  mimeType: "application/pdf",
  sizeBytes: 2048,
  createdAt: "2026-09-01T03:20:00.000Z",
  removed: true,
  removedAt: "2026-09-01T04:00:00.000Z",
  removalReason: "This report is outdated.",
  removedByRequesterId: 1,
};

function detail(attachments: api.AttachmentMetadata[] = [activeAttachment, removedAttachment]): api.TicketDetail {
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
    attachments: attachments.map((item) => ({ ...item })),
  };
}

beforeEach(() => {
  vi.spyOn(api, "getTicket").mockResolvedValue(detail());
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:attachment-preview"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(URL, "createObjectURL");
  Reflect.deleteProperty(URL, "revokeObjectURL");
});

describe("Ticket Detail Attachment section", () => {
  it("distinguishes active and removed metadata and hides removed actions", async () => {
    render(<TicketDetailPage requester={requester} ticketId="41" onNavigate={vi.fn()} />);

    const activeItem = (await screen.findByText("evidence.png")).closest("li")!;
    const removedItem = screen.getByText("old-report.pdf").closest("li")!;
    expect(within(activeItem).getByText("Active")).toBeVisible();
    expect(within(activeItem).getByRole("button", { name: "Preview" })).toBeVisible();
    expect(within(activeItem).getByRole("button", { name: "Download" })).toBeVisible();
    expect(within(activeItem).getByRole("button", { name: "Remove" })).toBeVisible();
    expect(within(removedItem).getByText("Removed", { selector: "span" })).toBeVisible();
    expect(within(removedItem).getByText("This report is outdated.")).toBeVisible();
    expect(within(removedItem).queryByRole("button")).not.toBeInTheDocument();
  });

  it("previews an image and downloads through authenticated Blob requests", async () => {
    vi.spyOn(api, "getAttachmentContent")
      .mockResolvedValueOnce({
        blob: new Blob(["image"], { type: "image/png" }),
        filename: "evidence.png",
        mimeType: "image/png",
      })
      .mockResolvedValueOnce({
        blob: new Blob(["image"], { type: "image/png" }),
        filename: "evidence.png",
        mimeType: "image/png",
      });
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(<TicketDetailPage requester={requester} ticketId="41" onNavigate={vi.fn()} />);
    const item = (await screen.findByText("evidence.png")).closest("li")!;

    await user.click(within(item).getByRole("button", { name: "Preview" }));
    expect(api.getAttachmentContent).toHaveBeenNthCalledWith(1, 1, 41, 21, "inline");
    expect(await screen.findByRole("dialog", { name: "Preview evidence.png" })).toBeVisible();
    expect(screen.getByRole("img", { name: "Preview of evidence.png" })).toHaveAttribute(
      "src", "blob:attachment-preview",
    );
    await user.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:attachment-preview"));

    await user.click(within(item).getByRole("button", { name: "Download" }));
    await waitFor(() => expect(api.getAttachmentContent).toHaveBeenNthCalledWith(
      2, 1, 41, 21, "attachment",
    ));
    expect(anchorClick).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2));
  });

  it("opens a blank PDF tab synchronously and revokes its URL after load", async () => {
    const pdf = { ...activeAttachment, id: 23, originalName: "guide.pdf", mimeType: "application/pdf" };
    vi.mocked(api.getTicket).mockResolvedValue(detail([pdf]));
    vi.spyOn(api, "getAttachmentContent").mockResolvedValue({
      blob: new Blob(["%PDF-"], { type: "application/pdf" }),
      filename: "guide.pdf",
      mimeType: "application/pdf",
    });
    const popup = {
      opener: {} as unknown,
      close: vi.fn(),
      addEventListener: vi.fn(),
      location: { href: "" },
    } as unknown as Window;
    vi.spyOn(window, "open").mockReturnValue(popup);
    const user = userEvent.setup();
    render(<TicketDetailPage requester={requester} ticketId="41" onNavigate={vi.fn()} />);

    await user.click(await screen.findByRole("button", { name: "Preview" }));
    expect(window.open).toHaveBeenCalledWith("", "_blank");
    expect(popup.opener).toBeNull();
    expect(api.getAttachmentContent).toHaveBeenCalledWith(1, 41, 23, "inline");
    expect(popup.location.href).toBe("blob:attachment-preview");
    const onLoad = vi.mocked(popup.addEventListener).mock.calls[0][1] as EventListener;
    onLoad(new Event("load"));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:attachment-preview");
  });

  it("validates and retries an existing-Ticket upload without creating another Ticket", async () => {
    vi.mocked(api.getTicket).mockResolvedValue(detail([]));
    vi.spyOn(api, "uploadTicketAttachment")
      .mockRejectedValueOnce(new api.ApiError(500, "ATTACHMENT_UPLOAD_FAILED", "Upload failed."))
      .mockResolvedValueOnce({ ...activeAttachment, id: 30, originalName: "new.png" });
    const user = userEvent.setup();
    render(<TicketDetailPage requester={requester} ticketId="41" onNavigate={vi.fn()} />);
    await screen.findByRole("heading", { name: "Attachments" });

    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    await user.upload(
      screen.getByLabelText("Choose file"),
      new File([png], "new.png", { type: "image/png" }),
    );
    await user.click(screen.getByRole("button", { name: "Upload" }));
    expect(await screen.findByText("Upload failed.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Retry Upload" }));

    expect(await screen.findByText("new.png uploaded successfully.")).toBeVisible();
    expect(api.uploadTicketAttachment).toHaveBeenCalledTimes(2);
    expect(api.uploadTicketAttachment).toHaveBeenCalledWith(1, 41, expect.any(File));
  });

  it("disables upload at five active Attachments", async () => {
    vi.mocked(api.getTicket).mockResolvedValue(detail(Array.from({ length: 5 }, (_, index) => ({
      ...activeAttachment,
      id: 50 + index,
      originalName: `active-${index}.png`,
    }))));
    render(<TicketDetailPage requester={requester} ticketId="41" onNavigate={vi.fn()} />);

    expect(await screen.findByText("5 of 5 active Attachments")).toBeVisible();
    expect(screen.getByLabelText("Choose file")).toBeDisabled();
    expect(screen.getByText(/Remove an active Attachment/)).toBeVisible();
  });

  it("requires a valid reason and updates a removed item without deleting its metadata", async () => {
    vi.spyOn(api, "removeTicketAttachment").mockResolvedValue({
      ...activeAttachment,
      removed: true,
      removedAt: "2026-09-01T05:00:00.000Z",
      removalReason: "The uploaded evidence is outdated.",
      removedByRequesterId: requester.id,
    });
    const user = userEvent.setup();
    render(<TicketDetailPage requester={requester} ticketId="41" onNavigate={vi.fn()} />);
    const item = (await screen.findByText("evidence.png")).closest("li")!;

    await user.click(within(item).getByRole("button", { name: "Remove" }));
    expect(screen.getByRole("dialog", { name: "Remove evidence.png?" })).toBeVisible();
    await user.type(screen.getByLabelText(/Removal reason/), "no");
    await user.click(screen.getByRole("button", { name: "Confirm Remove" }));
    expect(await screen.findByText("Removal reason must be between 5 and 250 characters.")).toBeVisible();
    expect(api.removeTicketAttachment).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText(/Removal reason/));
    await user.type(screen.getByLabelText(/Removal reason/), "The uploaded evidence is outdated.");
    await user.click(screen.getByRole("button", { name: "Confirm Remove" }));
    await waitFor(() => expect(api.removeTicketAttachment).toHaveBeenCalledWith(
      1, 41, 21, "The uploaded evidence is outdated.",
    ));
    const updatedItem = screen.getByText("evidence.png").closest("li")!;
    expect(within(updatedItem).getByText("Removed", { selector: "span" })).toBeVisible();
    expect(within(updatedItem).getByText("The uploaded evidence is outdated.")).toBeVisible();
    expect(within(updatedItem).queryByRole("button")).not.toBeInTheDocument();
  });
});
