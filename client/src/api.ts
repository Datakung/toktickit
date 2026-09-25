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

export type UserRole = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
export interface CurrentUser extends DevelopmentRequester {
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
}

export interface AdminUser extends CurrentUser { version: number; createdAt: string; updatedAt: string }
export interface UserInput { displayName: string; email: string; role: UserRole; isActive: boolean }
export async function getAdminUsers(q = "", role = "", isActive = ""): Promise<{ items: AdminUser[] }> {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (role) params.set("role", role);
  if (isActive) params.set("isActive", isActive);
  return getJson(`/api/admin/users?${params}`);
}
async function adminMutation(path: string, method: string, input: unknown): Promise<AdminUser> {
  return parseApiResponse(await fetch(`${API_URL}/api/admin/users${path}`, {
    method, credentials: requestCredentials,
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(input),
  }));
}
export const createAdminUser = (input: UserInput & { initialPassword: string }) => adminMutation("", "POST", input);
export const editAdminUser = (id: number, input: UserInput & { version: number }) => adminMutation(`/${id}`, "PATCH", input);
export const resetAdminPassword = (id: number, input: { initialPassword: string; version: number }) => adminMutation(`/${id}/initial-password`, "POST", input);

let csrfToken = "";
export const AUTHENTICATION_LOST = "toktickit:authentication-lost";
export function clearAuthentication() { csrfToken = ""; }
export function isAuthenticationRequired(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 401 && error.code === "AUTHENTICATION_REQUIRED";
}
const requestCredentials: RequestCredentials = "include";

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

export const ticketStatuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"] as const;
export type TicketStatus = typeof ticketStatuses[number];
export const statusLabel = (value: TicketStatus) => ({ NEW: "New", OPEN: "Open", IN_PROGRESS: "In Progress", WAITING_FOR_REQUESTER: "Waiting for Requester", RESOLVED: "Resolved", CLOSED: "Closed", REOPENED: "Reopened", CANCELLED: "Cancelled" })[value];
export interface QueueQuery { q: string; categoryId: string; relatedSystemId: string; ownerId: string; unassigned: string; status: string; itPriority: string; sort: string; direction: string; page: number; pageSize: number }
export interface QueueItem extends TicketListItem { requester: { id: number; displayName: string }; owner: { id: number; displayName: string } | null; version: number }
export interface QueueResponse { items: QueueItem[]; page: number; pageSize: number; total: number; totalPages: number }
export interface StaffOwner { id: number; displayName: string; role: UserRole }
export function getStaffOwners(): Promise<{ items: StaffOwner[] }> { return getJson("/api/staff/owners"); }
export function getStaffQueue(query: QueueQuery): Promise<QueueResponse> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== "") params.set(key, String(value));
  return getJson(`/api/staff/tickets?${params}`);
}
export type TicketListSort = "updatedAt" | "createdAt" | "ticketNumber";
export type SortDirection = "asc" | "desc";

export interface TicketListItem {
  id: number;
  ticketNumber: string;
  summary: string;
  requestedPriority: RequestedPriority;
  itPriority: RequestedPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  category: Category;
  relatedSystem: RelatedSystem;
}

export interface TicketDetail extends TicketListItem {
  description: string;
  requester: DevelopmentRequester;
  owner: { id: number; displayName: string } | null;
  version: number;
  requesterResolutionIndicatedAt: string | null;
  attachments: AttachmentMetadata[];
}

export interface StaffTicketDetail extends TicketDetail {}
export interface CommunicationEntry { id: number; body: string; author: { id: number; displayName: string }; createdAt: string }
export interface EntryPage { items: CommunicationEntry[]; page: number; pageSize: number; total: number; totalPages: number }

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

export function isRequesterUnavailable(error: unknown): error is ApiError {
  return isAuthenticationRequired(error) || (error instanceof ApiError
    && error.status === 403
    && error.code === "REQUESTER_UNAVAILABLE");
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

  const categoriesResponse = await fetch(`${API_URL}/api/categories`, { credentials: requestCredentials });

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
  const response = await fetch(`${API_URL}${path}`, { credentials: requestCredentials });

  return parseApiResponse<T>(response);
}

export function getCategories(): Promise<Category[]> {
  return getJson<Category[]>("/api/categories");
}

export function getRelatedSystems(): Promise<RelatedSystem[]> {
  return getJson<RelatedSystem[]>("/api/related-systems");
}

export function authenticatedHeaders(_requesterId: number): HeadersInit {
  return csrfToken ? { "X-CSRF-Token": csrfToken } : {};
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && body?.error?.code === "AUTHENTICATION_REQUIRED") {
      clearAuthentication();
      window.dispatchEvent(new Event(AUTHENTICATION_LOST));
    }
    throw new ApiError(
      response.status,
      body?.error?.code ?? "REQUEST_FAILED",
      body?.error?.message ?? "The request failed. Try again.",
      body?.error?.fields ?? {},
    );
  }
  return body as T;
}

