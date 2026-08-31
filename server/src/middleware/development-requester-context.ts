import type { RequestHandler } from "express";
import { getPrisma } from "../prisma.js";

export interface DevelopmentRequester {
  id: number;
  displayName: string;
  email: string;
}

export interface DevelopmentRequesterLocals extends Record<string, unknown> {
  developmentRequester: DevelopmentRequester;
}

const POSTGRES_INTEGER_MAX = 2_147_483_647;

export const developmentRequesterContext: RequestHandler<
  Record<string, string>,
  unknown,
  unknown,
  Record<string, string>,
  DevelopmentRequesterLocals
> = async (request, response, next) => {
  const rawRequesterId = request.get("X-Development-Requester-Id");

  const requesterId = rawRequesterId ? Number(rawRequesterId) : Number.NaN;

  if (
    !rawRequesterId ||
    !/^[1-9]\d*$/.test(rawRequesterId) ||
    !Number.isSafeInteger(requesterId) ||
    requesterId > POSTGRES_INTEGER_MAX
  ) {
    response.status(400).json({
      error: {
        code: "INVALID_REQUESTER_CONTEXT",
        message: "Select a valid Development Requester.",
      },
    });
    return;
  }

  try {
    const requester = await getPrisma().requesterUser.findUnique({
      where: { id: requesterId },
      select: {
        id: true,
        displayName: true,
        email: true,
        isActive: true,
      },
    });

    if (!requester?.isActive) {
      response.status(403).json({
        error: {
          code: "REQUESTER_UNAVAILABLE",
          message: "Select an available Development Requester.",
        },
      });
      return;
    }

    response.locals.developmentRequester = {
      id: requester.id,
      displayName: requester.displayName,
      email: requester.email,
    };
    next();
  } catch {
    response.status(500).json({
      error: {
        code: "REQUESTER_CONTEXT_FAILED",
        message: "The Development Requester context is unavailable. Try again.",
      },
    });
  }
};
