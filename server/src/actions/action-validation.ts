import type { ActionState } from "@prisma/client";
import { OperationError } from "../staff/ticket-operations.js";

export type WriteKind = "create" | "edit" | "assign" | "state";
export interface ActionFields {
  actionAt: Date; description: string; result: string; followUpRequired: boolean;
  followUpNote: string; attachmentNotes: string;
}
interface Base { ticketVersion: number; requestId: string }
export type ActionWrite =
  | (Base & ActionFields & { kind: "create"; assigneeId: number | null })
  | (Base & ActionFields & { kind: "edit"; version: number; changeReason: string })
  | (Base & { kind: "assign"; version: number; assigneeId: number | null })
  | (Base & { kind: "state"; version: number; state: ActionState; result: string; cancellationReason: string });
function invalid(field?: string, message = "Correct the highlighted fields and try again."): never {
  throw new OperationError(400, "VALIDATION_ERROR", message, field ? { [field]: message } : {});
}
export function positiveInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 || value > 2147483647) invalid(field, "Use a positive PostgreSQL integer.");
  return value;
}
function text(value: unknown, field: string, max: number, required = false): string {
  if (typeof value !== "string") invalid(field, "Use plain text.");
  const result = value.trim();
  if (result.length > max || (required && !result)) invalid(field, `Use ${required ? 1 : 0}-${max} characters.`);
  return result;
}
export function instant(value: unknown, field: string): Date {
  if (typeof value !== "string") invalid(field, "Use an ISO timestamp including Z or offset.");
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) invalid(field, "Use an ISO timestamp including Z or offset.");
  const [, y, m, d, h, min, sec] = match;
  const days = new Date(Date.UTC(Number(y), Number(m), 0)).getUTCDate();
  const date = new Date(value);
  if (Number(y) < 1 || Number(m) < 1 || Number(m) > 12 || Number(d) < 1 || Number(d) > days || Number(h) > 23 || Number(min) > 59 || Number(sec) > 59 || !Number.isFinite(date.getTime())) invalid(field, "Use a valid date/time.");
  return date;
}
export function parseActionWrite(kind: WriteKind, input: unknown): ActionWrite {
  const fields = ["actionAt", "description", "result", "followUpRequired", "followUpNote", "attachmentNotes"];
  const keys = ["ticketVersion", "requestId", ...(kind === "create" ? [...fields, "assigneeId"] : kind === "edit" ? [...fields, "version", "changeReason"] : kind === "assign" ? ["assigneeId", "version"] : ["state", "result", "cancellationReason", "version"])];
  if (!input || typeof input !== "object" || Array.isArray(input)) invalid();
  const body = input as Record<string, unknown>;
  if (Object.keys(body).length !== keys.length || keys.some(key => !Object.hasOwn(body, key))) invalid(undefined, "Send exactly the fields for this operation.");
  const ticketVersion = positiveInteger(body.ticketVersion, "ticketVersion");
  if (typeof body.requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId)) invalid("requestId", "Use a valid UUID retry key.");
  const base = { ticketVersion, requestId: body.requestId.toLowerCase() };
  const version = kind === "create" ? undefined : positiveInteger(body.version, "version");
  if (kind === "state") {
    if (!["IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(body.state as string)) invalid("state", "Choose Start, Complete or Cancel.");
    const state = body.state as ActionState;
    const result = text(body.result, "result", 4000, state === "COMPLETED");
    const cancellationReason = text(body.cancellationReason, "cancellationReason", 500, state === "CANCELLED");
    if (state !== "CANCELLED" && cancellationReason) invalid("cancellationReason", "Only cancellation accepts a cancellation reason.");
    return { ...base, kind, version: version!, state, result, cancellationReason };
  }
  const assigneeId = kind === "edit" ? undefined : body.assigneeId === null ? null : positiveInteger(body.assigneeId, "assigneeId");
  if (kind === "assign") return { ...base, kind, version: version!, assigneeId: assigneeId! };
  if (typeof body.followUpRequired !== "boolean") invalid("followUpRequired", "Choose true or false.");
  const data: ActionFields = {
    actionAt: instant(body.actionAt, "actionAt"), description: text(body.description, "description", 4000, true),
    result: text(body.result, "result", 4000), followUpRequired: body.followUpRequired,
    followUpNote: text(body.followUpNote, "followUpNote", 2000, body.followUpRequired),
    attachmentNotes: text(body.attachmentNotes, "attachmentNotes", 2000),
  };
  return kind === "create" ? { ...base, ...data, kind, assigneeId: assigneeId! }
    : { ...base, ...data, kind, version: version!, changeReason: text(body.changeReason, "changeReason", 500) };
}

function queryKeys(query: Record<string, unknown>, keys: string[]) {
  if (Object.keys(query).some(key => !keys.includes(key)) || Object.values(query).some(value => typeof value !== "string")) throw new OperationError(400, "INVALID_QUERY", "Use supported scalar query parameters.");
}
function pagination(query: Record<string, unknown>) {
  const parse = (key: string, fallback: number) => {
    if (query[key] === undefined) return fallback;
    if (typeof query[key] !== "string" || !/^[1-9]\d*$/.test(query[key] as string)) throw new OperationError(400, "INVALID_QUERY", "Use a positive page number.");
    const n = Number(query[key]);
    if (!Number.isSafeInteger(n) || n > 2147483647) throw new OperationError(400, "INVALID_QUERY", "Page is out of range.");
    return n;
  };
  const page = parse("page", 1), pageSize = parse("pageSize", 20);
  if (![10, 20, 50].includes(pageSize)) throw new OperationError(400, "INVALID_QUERY", "Use pageSize 10, 20 or 50.");
  return { page, pageSize };
}
export function parseActionPage(query: Record<string, unknown>) {
  queryKeys(query, ["page", "pageSize"]);
  return pagination(query);
}
export function parseWorkQuery(query: Record<string, unknown>) {
  queryKeys(query, ["assignedTo", "performedBy", "stateGroup", "state", "performedSince", "performedUntil", "page", "pageSize"]);
  const bad = () => { throw new OperationError(400, "INVALID_QUERY", "Check the action work-list filters."); };
  if ((query.assignedTo !== undefined && query.assignedTo !== "me") || (query.performedBy !== undefined && query.performedBy !== "me") || (query.assignedTo && query.performedBy)) bad();
  if ((query.stateGroup !== undefined && query.stateGroup !== "active") || (query.stateGroup && query.state)) bad();
  if (query.state !== undefined && !["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(query.state as string)) bad();
  if ((query.performedSince !== undefined || query.performedUntil !== undefined) && (!query.performedBy || !query.performedSince || !query.performedUntil)) bad();
  let since: Date | undefined, until: Date | undefined;
  try {
    if (query.performedSince) { since = instant(query.performedSince, "performedSince"); until = instant(query.performedUntil, "performedUntil"); if (since > until) bad(); }
  } catch { bad(); }
  return { ...pagination(query), assigned: query.assignedTo === "me", performed: query.performedBy === "me", active: query.stateGroup === "active", state: query.state as ActionState | undefined, since, until };
}