export async function bootstrapCsrf(): Promise<string> {
  const response = await fetch(`${API_URL}/api/auth/csrf`, { credentials: requestCredentials });
  const body = await parseApiResponse<{ csrfToken: string }>(response);
  csrfToken = body.csrfToken;
  return csrfToken;
}
export async function login(email: string, password: string) {
  if (!csrfToken) await bootstrapCsrf();
  const response = await fetch(`${API_URL}/api/auth/login`, { method: "POST", credentials: requestCredentials, headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify({ email, password }) });
  const body = await parseApiResponse<{ user: CurrentUser; csrfToken: string }>(response);
  csrfToken = body.csrfToken; return body.user;
}
export async function getCurrentUser() {
  const response = await fetch(`${API_URL}/api/auth/me`, { credentials: requestCredentials });
  const body = await parseApiResponse<{ user: CurrentUser; csrfToken: string }>(response);
  csrfToken = body.csrfToken; return body.user;
}
export async function changePassword(currentPassword: string, newPassword: string, confirmPassword: string) {
  const response = await fetch(`${API_URL}/api/auth/change-password`, { method: "POST", credentials: requestCredentials, headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify({ currentPassword, newPassword, confirmPassword }) });
  const body = await parseApiResponse<{ user: CurrentUser; csrfToken: string }>(response);
  csrfToken = body.csrfToken; return body.user;
}
export async function logout() {
  const response = await fetch(`${API_URL}/api/auth/logout`, { method: "POST", credentials: requestCredentials, headers: { "X-CSRF-Token": csrfToken } });
  if (!response.ok) await parseApiResponse<never>(response);
  csrfToken = "";
}

export async function createTicket(
  requesterId: number,
  input: CreateTicketRequest,
): Promise<CreatedTicket> {
  const response = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    credentials: requestCredentials,
    headers: {
      ...authenticatedHeaders(requesterId),
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
    credentials: requestCredentials,
    headers: authenticatedHeaders(requesterId),
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
    credentials: requestCredentials,
    headers: authenticatedHeaders(requesterId),
  });
  return parseApiResponse<TicketListResponse>(response);
}

export async function getTicket(
  requesterId: number,
  ticketId: string | number,
): Promise<TicketDetail> {
  const response = await fetch(`${API_URL}/api/tickets/${encodeURIComponent(String(ticketId))}`, {
    credentials: requestCredentials,
    headers: authenticatedHeaders(requesterId),
  });
  const body = await parseApiResponse<{ data: TicketDetail }>(response);
  return body.data;
}

export async function getTicketAttachments(
  requesterId: number,
  ticketId: number,
): Promise<AttachmentMetadata[]> {
  const response = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    credentials: requestCredentials,
    headers: authenticatedHeaders(requesterId),
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
    { credentials: requestCredentials, headers: authenticatedHeaders(requesterId) },
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
    credentials: requestCredentials,
    headers: {
      ...authenticatedHeaders(requesterId),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason }),
  });
  const body = await parseApiResponse<{ data: AttachmentMetadata }>(response);
  return body.data;
}

async function jsonMutation<T>(path: string, method: "POST" | "PATCH", body: unknown): Promise<T> {
  return parseApiResponse(await fetch(`${API_URL}${path}`, { method, credentials: requestCredentials, headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(body) }));
}
export const getStaffTicket = (id: number | string) => getJson<StaffTicketDetail>(`/api/staff/tickets/${encodeURIComponent(String(id))}`);
export const claimStaffTicket = (id: number, version: number) => jsonMutation<StaffTicketDetail>(`/api/staff/tickets/${id}/claim`, "POST", { version });
export const setStaffTicketOwner = (id: number, ownerId: number | null, version: number) => jsonMutation<StaffTicketDetail>(`/api/staff/tickets/${id}/owner`, "PATCH", { ownerId, version });
export const setStaffTicketPriority = (id: number, itPriority: RequestedPriority, version: number) => jsonMutation<StaffTicketDetail>(`/api/staff/tickets/${id}/priority`, "PATCH", { itPriority, version });
export const setStaffTicketStatus = (id: number, status: TicketStatus, version: number) => jsonMutation<StaffTicketDetail>(`/api/staff/tickets/${id}/status`, "PATCH", { status, version });
export const getPublicComments = (id: number) => getJson<EntryPage>(`/api/tickets/${id}/comments`);
export const postPublicComment = (id: number, body: string) => jsonMutation<CommunicationEntry>(`/api/tickets/${id}/comments`, "POST", { body });
export const getInternalNotes = (id: number) => getJson<EntryPage>(`/api/staff/tickets/${id}/notes`);
export const postInternalNote = (id: number, body: string) => jsonMutation<CommunicationEntry>(`/api/staff/tickets/${id}/notes`, "POST", { body });
export const indicateTicketResolution = (id: number, version: number) => jsonMutation<{ id:number; status:TicketStatus; version:number; requesterResolutionIndicatedAt:string|null; updatedAt:string }>(`/api/tickets/${id}/resolution-indication`, "POST", { version });
export async function getStaffAttachmentContent(ticketId: number, attachmentId: number): Promise<AttachmentContent> {
  const response = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/attachments/${attachmentId}/download`, { credentials: requestCredentials });
  if (!response.ok) await parseApiResponse<never>(response);
  return { blob: await response.blob(), filename: responseFilename(response), mimeType: response.headers.get("Content-Type")?.split(";")[0] ?? "application/octet-stream" };
}
