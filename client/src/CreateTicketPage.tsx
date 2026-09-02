import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import {
  ApiError,
  createTicket,
  getCategories,
  getRelatedSystems,
  isRequesterUnavailable,
  uploadTicketAttachment,
  type Category,
  type CreatedTicket,
  type DevelopmentRequester,
  type RelatedSystem,
  type RequestedPriority,
} from "./api.js";

type ReferenceState = "loading" | "ready" | "error";
type UploadState = "pending" | "uploading" | "succeeded" | "failed";

interface SelectedAttachment {
  file: File;
  state: UploadState;
  error?: string;
}

interface FormFields {
  categoryId: string;
  relatedSystemId: string;
  summary: string;
  requestedPriority: "" | RequestedPriority;
  description: string;
}

const emptyForm: FormFields = {
  categoryId: "",
  relatedSystemId: "",
  summary: "",
  requestedPriority: "",
  description: "",
};

function formatTicketDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    calendar: "gregory",
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(isoDate));
}

const signatures = {
  jpg: (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  jpeg: (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  png: (bytes: Uint8Array) => [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    .every((byte, index) => bytes[index] === byte),
  webp: (bytes: Uint8Array) =>
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP",
  pdf: (bytes: Uint8Array) => new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-",
};

const mimeTypes: Record<keyof typeof signatures, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

export async function attachmentSelectionError(file: File): Promise<string | null> {
  if (file.size > 5 * 1024 * 1024) return `${file.name} is larger than 5 MiB.`;
  const extension = file.name.split(".").pop()?.toLowerCase() as keyof typeof signatures;
  if (!extension || !signatures[extension] || mimeTypes[extension] !== file.type) {
    return `${file.name} is not an allowed JPEG, PNG, WEBP, or PDF.`;
  }
  const blob = file.slice(0, 12);
  const buffer = typeof blob.arrayBuffer === "function"
    ? await blob.arrayBuffer()
    : await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(blob);
      });
  const bytes = new Uint8Array(buffer);
  if (!signatures[extension](bytes)) return `${file.name} does not match its declared file type.`;
  return null;
}

function validateForm(fields: FormFields) {
  const errors: Record<string, string> = {};
  const summary = fields.summary.trim();
  const description = fields.description.trim();
  if (!fields.categoryId) errors.categoryId = "Select a Category.";
  if (!fields.relatedSystemId) errors.relatedSystemId = "Select a Related System.";
  if (summary.length < 5 || summary.length > 120) {
    errors.summary = "Summary must be between 5 and 120 characters.";
  }
  if (description.length < 10 || description.length > 4_000) {
    errors.description = "Description must be between 10 and 4000 characters.";
  }
  if (!fields.requestedPriority) errors.requestedPriority = "Select a Requested Priority.";
  return errors;
}

export function CreateTicketPage({
  requester,
  onRequesterUnavailable,
}: {
  requester: DevelopmentRequester;
  onRequesterUnavailable: () => void;
}) {
  const [referenceState, setReferenceState] = useState<ReferenceState>("loading");
  const [categories, setCategories] = useState<Category[]>([]);
  const [systems, setSystems] = useState<RelatedSystem[]>([]);
  const [fields, setFields] = useState<FormFields>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<SelectedAttachment[]>([]);
  const [selectionError, setSelectionError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<CreatedTicket | null>(null);

  async function loadReferences() {
    setReferenceState("loading");
    try {
      const [loadedCategories, loadedSystems] = await Promise.all([
        getCategories(), getRelatedSystems(),
      ]);
      setCategories(loadedCategories);
      setSystems(loadedSystems);
      setReferenceState("ready");
    } catch {
      setReferenceState("error");
    }
  }

  useEffect(() => { void loadReferences(); }, []);

  function setField(name: keyof FormFields, value: string) {
    setFields((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: "" }));
  }

  async function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    const remaining = 5 - attachments.length;
    const accepted: SelectedAttachment[] = [];
    const errors: string[] = [];
    if (selected.length > remaining) errors.push("A Ticket can have at most five Attachments.");
    for (const file of selected.slice(0, remaining)) {
      const error = await attachmentSelectionError(file);
      if (error) errors.push(error);
      else accepted.push({ file, state: "pending" });
    }
    setAttachments((current) => [...current, ...accepted]);
    setSelectionError(errors.join(" "));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (isSubmitting || createdTicket) return;
    const errors = validateForm(fields);
    setFieldErrors(errors);
    setSubmitError("");
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const ticket = await createTicket(requester.id, {
        categoryId: Number(fields.categoryId),
        relatedSystemId: Number(fields.relatedSystemId),
        summary: fields.summary.trim(),
        requestedPriority: fields.requestedPriority as RequestedPriority,
        description: fields.description.trim(),
      });
      setCreatedTicket(ticket);

      for (let index = 0; index < attachments.length; index += 1) {
        setAttachments((current) => current.map((item, itemIndex) =>
          itemIndex === index ? { ...item, state: "uploading", error: undefined } : item));
        try {
          await uploadTicketAttachment(requester.id, ticket.id, attachments[index].file);
          setAttachments((current) => current.map((item, itemIndex) =>
            itemIndex === index ? { ...item, state: "succeeded" } : item));
        } catch (error) {
          if (isRequesterUnavailable(error)) {
            onRequesterUnavailable();
            return;
          }
          const message = error instanceof ApiError ? error.message : "Upload failed. Retry from Ticket Detail.";
          setAttachments((current) => current.map((item, itemIndex) =>
            itemIndex === index ? { ...item, state: "failed", error: message } : item));
        }
      }
    } catch (error) {
      if (isRequesterUnavailable(error)) {
        onRequesterUnavailable();
        return;
      }
      if (error instanceof ApiError) {
        setFieldErrors(error.fields);
        setSubmitError(error.message);
      } else {
        setSubmitError("The Ticket could not be created. Try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (referenceState === "loading") {
    return <section className="ticket-page" aria-busy="true"><h1>Create Ticket</h1><p>Loading ticket form…</p></section>;
  }
  if (referenceState === "error") {
    return (
      <section className="ticket-page"><h1>Create Ticket</h1><div className="feedback-panel feedback-panel-error" role="alert">
        <h2>Ticket form is unavailable</h2><p>Categories or Related Systems could not be loaded.</p>
        <button type="button" className="secondary-button" onClick={() => void loadReferences()}>Retry</button>
      </div></section>
    );
  }

  return (
    <section className="ticket-page" aria-labelledby="create-ticket-title">
      <p className="eyebrow">Requester Ticketing</p>
      <h1 id="create-ticket-title">Create Ticket</h1>
      <p className="page-intro">Describe the request clearly. The service desk will assign IT priority after submission.</p>

      {createdTicket && (
        <div className="success-panel" role="status">
          <p className="eyebrow">Ticket created</p>
          <h2>{createdTicket.ticketNumber}</h2>
          <p>Your Ticket is saved. Successful files are attached; failed files can be retried later without creating another Ticket.</p>
        </div>
      )}

      <form className="ticket-form" onSubmit={(event) => void submit(event)} noValidate>
        <fieldset disabled={isSubmitting || Boolean(createdTicket)}>
          <legend>Ticket context</legend>
          <div className="context-grid">
            <div><span>Requester</span><strong>{requester.displayName}</strong></div>
            <div><span>Ticket Number</span><strong>{createdTicket?.ticketNumber ?? "Generated after submission"}</strong></div>
            <div><span>Ticket Date</span><strong>{createdTicket ? formatTicketDate(createdTicket.createdAt) : "Generated after submission"}</strong></div>
            <div><span>Current Status</span><strong>New</strong></div>
            <div><span>IT Priority</span><strong>Not assigned</strong></div>
          </div>
        </fieldset>

        <fieldset disabled={isSubmitting || Boolean(createdTicket)}>
          <legend>Request details</legend>
          <div className="form-grid">
            <label htmlFor="ticket-category">Category <span aria-hidden="true">*</span>
              <select id="ticket-category" required value={fields.categoryId} onChange={(event) => setField("categoryId", event.target.value)} aria-invalid={Boolean(fieldErrors.categoryId)} aria-describedby={fieldErrors.categoryId ? "ticket-category-error" : undefined}>
                <option value="">Select a Category</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>{fieldErrors.categoryId && <small className="field-error" id="ticket-category-error">{fieldErrors.categoryId}</small>}
            </label>
            <label htmlFor="ticket-system">Related System <span aria-hidden="true">*</span>
              <select id="ticket-system" required value={fields.relatedSystemId} onChange={(event) => setField("relatedSystemId", event.target.value)} aria-invalid={Boolean(fieldErrors.relatedSystemId)} aria-describedby={fieldErrors.relatedSystemId ? "ticket-system-error" : undefined}>
                <option value="">Select a Related System</option>{systems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>{fieldErrors.relatedSystemId && <small className="field-error" id="ticket-system-error">{fieldErrors.relatedSystemId}</small>}
            </label>
            <label htmlFor="ticket-priority">Requested Priority <span aria-hidden="true">*</span>
              <select id="ticket-priority" required value={fields.requestedPriority} onChange={(event) => setField("requestedPriority", event.target.value)} aria-invalid={Boolean(fieldErrors.requestedPriority)} aria-describedby={fieldErrors.requestedPriority ? "ticket-priority-error" : undefined}>
                <option value="">Select a Priority</option><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option>
              </select>{fieldErrors.requestedPriority && <small className="field-error" id="ticket-priority-error">{fieldErrors.requestedPriority}</small>}
            </label>
            <label className="full-width" htmlFor="ticket-summary">Summary <span aria-hidden="true">*</span>
              <input id="ticket-summary" required value={fields.summary} maxLength={120} onChange={(event) => setField("summary", event.target.value)} aria-invalid={Boolean(fieldErrors.summary)} aria-describedby={`ticket-summary-count${fieldErrors.summary ? " ticket-summary-error" : ""}`} />
              <small id="ticket-summary-count">{fields.summary.trim().length}/120 characters</small>{fieldErrors.summary && <small className="field-error" id="ticket-summary-error">{fieldErrors.summary}</small>}
            </label>
            <label className="full-width" htmlFor="ticket-description">Description <span aria-hidden="true">*</span>
              <textarea id="ticket-description" required value={fields.description} maxLength={4000} rows={8} onChange={(event) => setField("description", event.target.value)} aria-invalid={Boolean(fieldErrors.description)} aria-describedby={`ticket-description-count${fieldErrors.description ? " ticket-description-error" : ""}`} />
              <small id="ticket-description-count">{fields.description.trim().length}/4000 characters</small>{fieldErrors.description && <small className="field-error" id="ticket-description-error">{fieldErrors.description}</small>}
            </label>
          </div>
        </fieldset>

        <fieldset disabled={isSubmitting || Boolean(createdTicket)}>
          <legend>Initial Attachments <span className="optional-label">Optional</span></legend>
          <p className="helper-text">Up to five JPEG, PNG, WEBP, or PDF files; 5 MiB each.</p>
          <label className="file-picker">Choose files<input type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(event) => void selectFiles(event)} /></label>
          {selectionError && <p className="field-error" role="alert">{selectionError}</p>}
          {attachments.length > 0 && <ul className="attachment-list">{attachments.map((item, index) => <li key={`${item.file.name}-${index}`}>
            <span className="attachment-name" title={item.file.name}>{item.file.name}</span><span>{item.state}</span>
            {item.error && <small className="field-error">{item.error}</small>}
            {item.state === "pending" && <button type="button" className="text-button" onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>}
          </li>)}</ul>}
        </fieldset>

        {submitError && <div className="feedback-panel feedback-panel-error" role="alert">{submitError}</div>}
        <button className="primary-button submit-ticket" type="submit" disabled={isSubmitting || Boolean(createdTicket)}>
          {isSubmitting ? (createdTicket ? "Uploading Attachments…" : "Creating Ticket…") : createdTicket ? "Ticket created" : "Create Ticket"}
        </button>
      </form>
    </section>
  );
}
