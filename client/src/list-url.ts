import { ticketStatuses } from "./api.js";
export function listSearch(query: object) { const search = new URLSearchParams(Object.entries(query).filter(([, value]) => value !== "" && value != null).map(([key, value]) => [key, String(value)])).toString(); return search ? `?${search}` : ""; }
function validInstant(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) return false;
  const [y, m, d, h, min, sec] = match.slice(1, 7).map(Number);
  return y >= 1 && m >= 1 && m <= 12 && d >= 1 && d <= new Date(Date.UTC(y, m, 0)).getUTCDate() && h <= 23 && min <= 59 && sec <= 59 && Number.isFinite(Date.parse(value));
}
export function readListSearch<T extends object>(search: string | undefined, defaults: T, kind: "requester" | "staff" | "actions") {
  const query = { ...defaults } as Record<string, unknown>, errors: string[] = [], seen = new Set<string>();
  const allowed = new Set([...Object.keys(defaults), ...(kind === "actions" ? [] : ["statusGroup", "updatedSince", "updatedUntil", "resolvedSince", "resolvedUntil"])]);
  for (const [key, value] of new URLSearchParams(search)) {
    if (!allowed.has(key) || seen.has(key) || !value) { errors.push("Use supported filters once, with a value."); continue; }
    seen.add(key);
    if (["page", "pageSize", "categoryId", "relatedSystemId", "ownerId"].includes(key)) {
      if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > 2147483647 || (key === "pageSize" && ![10, 20, 50].includes(Number(value)))) errors.push("Use supported positive filter and page numbers.");
      query[key] = typeof query[key] === "number" || query[key] === null ? Number(value) : value;
    } else query[key] = value;
    if (key === "status" && !ticketStatuses.includes(value as typeof ticketStatuses[number])) errors.push("Choose a valid Ticket status.");
    if (["itPriority", "requestedPriority"].includes(key) && !["LOW", "MEDIUM", "HIGH"].includes(value)) errors.push("Choose a valid priority.");
    if (key === "statusGroup" && value !== "active") errors.push("Choose the active status group.");
    if (key === "unassigned" && !["true", "false"].includes(value)) errors.push("Use true or false for assignment.");
    if (key === "direction" && !["asc", "desc"].includes(value)) errors.push("Choose ascending or descending.");
    if (key === "sort" && !["updatedAt", "createdAt", kind === "staff" ? "itPriority" : "ticketNumber"].includes(value)) errors.push("Choose a supported sort.");
    if (["q", "search"].includes(key) && value.length > (kind === "staff" ? 120 : 100)) errors.push("The search is too long.");
    if (["assignedTo", "performedBy"].includes(key) && value !== "me") errors.push("Work filters must use the signed-in user.");
    if (key === "stateGroup" && value !== "active") errors.push("Choose active work.");
    if (key === "state" && !["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(value)) errors.push("Choose a valid action state.");
  }
  if (query.statusGroup && query.status) errors.push("Use a status or status group, not both.");
  if (query.ownerId && query.unassigned === "true") errors.push("Use an owner or unassigned, not both.");
  if (query.assignedTo && query.performedBy) errors.push("Choose assigned or performed work, not both.");
  if (query.stateGroup && query.state) errors.push("Choose a state or state group, not both.");
  for (const prefix of ["updated", "resolved", "performed"]) {
    const from = query[`${prefix}Since`], until = query[`${prefix}Until`];
    if (!from && !until) continue;
    if (typeof from !== "string" || typeof until !== "string" || !validInstant(from) || !validInstant(until) || Date.parse(from) > Date.parse(until)) errors.push("Date ranges need two valid ISO timestamps in order.");
    if (prefix === "resolved" && query.status !== "RESOLVED") errors.push("Resolved dates require Resolved status.");
    if (prefix === "performed" && query.performedBy !== "me") errors.push("Performed dates require my performed work.");
  }
  if ((Number(query.page) - 1) * Number(query.pageSize) > 2147483647) errors.push("Page is outside the supported range.");
  return { query: query as T, error: errors.length ? [...new Set(errors)].join(" ") : "" };
}
