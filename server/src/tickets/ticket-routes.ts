import { Router, type Response } from "express";
import { getPrisma } from "../prisma.js";
import {
  developmentRequesterContext,
  type DevelopmentRequesterLocals,
} from "../middleware/development-requester-context.js";
import { retryTicketNumberCollision } from "./ticket-number.js";
import { validateCreateTicketInput, type TicketFieldErrors } from "./ticket-validation.js";
import {
  parseTicketListQuery,
  ticketListOrderBy,
  ticketListWhere,
} from "./ticket-list-query.js";

export const ticketRouter = Router();

function validationError(response: Response, fields: TicketFieldErrors) {
  response.status(400).json({
    error: {
      code: "VALIDATION_ERROR",
      message: "Correct the highlighted fields and try again.",
      fields,
    },
  });
}

ticketRouter.get(
  "/",
  developmentRequesterContext,
  async (request, response: Response<unknown, DevelopmentRequesterLocals>) => {
    const validation = parseTicketListQuery(request.query as Record<string, unknown>);
    if (!validation.success) {
      response.status(400).json({
        error: {
          code: "INVALID_QUERY",
          message: "Correct the ticket-list query and try again.",
          fields: validation.fields,
        },
      });
      return;
    }

    const query = validation.data;
    const where = ticketListWhere(response.locals.developmentRequester.id, query);
    const prisma = getPrisma();

    try {
      const [totalItems, tickets] = await prisma.$transaction([
        prisma.ticket.count({ where }),
        prisma.ticket.findMany({
          where,
          select: {
            id: true,
            ticketNumber: true,
            summary: true,
            requestedPriority: true,
            itPriority: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            category: { select: { id: true, name: true } },
            relatedSystem: { select: { id: true, name: true } },
          },
          orderBy: ticketListOrderBy(query),
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
      ]);

      response.status(200).json({
        data: tickets,
        meta: {
          page: query.page,
          pageSize: query.pageSize,
          totalItems,
          totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize),
          search: query.search,
          filters: {
            categoryId: query.categoryId,
            relatedSystemId: query.relatedSystemId,
            requestedPriority: query.requestedPriority,
            status: query.status,
          },
          sort: query.sort,
          direction: query.direction,
        },
      });
    } catch {
      response.status(500).json({
        error: {
          code: "TICKET_LIST_FAILED",
          message: "Your Tickets could not be loaded. Try again.",
        },
      });
    }
  },
);

ticketRouter.post(
  "/",
  developmentRequesterContext,
  async (request, response: Response<unknown, DevelopmentRequesterLocals>) => {
    const validation = validateCreateTicketInput(request.body);
    if (!validation.success) {
      validationError(response, validation.fieldErrors);
      return;
    }

    const prisma = getPrisma();
    const { categoryId, relatedSystemId } = validation.data;

    try {
      const [category, relatedSystem] = await Promise.all([
        prisma.category.findFirst({ where: { id: categoryId, isActive: true }, select: { id: true } }),
        prisma.relatedSystem.findFirst({
          where: { id: relatedSystemId, isActive: true },
          select: { id: true },
        }),
      ]);
      const fieldErrors: TicketFieldErrors = {};
      if (!category) fieldErrors.categoryId = "Select an active Category.";
      if (!relatedSystem) fieldErrors.relatedSystemId = "Select an active Related System.";
      if (Object.keys(fieldErrors).length > 0) {
        validationError(response, fieldErrors);
        return;
      }

      const requesterId = response.locals.developmentRequester.id;
      const ticket = await retryTicketNumberCollision((ticketNumber) =>
        prisma.ticket.create({
          data: {
            ...validation.data,
            ticketNumber,
            requesterId,
          },
          select: {
            id: true,
            ticketNumber: true,
            requesterId: true,
            status: true,
            createdAt: true,
          },
        }),
      );

      response.status(201).json({ data: ticket });
    } catch {
      response.status(500).json({
        error: {
          code: "TICKET_CREATE_FAILED",
          message: "The Ticket could not be created. Try again.",
        },
      });
    }
  },
);
