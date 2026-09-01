import { Router, type Response } from "express";
import { getPrisma } from "../prisma.js";
import {
  developmentRequesterContext,
  type DevelopmentRequesterLocals,
} from "../middleware/development-requester-context.js";
import { retryTicketNumberCollision } from "./ticket-number.js";
import { validateCreateTicketInput, type TicketFieldErrors } from "./ticket-validation.js";

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
