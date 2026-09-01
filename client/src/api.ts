const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface RelatedSystem {
  id: number;
  name: string;
}

export interface DevelopmentRequester {
  id: number;
  displayName: string;
  email: string;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

export type RequestedPriority = "LOW" | "MEDIUM" | "HIGH";

export interface CreateTicketRequest {
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  requestedPriority: RequestedPriority;
  description: string;
}

export interface CreatedTicket {
  id: number;
  ticketNumber: string;
  requesterId: number;
  status: "NEW";
  createdAt: string;
}

export interface AttachmentMetadata {
  id: number;
  ticketId: number;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  removed: boolean;
  removedAt: string | null;
  removalReason: string | null;
  removedByRequesterId: number | null;
}

export type TicketStatus = "NEW";
export type TicketListSort = "updatedAt" | "createdAt" | "ticketNumber";
export type SortDirection = "asc" | "desc";

export interface TicketListItem {
  id: number;
  ticketNumber: string;
  summary: string;
  requestedPriority: RequestedPriority;
  itPriority: RequestedPriority | null;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  category: Category;
  relatedSystem: RelatedSystem;
}

export interface TicketDetail extends TicketListItem {
  description: string;
  requester: DevelopmentRequester;
  attachments: AttachmentMetadata[];
}

export interface AttachmentContent {
  blob: Blob;
  filename: string;
  mimeType: string;
}

export interface TicketListQuery {
  search: string;
  categoryId: number | null;
  relatedSystemId: number | null;
  requestedPriority: RequestedPriority | null;
  status: TicketStatus | null;
  sort: TicketListSort;
  direction: SortDirection;
  page: number;
  pageSize: 10 | 20 | 50;
}

export interface TicketListResponse {
  data: TicketListItem[];
  meta: {
    page: number;
    pageSize: 10 | 20 | 50;
    totalItems: number;
    totalPages: number;
    search: string;
    filters: {
      categoryId: number | null;
      relatedSystemId: number | null;
      requestedPriority: RequestedPriority | null;
      status: TicketStatus | null;
    };
    sort: TicketListSort;
    direction: SortDirection;
  };
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

// Check both backend dependencies. Throwing on either failure lets the UI show
// one useful Offline/error state.
export async function checkSystem(): Promise<SystemStatus> {
  const response = await fetch(`${API_URL}/api/health`);

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }

  const health = await response.json();

  if (health.status !== "ok") {
    throw new Error("The backend returned an unhealthy status");
  }

  const categoriesResponse = await fetch(`${API_URL}/api/categories`);

  if (!categoriesResponse.ok) {
    throw new Error(
      `Category request failed with status ${categoriesResponse.status}`,
    );
  }

  const categories = (await categoriesResponse.json()) as Category[];

  return {
    online: true,
    categories,
  };
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export function getCategories(): Promise<Category[]> {
  return getJson<Category[]>("/api/categories");
}

export function getRelatedSystems(): Promise<RelatedSystem[]> {
  return getJson<RelatedSystem[]>("/api/related-systems");
}

export function getDevelopmentRequesters(): Promise<DevelopmentRequester[]> {
  return getJson<DevelopmentRequester[]>("/api/development-requesters");
}

export function developmentRequesterHeaders(requesterId: number): HeadersInit {
  return {
    "X-Development-Requester-Id": String(requesterId),
  };
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.error?.code ?? "REQUEST_FAILED",
      body?.error?.message ?? "The request failed. Try again.",
      body?.error?.fields ?? {},
    );
  }
  return body as T;
}

export async function createTicket(
  requesterId: number,
  input: CreateTicketRequest,
): Promise<CreatedTicket> {
  const response = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers: {
      ...developmentRequesterHeaders(requesterId),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const body = await parseApiResponse<{ data: CreatedTicket }>(response);
  return body.data;
}

export async function uploadTicketAttachment(
  requesterId: number,
  ticketId: number,
  file: File,
): Promise<AttachmentMetadata> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    method: "POST",
    headers: developmentRequesterHeaders(requesterId),
    body: form,
  });
  const body = await parseApiResponse<{ data: AttachmentMetadata }>(response);
  return body.data;
}

export async function getTickets(
  requesterId: number,
  query: TicketListQuery,
): Promise<TicketListResponse> {
  const parameters = new URLSearchParams({
    sort: query.sort,
    direction: query.direction,
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.search) parameters.set("search", query.search);
  if (query.categoryId !== null) parameters.set("categoryId", String(query.categoryId));
  if (query.relatedSystemId !== null) {
    parameters.set("relatedSystemId", String(query.relatedSystemId));
  }
  if (query.requestedPriority !== null) {
    parameters.set("requestedPriority", query.requestedPriority);
  }
  if (query.status !== null) parameters.set("status", query.status);

  const response = await fetch(`${API_URL}/api/tickets?${parameters.toString()}`, {
    headers: developmentRequesterHeaders(requesterId),
  });
  return parseApiResponse<TicketListResponse>(response);
}

export async function getTicket(
  requesterId: number,
  ticketId: string | number,
): Promise<TicketDetail> {
  const response = await fetch(`${API_URL}/api/tickets/${encodeURIComponent(String(ticketId))}`, {
    headers: developmentRequesterHeaders(requesterId),
  });
  const body = await parseApiResponse<{ data: TicketDetail }>(response);
  return body.data;
}

export async function getTicketAttachments(
  requesterId: number,
  ticketId: number,
): Promise<AttachmentMetadata[]> {
  const response = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    headers: developmentRequesterHeaders(requesterId),
  });
  const body = await parseApiResponse<{ data: AttachmentMetadata[] }>(response);
  return body.data;
}

function responseFilename(response: Response): string {
  const header = response.headers.get("Content-Disposition") ?? "";
  const encoded = header.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded);
    } catch {
      // Continue to the safe ASCII fallback supplied by the server.
    }
  }
  return header.match(/filename="([^"]+)"/i)?.[1] ?? "attachment";
}

export async function getAttachmentContent(
  requesterId: number,
  ticketId: number,
  attachmentId: number,
  disposition: "inline" | "attachment",
): Promise<AttachmentContent> {
  const response = await fetch(
    `${API_URL}/api/tickets/${ticketId}/attachments/${attachmentId}/download?disposition=${disposition}`,
    { headers: developmentRequesterHeaders(requesterId) },
  );
  if (!response.ok) await parseApiResponse<never>(response);
  return {
    blob: await response.blob(),
    filename: responseFilename(response),
    mimeType: response.headers.get("Content-Type")?.split(";")[0] ?? "application/octet-stream",
  };
}

export async function removeTicketAttachment(
  requesterId: number,
  ticketId: number,
  attachmentId: number,
  reason: string,
): Promise<AttachmentMetadata> {
  const response = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments/${attachmentId}`, {
    method: "DELETE",
    headers: {
      ...developmentRequesterHeaders(requesterId),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason }),
  });
  const body = await parseApiResponse<{ data: AttachmentMetadata }>(response);
  return body.data;
}
