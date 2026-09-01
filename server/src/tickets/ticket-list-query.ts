import { Prisma, RequestedPriority, TicketStatus } from "@prisma/client";

export const TICKET_LIST_QUERY_NAMES = new Set([
  "search",
  "categoryId",
  "relatedSystemId",
  "requestedPriority",
  "status",
  "sort",
  "direction",
  "page",
  "pageSize",
]);

export type TicketListSort = "updatedAt" | "createdAt" | "ticketNumber";
export type SortDirection = "asc" | "desc";

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

export type TicketListQueryResult =
  | { success: true; data: TicketListQuery }
  | { success: false; fields: Record<string, string> };

const POSTGRES_INTEGER_MAX = 2_147_483_647;

function singleValue(
  query: Record<string, unknown>,
  name: string,
  fields: Record<string, string>,
): string | undefined {
  const value = query[name];
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    fields[name] = `${name} must be supplied once as text.`;
    return undefined;
  }
  return value;
}

function positiveInteger(
  value: string | undefined,
  name: string,
  fields: Record<string, string>,
): number | null {
  if (value === undefined) return null;
  if (!/^[1-9]\d*$/.test(value)) {
    fields[name] = `${name} must be a positive integer.`;
    return null;
  }
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number > POSTGRES_INTEGER_MAX) {
    fields[name] = `${name} is outside the supported range.`;
    return null;
  }
  return number;
}

export function parseTicketListQuery(query: Record<string, unknown>): TicketListQueryResult {
  const fields: Record<string, string> = {};

  for (const name of Object.keys(query)) {
    if (!TICKET_LIST_QUERY_NAMES.has(name)) fields[name] = `Unknown query parameter: ${name}.`;
  }

  const rawSearch = singleValue(query, "search", fields);
  const search = rawSearch?.trim() ?? "";
  if (search.length > 100) fields.search = "search must be at most 100 characters.";

  const categoryId = positiveInteger(singleValue(query, "categoryId", fields), "categoryId", fields);
  const relatedSystemId = positiveInteger(
    singleValue(query, "relatedSystemId", fields),
    "relatedSystemId",
    fields,
  );

  const rawPriority = singleValue(query, "requestedPriority", fields);
  const requestedPriority = rawPriority === undefined
    ? null
    : Object.values(RequestedPriority).includes(rawPriority as RequestedPriority)
      ? rawPriority as RequestedPriority
      : null;
  if (rawPriority !== undefined && requestedPriority === null) {
    fields.requestedPriority = "requestedPriority must be LOW, MEDIUM, or HIGH.";
  }

  const rawStatus = singleValue(query, "status", fields);
  const status = rawStatus === undefined
    ? null
    : rawStatus === TicketStatus.NEW
      ? TicketStatus.NEW
      : null;
  if (rawStatus !== undefined && status === null) fields.status = "status must be NEW.";

  const rawSort = singleValue(query, "sort", fields);
  const sort: TicketListSort = rawSort === undefined
    ? "updatedAt"
    : ["updatedAt", "createdAt", "ticketNumber"].includes(rawSort)
      ? rawSort as TicketListSort
      : "updatedAt";
  if (rawSort !== undefined && !["updatedAt", "createdAt", "ticketNumber"].includes(rawSort)) {
    fields.sort = "sort must be updatedAt, createdAt, or ticketNumber.";
  }

  const rawDirection = singleValue(query, "direction", fields);
  const direction: SortDirection = rawDirection === undefined
    ? "desc"
    : rawDirection === "asc" || rawDirection === "desc"
      ? rawDirection
      : "desc";
  if (rawDirection !== undefined && rawDirection !== "asc" && rawDirection !== "desc") {
    fields.direction = "direction must be asc or desc.";
  }

  const page = positiveInteger(singleValue(query, "page", fields), "page", fields) ?? 1;
  const rawPageSize = singleValue(query, "pageSize", fields);
  const parsedPageSize = rawPageSize === undefined ? 10 : Number(rawPageSize);
  const pageSize = ([10, 20, 50] as const).includes(parsedPageSize as 10 | 20 | 50)
    ? parsedPageSize as 10 | 20 | 50
    : 10;
  if (rawPageSize !== undefined && !["10", "20", "50"].includes(rawPageSize)) {
    fields.pageSize = "pageSize must be 10, 20, or 50.";
  }

  if (Object.keys(fields).length > 0) return { success: false, fields };

  return {
    success: true,
    data: {
      search,
      categoryId,
      relatedSystemId,
      requestedPriority,
      status,
      sort,
      direction,
      page,
      pageSize,
    },
  };
}

export function ticketListWhere(requesterId: number, query: TicketListQuery): Prisma.TicketWhereInput {
  return {
    requesterId,
    ...(query.search
      ? {
          OR: [
            { ticketNumber: { contains: query.search, mode: "insensitive" as const } },
            { summary: { contains: query.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(query.categoryId === null ? {} : { categoryId: query.categoryId }),
    ...(query.relatedSystemId === null ? {} : { relatedSystemId: query.relatedSystemId }),
    ...(query.requestedPriority === null ? {} : { requestedPriority: query.requestedPriority }),
    ...(query.status === null ? {} : { status: query.status }),
  };
}

export function ticketListOrderBy(query: TicketListQuery): Prisma.TicketOrderByWithRelationInput[] {
  return [
    { [query.sort]: query.direction },
    { id: query.direction },
  ];
}
