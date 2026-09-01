import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
import { ticketRouter } from "./tickets/ticket-routes.js";
import { attachmentRouter } from "./attachments/attachment-routes.js";

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(cors());          // already wired: lets the Vite dev server call this API
app.use(express.json());
app.use((error: unknown, _request: Request, response: Response, next: (error?: unknown) => void) => {
  const parseError = error as { type?: string };
  if (error instanceof SyntaxError && parseError.type === "entity.parse.failed") {
    response.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "Request body must be valid JSON.",
      },
    });
    return;
  }

  next(error);
});
app.use("/api/tickets", ticketRouter);
app.use("/api/tickets/:ticketId/attachments", attachmentRouter);

// ---------------------------------------------------------------------------
// Issue 2 — API health check
// Make the test in tests/lab-01/health.test.ts pass.
// It must return HTTP 200 with JSON: { status: "ok", service: "TokTickIT API" }
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "TokTickIT API",
  });
});

app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await getPrisma().category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    res.status(200).json(categories);
  } catch {
    res.status(500).json({
      error: {
        code: "REFERENCE_DATA_FAILED",
        message: "Reference data is unavailable. Try again.",
      },
    });
  }
});

app.get("/api/related-systems", async (_req: Request, res: Response) => {
  try {
    const relatedSystems = await getPrisma().relatedSystem.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });

    res.status(200).json(relatedSystems);
  } catch {
    res.status(500).json({
      error: {
        code: "REFERENCE_DATA_FAILED",
        message: "Reference data is unavailable. Try again.",
      },
    });
  }
});

app.get("/api/development-requesters", async (_req: Request, res: Response) => {
  try {
    const requesters = await getPrisma().requesterUser.findMany({
      where: { isActive: true },
      select: {
        id: true,
        displayName: true,
        email: true,
      },
      orderBy: [{ displayName: "asc" }, { id: "asc" }],
    });

    res.status(200).json(requesters);
  } catch {
    res.status(500).json({
      error: {
        code: "REQUESTER_LOOKUP_FAILED",
        message: "Development Requesters are unavailable. Try again.",
      },
    });
  }
});

export default app;
