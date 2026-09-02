import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
} from "react";
import {
  ApiError,
  getAttachmentContent,
  getTicket,
  isRequesterUnavailable,
  removeTicketAttachment,
  uploadTicketAttachment,
  type AttachmentMetadata,
  type DevelopmentRequester,
  type RequestedPriority,
  type TicketDetail,
} from "./api.js";
import { attachmentSelectionError } from "./CreateTicketPage.js";

type DetailState = "loading" | "ready" | "unavailable" | "error";
type UploadState = "selected" | "uploading" | "failed";

interface SelectedUpload {
  file: File;
  state: UploadState;
  error?: string;
}

interface ContentAction {
  attachmentId: number;
  kind: "preview" | "download";
  state: "busy" | "error";
  message?: string;
}

interface ImagePreview {
  url: string;
  filename: string;
}

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function handleDialogKeyDown(
  event: ReactKeyboardEvent<HTMLDivElement>,
  closeDialog: () => void,
) {
  if (event.key === "Escape") {
    event.preventDefault();
    closeDialog();
    return;
  }
  if (event.key !== "Tab") return;

  const focusable = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  );
  if (focusable.length === 0) {
    event.preventDefault();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !event.currentTarget.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !event.currentTarget.contains(active))) {
    event.preventDefault();
    first.focus();
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    calendar: "gregory",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MiB`;
}

function labelPriority(value: RequestedPriority | null) {
  return value === null ? "Not assigned" : value.charAt(0) + value.slice(1).toLowerCase();
}

function labelMimeType(value: string) {
  const labels: Record<string, string> = {
    "image/jpeg": "JPEG image",
    "image/png": "PNG image",
    "image/webp": "WEBP image",
    "application/pdf": "PDF document",
  };
  return labels[value] ?? value;
}

export function TicketDetailPage({
  requester,
  ticketId,
  onNavigate,
  onRequesterUnavailable,
}: {
  requester: DevelopmentRequester;
  ticketId: string;
  onNavigate: (path: string) => void;
  onRequesterUnavailable: () => void;
}) {
  const [detailState, setDetailState] = useState<DetailState>("loading");
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [selectedUpload, setSelectedUpload] = useState<SelectedUpload | null>(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [contentAction, setContentAction] = useState<ContentAction | null>(null);
  const [imagePreview, setImagePreview] = useState<ImagePreview | null>(null);
  const [removeTarget, setRemoveTarget] = useState<AttachmentMetadata | null>(null);
  const [removeReason, setRemoveReason] = useState("");
  const [removeError, setRemoveError] = useState("");
  const [isRemoving, setIsRemoving] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previewCloseRef = useRef<HTMLButtonElement>(null);
  const removalReasonRef = useRef<HTMLTextAreaElement>(null);
  const previewTriggerRef = useRef<HTMLButtonElement | null>(null);
  const removalTriggerRef = useRef<HTMLButtonElement | null>(null);
  const previewWasOpen = useRef(false);
  const removalWasOpen = useRef(false);

  const handleApiError = useCallback((error: unknown) => {
    if (!isRequesterUnavailable(error)) return false;
    onRequesterUnavailable();
    return true;
  }, [onRequesterUnavailable]);

  const loadTicket = useCallback(async () => {
    setDetailState("loading");
    setTicket(null);
    setSelectedUpload(null);
    setUploadMessage("");
    setContentAction(null);
    try {
      const loaded = await getTicket(requester.id, ticketId);
      setTicket(loaded);
      setDetailState("ready");
    } catch (error) {
      setTicket(null);
      if (handleApiError(error)) return;
      setDetailState(error instanceof ApiError && (error.status === 400 || error.status === 404)
        ? "unavailable"
        : "error");
    }
  }, [handleApiError, requester.id, ticketId]);

  useEffect(() => { void loadTicket(); }, [loadTicket]);

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview.url);
  }, [imagePreview]);

  useEffect(() => {
    if (detailState === "ready" && ticket) headingRef.current?.focus();
  }, [detailState, ticket?.id]);

  useEffect(() => {
    if (imagePreview) {
      previewCloseRef.current?.focus();
    } else if (previewWasOpen.current) {
      previewTriggerRef.current?.focus();
    }
    previewWasOpen.current = Boolean(imagePreview);
  }, [imagePreview]);

  useEffect(() => {
    if (removeTarget) {
      removalReasonRef.current?.focus();
    } else if (removalWasOpen.current) {
      removalTriggerRef.current?.focus();
    }
    removalWasOpen.current = Boolean(removeTarget);
  }, [removeTarget]);

  function followBack(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    onNavigate("/tickets");
  }

  async function selectUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setUploadMessage("");
    if (!file) return;
    const error = await attachmentSelectionError(file);
    if (error) {
      setSelectedUpload(null);
      setUploadMessage(error);
      return;
    }
    setSelectedUpload({ file, state: "selected" });
  }

  async function uploadSelected() {
    if (!ticket || !selectedUpload || selectedUpload.state === "uploading") return;
    const file = selectedUpload.file;
    setSelectedUpload({ file, state: "uploading" });
    setUploadMessage("");
    try {
      const attachment = await uploadTicketAttachment(requester.id, ticket.id, file);
      setTicket((current) => current ? {
        ...current,
        attachments: [...current.attachments, attachment].sort((left, right) =>
          left.createdAt.localeCompare(right.createdAt) || left.id - right.id),
      } : current);
      setSelectedUpload(null);
      setUploadMessage(`${attachment.originalName} uploaded successfully.`);
    } catch (error) {
      if (handleApiError(error)) return;
      const message = error instanceof ApiError
        ? error.message
        : "The Attachment could not be uploaded. Try again.";
      setSelectedUpload({ file, state: "failed", error: message });
    }
  }

  async function previewAttachment(
    attachment: AttachmentMetadata,
    trigger: HTMLButtonElement,
  ) {
    if (!ticket) return;
    previewTriggerRef.current = trigger;
    setContentAction({ attachmentId: attachment.id, kind: "preview", state: "busy" });

    if (attachment.mimeType === "application/pdf") {
      const popup = window.open("", "_blank");
      if (!popup) {
        setContentAction({
          attachmentId: attachment.id,
          kind: "preview",
          state: "error",
          message: "The PDF preview was blocked. Allow pop-ups and try again.",
        });
        return;
      }
      popup.opener = null;
      try {
        const content = await getAttachmentContent(
          requester.id, ticket.id, attachment.id, "inline",
        );
        const url = URL.createObjectURL(content.blob);
        let revoked = false;
        let timer = 0;
        const revoke = () => {
          if (revoked) return;
          revoked = true;
          window.clearTimeout(timer);
          URL.revokeObjectURL(url);
        };
        popup.addEventListener("load", revoke, { once: true });
        timer = window.setTimeout(revoke, 60_000);
        popup.location.href = url;
        setContentAction(null);
      } catch (error) {
        popup.close();
        if (handleApiError(error)) return;
        setContentAction({
          attachmentId: attachment.id,
          kind: "preview",
          state: "error",
          message: error instanceof ApiError
            ? error.message
            : "The PDF could not be previewed. Try again.",
        });
      }
      return;
    }

    try {
      const content = await getAttachmentContent(
        requester.id, ticket.id, attachment.id, "inline",
      );
      const url = URL.createObjectURL(content.blob);
      setImagePreview({ url, filename: content.filename });
      setContentAction(null);
    } catch (error) {
      if (handleApiError(error)) return;
      setContentAction({
        attachmentId: attachment.id,
        kind: "preview",
        state: "error",
        message: error instanceof ApiError
          ? error.message
          : "The image could not be previewed. Try again.",
      });
    }
  }

  async function downloadAttachment(attachment: AttachmentMetadata) {
    if (!ticket) return;
    setContentAction({ attachmentId: attachment.id, kind: "download", state: "busy" });
    try {
      const content = await getAttachmentContent(
        requester.id, ticket.id, attachment.id, "attachment",
      );
      const url = URL.createObjectURL(content.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = content.filename;
      anchor.hidden = true;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setContentAction(null);
    } catch (error) {
      if (handleApiError(error)) return;
      setContentAction({
        attachmentId: attachment.id,
        kind: "download",
        state: "error",
        message: error instanceof ApiError
          ? error.message
          : "The Attachment could not be downloaded. Try again.",
      });
    }
  }

  function openRemoval(attachment: AttachmentMetadata, trigger: HTMLButtonElement) {
    removalTriggerRef.current = trigger;
    setRemoveTarget(attachment);
    setRemoveReason("");
    setRemoveError("");
  }

  function closeRemoval() {
    if (isRemoving) return;
    setRemoveTarget(null);
    setRemoveReason("");
    setRemoveError("");
  }

  function closeImagePreview() {
    setImagePreview(null);
  }

  async function confirmRemoval() {
    if (!ticket || !removeTarget || isRemoving) return;
    const reason = removeReason.trim();
    if (reason.length < 5 || reason.length > 250) {
      setRemoveError("Removal reason must be between 5 and 250 characters.");
      return;
    }
    setIsRemoving(true);
    setRemoveError("");
    try {
      const removed = await removeTicketAttachment(
        requester.id, ticket.id, removeTarget.id, reason,
      );
      setTicket((current) => current ? {
        ...current,
        attachments: current.attachments.map((item) => item.id === removed.id ? removed : item),
      } : current);
      setRemoveTarget(null);
      setRemoveReason("");
    } catch (error) {
      if (handleApiError(error)) return;
      setRemoveError(error instanceof ApiError
        ? error.message
        : "The Attachment could not be removed. Try again.");
    } finally {
      setIsRemoving(false);
    }
  }

  if (detailState === "loading") {
    return (
      <section className="ticket-detail-page" aria-busy="true" aria-live="polite">
        <h1>Ticket Detail</h1><p>Loading Ticket Detail…</p>
      </section>
    );
  }

  if (detailState === "unavailable") {
    return (
      <section className="ticket-detail-page">
        <a href="/tickets" onClick={followBack}>← Back to My Tickets</a>
        <div className="feedback-panel feedback-panel-error" role="alert">
          <h1>Ticket unavailable</h1>
          <p>This Ticket could not be found or is not available to the selected Requester.</p>
        </div>
      </section>
    );
  }

  if (detailState === "error" || !ticket) {
    return (
      <section className="ticket-detail-page">
        <a href="/tickets" onClick={followBack}>← Back to My Tickets</a>
        <div className="feedback-panel feedback-panel-error" role="alert">
          <h1>Ticket Detail is unavailable</h1>
          <p>The Ticket could not be loaded. Try again.</p>
          <button className="secondary-button" type="button" onClick={() => void loadTicket()}>
            Retry
          </button>
        </div>
      </section>
    );
  }

  const activeCount = ticket.attachments.filter((attachment) => !attachment.removed).length;
  const uploadDisabled = activeCount >= 5;

  return (
    <section className="ticket-detail-page" aria-labelledby="ticket-detail-title">
      <a className="back-link" href="/tickets" onClick={followBack}>← Back to My Tickets</a>
      <div className="ticket-detail-heading">
        <div>
          <p className="eyebrow">Requester Ticket Detail</p>
          <h1 id="ticket-detail-title" ref={headingRef} tabIndex={-1}>{ticket.ticketNumber}</h1>
        </div>
        <span className="badge status-new">New</span>
      </div>

      <section className="detail-panel" aria-labelledby="ticket-context-title">
        <h2 id="ticket-context-title">Ticket context</h2>
        <dl className="detail-grid">
          <div><dt>Requester</dt><dd>{ticket.requester.displayName}</dd></div>
          <div><dt>Category</dt><dd>{ticket.category.name}</dd></div>
          <div><dt>Related System</dt><dd>{ticket.relatedSystem.name}</dd></div>
          <div><dt>Requested Priority</dt><dd><span className={`badge priority-${ticket.requestedPriority.toLowerCase()}`}>{labelPriority(ticket.requestedPriority)}</span></dd></div>
          <div><dt>IT Priority</dt><dd>{labelPriority(ticket.itPriority)}</dd></div>
          <div><dt>Current Status</dt><dd>New</dd></div>
          <div><dt>Created</dt><dd>{formatDate(ticket.createdAt)}</dd></div>
          <div><dt>Last Updated</dt><dd>{formatDate(ticket.updatedAt)}</dd></div>
        </dl>
      </section>

      <section className="detail-panel" aria-labelledby="request-details-title">
        <h2 id="request-details-title">Request details</h2>
        <dl className="detail-copy">
          <div><dt>Summary</dt><dd>{ticket.summary}</dd></div>
          <div><dt>Description</dt><dd>{ticket.description}</dd></div>
        </dl>
      </section>

      <section className="detail-panel attachment-section" aria-labelledby="attachments-title">
        <div className="attachment-section-heading">
          <div>
            <h2 id="attachments-title">Attachments</h2>
            <p>{activeCount} of 5 active Attachments</p>
          </div>
          <label className={`file-picker${uploadDisabled ? " file-picker-disabled" : ""}`}>
            Choose file
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              disabled={uploadDisabled}
              onChange={(event) => void selectUpload(event)}
            />
          </label>
        </div>
        <p className="helper-text">
          One JPEG, PNG, WEBP, or PDF at a time; 5 MiB maximum. Up to five active Attachments.
        </p>
        {uploadDisabled && <p className="filter-warning" role="status">Remove an active Attachment before uploading another.</p>}

        {selectedUpload && (
          <div className="selected-upload" aria-live="polite">
            <span className="attachment-name" title={selectedUpload.file.name}>{selectedUpload.file.name}</span>
            <span>{selectedUpload.state === "uploading" ? "Uploading…" : selectedUpload.state}</span>
            <div className="attachment-actions">
              <button
                className="secondary-button"
                type="button"
                disabled={selectedUpload.state === "uploading"}
                onClick={() => void uploadSelected()}
              >
                {selectedUpload.state === "failed" ? "Retry Upload" : "Upload"}
              </button>
              <button
                className="text-button"
                type="button"
                disabled={selectedUpload.state === "uploading"}
                onClick={() => setSelectedUpload(null)}
              >Cancel</button>
            </div>
            {selectedUpload.error && <p className="field-error" role="alert">{selectedUpload.error}</p>}
          </div>
        )}
        {uploadMessage && <p className={selectedUpload ? "field-error" : "success-message"} role="status">{uploadMessage}</p>}

        {ticket.attachments.length === 0 ? (
          <div className="attachment-empty" role="status">
            <h3>No Attachments</h3>
            <p>No files have been attached to this Ticket.</p>
          </div>
        ) : (
          <ul className="detail-attachment-list">
            {ticket.attachments.map((attachment) => {
              const action = contentAction?.attachmentId === attachment.id ? contentAction : null;
              return (
                <li key={attachment.id} className={attachment.removed ? "attachment-removed" : ""}>
                  <div className="attachment-item-heading">
                    <strong className="attachment-name" title={attachment.originalName}>
                      {attachment.originalName}
                    </strong>
                    <span className={`badge ${attachment.removed ? "badge-removed" : "badge-active"}`}>
                      {attachment.removed ? "Removed" : "Active"}
                    </span>
                  </div>
                  <dl className="attachment-metadata">
                    <div><dt>Type</dt><dd>{labelMimeType(attachment.mimeType)}</dd></div>
                    <div><dt>Size</dt><dd>{formatBytes(attachment.sizeBytes)}</dd></div>
                    <div><dt>Added</dt><dd>{formatDate(attachment.createdAt)}</dd></div>
                    {attachment.removedAt && <div><dt>Removed</dt><dd>{formatDate(attachment.removedAt)}</dd></div>}
                    {attachment.removalReason && <div className="full-width"><dt>Removal reason</dt><dd>{attachment.removalReason}</dd></div>}
                  </dl>
                  {!attachment.removed && (
                    <div className="attachment-actions">
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={action?.state === "busy"}
                        onClick={(event) => void previewAttachment(attachment, event.currentTarget)}
                      >{action?.kind === "preview" && action.state === "busy" ? "Previewing…" : "Preview"}</button>
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={action?.state === "busy"}
                        onClick={() => void downloadAttachment(attachment)}
                      >{action?.kind === "download" && action.state === "busy" ? "Downloading…" : "Download"}</button>
                      <button className="danger-button" type="button" onClick={(event) => openRemoval(attachment, event.currentTarget)}>
                        Remove
                      </button>
                    </div>
                  )}
                  {action?.state === "error" && <p className="field-error" role="alert">{action.message}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {imagePreview && (
        <div className="dialog-backdrop" role="presentation">
          <div
            className="preview-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="preview-title"
            onKeyDown={(event) => handleDialogKeyDown(event, closeImagePreview)}
          >
            <div className="dialog-heading">
              <h2 id="preview-title">Preview {imagePreview.filename}</h2>
              <button ref={previewCloseRef} className="secondary-button" type="button" onClick={closeImagePreview}>
                Close
              </button>
            </div>
            <img src={imagePreview.url} alt={`Preview of ${imagePreview.filename}`} />
          </div>
        </div>
      )}

      {removeTarget && (
        <div className="dialog-backdrop" role="presentation">
          <div
            className="removal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-title"
            onKeyDown={(event) => handleDialogKeyDown(event, closeRemoval)}
          >
            <h2 id="remove-title">Remove {removeTarget.originalName}?</h2>
            <p>The file will remain in the audit record but can no longer be previewed or downloaded.</p>
            <label htmlFor="removal-reason">Removal reason <span aria-hidden="true">*</span>
              <textarea
                ref={removalReasonRef}
                id="removal-reason"
                required
                maxLength={250}
                rows={4}
                value={removeReason}
                aria-invalid={Boolean(removeError)}
                aria-describedby={`removal-counter${removeError ? " removal-error" : ""}`}
                onChange={(event) => {
                  setRemoveReason(event.target.value);
                  setRemoveError("");
                }}
              />
              <small id="removal-counter">{removeReason.trim().length}/250 characters</small>
              {removeError && <small className="field-error" id="removal-error" role="alert">{removeError}</small>}
            </label>
            <div className="dialog-actions">
              <button className="secondary-button" type="button" disabled={isRemoving} onClick={closeRemoval}>
                Cancel
              </button>
              <button className="danger-button" type="button" disabled={isRemoving} onClick={() => void confirmRemoval()}>
                {isRemoving ? "Removing…" : "Confirm Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
