import { Prisma, RequestedPriority, TicketStatus } from "@prisma/client";
export function parseQueueQuery(raw: Record<string, unknown>) {
  const fields: Record<string, string> = {};
  const names = ["q", "categoryId", "relatedSystemId", "ownerId", "unassigned", "status", "itPriority", "sort", "direction", "page", "pageSize"];
  for (const key of Object.keys(raw)) if (!names.includes(key) || typeof raw[key] !== "string") fields[key] = "Supply a supported parameter once as text.";
  const text = (key: string) => typeof raw[key] === "string" ? raw[key] as string : undefined;
  const integer = (key: string) => {
    const value = text(key);
    if (value === undefined) return undefined;
    if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > 2147483647) { fields[key] = "Use a positive supported integer."; return undefined; }
    return Number(value);
  };
  const q = text("q")?.trim() ?? "";
  if (q.length > 120) fields.q = "Search must be at most 120 characters.";
  const categoryId = integer("categoryId"), relatedSystemId = integer("relatedSystemId"), ownerId = integer("ownerId");
  const page = integer("page") ?? 1;
  const pageSize = Number(text("pageSize") ?? "10");
  if (!["10", "20", "50"].includes(text("pageSize") ?? "10")) fields.pageSize = "Choose 10, 20 or 50.";
  const unassigned = text("unassigned");
  if (unassigned !== undefined && !["true", "false"].includes(unassigned)) fields.unassigned = "Use true or false.";
  if (ownerId !== undefined && unassigned === "true") fields.ownerId = "An owner cannot be combined with unassigned.";
  const status = text("status") as TicketStatus | undefined, itPriority = text("itPriority") as RequestedPriority | undefined;
  if (status !== undefined && !Object.values(TicketStatus).includes(status)) fields.status = "Choose a permitted status.";
  if (itPriority !== undefined && !Object.values(RequestedPriority).includes(itPriority)) fields.itPriority = "Choose LOW, MEDIUM or HIGH.";
  const sort = text("sort") ?? "updatedAt", direction = text("direction") ?? "desc";
  if (!["updatedAt", "createdAt", "itPriority"].includes(sort)) fields.sort = "Choose updatedAt, createdAt or itPriority.";
  if (!["asc", "desc"].includes(direction)) fields.direction = "Choose asc or desc.";
  const skip = (page - 1) * pageSize;
  if (!Number.isSafeInteger(skip) || skip > 2147483647) fields.page = "Page is outside the supported range.";
  if (Object.keys(fields).length) return { success: false as const, fields };
  const literal = q.replace(/[\\%_]/g, "\\$&");
  const where: Prisma.TicketWhereInput = {
    categoryId, relatedSystemId, status, itPriority,
    ...(ownerId !== undefined ? { ownerId } : unassigned === "true" ? { ownerId: null } : unassigned === "false" ? { ownerId: { not: null } } : {}),
    ...(q ? { OR: [{ ticketNumber: { contains: literal, mode: "insensitive" } }, { summary: { contains: literal, mode: "insensitive" } }] } : {}),
  };
  // PostgreSQL enum order LOW, MEDIUM, HIGH is the agreed semantic priority order.
  const order = direction as Prisma.SortOrder;
  const orderBy: Prisma.TicketOrderByWithRelationInput[] = [{ [sort]: order }, { id: order }];
  return { success: true as const, where, orderBy, page, pageSize, skip };
}
