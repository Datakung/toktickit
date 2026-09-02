import { RequestedPriority } from "@prisma/client";

const POSTGRES_INTEGER_MAX = 2_147_483_647;

export interface CreateTicketInput {
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  requestedPriority: RequestedPriority;
  description: string;
}

export type TicketField = keyof CreateTicketInput;
export type TicketFieldErrors = Partial<Record<TicketField, string>>;

export type TicketValidationResult =
  | { success: true; data: CreateTicketInput }
  | { success: false; fieldErrors: TicketFieldErrors };

function isPostgresId(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0 &&
    value <= POSTGRES_INTEGER_MAX
  );
}

export function validateCreateTicketInput(body: unknown): TicketValidationResult {
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const summary = typeof input.summary === "string" ? input.summary.trim() : "";
  const description =
    typeof input.description === "string" ? input.description.trim() : "";
  const fieldErrors: TicketFieldErrors = {};

  if (!isPostgresId(input.categoryId)) {
    fieldErrors.categoryId = "Select a valid Category.";
  }
  if (!isPostgresId(input.relatedSystemId)) {
    fieldErrors.relatedSystemId = "Select a valid Related System.";
  }
  if (summary.length < 5 || summary.length > 120) {
    fieldErrors.summary = "Summary must be between 5 and 120 characters.";
  }
  if (description.length < 10 || description.length > 4_000) {
    fieldErrors.description = "Description must be between 10 and 4000 characters.";
  }
  if (
    typeof input.requestedPriority !== "string" ||
    !Object.values(RequestedPriority).includes(input.requestedPriority as RequestedPriority)
  ) {
    fieldErrors.requestedPriority = "Select a valid Requested Priority.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, fieldErrors };
  }

  return {
    success: true,
    data: {
      categoryId: input.categoryId as number,
      relatedSystemId: input.relatedSystemId as number,
      summary,
      requestedPriority: input.requestedPriority as RequestedPriority,
      description,
    },
  };
}
