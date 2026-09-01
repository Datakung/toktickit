import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { open, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router, type RequestHandler, type Response } from "express";
import multer from "multer";
import { getPrisma } from "../prisma.js";
import {
  developmentRequesterContext,
  type DevelopmentRequesterLocals,
} from "../middleware/development-requester-context.js";
import { MAX_ATTACHMENT_BYTES, validateAttachment } from "./attachment-validation.js";
import {
  attachmentMetadataSelect,
  toAttachmentMetadata,
} from "./attachment-metadata.js";

const uploadRoot = fileURLToPath(new URL("../../uploads/", import.meta.url));
const temporaryRoot = fileURLToPath(new URL("../../uploads/.tmp/", import.meta.url));
mkdirSync(temporaryRoot, { recursive: true });

const upload = multer({
  dest: temporaryRoot,
  limits: { fileSize: MAX_ATTACHMENT_BYTES, files: 1 },
});
const POSTGRES_INTEGER_MAX = 2_147_483_647;

class AttachmentLimitError extends Error {}
class TicketNotFoundError extends Error {}
class AttachmentNotFoundError extends Error {}
class AttachmentAlreadyRemovedError extends Error {}

interface AttachmentLocals extends DevelopmentRequesterLocals {
  attachmentTicketId: number;
}

const safeRemove = async (filename: string | undefined) => {
  if (!filename) return;
  await rm(filename, { force: true }).catch(() => undefined);
};

function positiveRouteId(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id <= POSTGRES_INTEGER_MAX ? id : null;
}

function attachmentNotFound(response: Response) {
  response.status(404).json({
    error: { code: "ATTACHMENT_NOT_FOUND", message: "Attachment not found." },
  });
}

function contentDisposition(value: "inline" | "attachment", filename: string) {
  const fallback = filename.replace(/[^\x20-\x7e]|["\\]/g, "_") || "attachment";
  const encoded = encodeURIComponent(filename).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${value}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

const ticketOwnership: RequestHandler<
  { ticketId: string },
  unknown,
  unknown,
  Record<string, string>,
  AttachmentLocals
> = async (request, response, next) => {
  const ticketId = Number(request.params.ticketId);
  if (
    !/^[1-9]\d*$/.test(request.params.ticketId) ||
    !Number.isSafeInteger(ticketId) ||
    ticketId > POSTGRES_INTEGER_MAX
  ) {
    response.status(404).json({
      error: { code: "TICKET_NOT_FOUND", message: "Ticket not found." },
    });
    return;
  }

  try {
    const ticket = await getPrisma().ticket.findFirst({
      where: { id: ticketId, requesterId: response.locals.developmentRequester.id },
      select: { id: true },
    });
    if (!ticket) {
      response.status(404).json({
        error: { code: "TICKET_NOT_FOUND", message: "Ticket not found." },
      });
      return;
    }
    response.locals.attachmentTicketId = ticket.id;
    next();
  } catch {
    response.status(500).json({
      error: { code: "ATTACHMENT_UPLOAD_FAILED", message: "The file could not be uploaded. Try again." },
    });
  }
};

const parseSingleFile: RequestHandler = (request, response, next) => {
  upload.single("file")(request, response, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      response.status(413).json({
        error: { code: "FILE_TOO_LARGE", message: "Files must be 5 MiB or smaller." },
      });
      return;
    }

    response.status(400).json({
      error: { code: "FILE_REQUIRED", message: "Attach exactly one file using the file field." },
    });
  });
};

export const attachmentRouter = Router({ mergeParams: true });

attachmentRouter.get(
  "/",
  developmentRequesterContext,
  async (request, response: Response<unknown, DevelopmentRequesterLocals>) => {
    const ticketId = positiveRouteId(request.params.ticketId);
    if (ticketId === null) {
      response.status(404).json({
        error: { code: "TICKET_NOT_FOUND", message: "Ticket not found." },
      });
      return;
    }

    try {
      const ticket = await getPrisma().ticket.findFirst({
        where: { id: ticketId, requesterId: response.locals.developmentRequester.id },
        select: {
          attachments: {
            select: attachmentMetadataSelect,
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          },
        },
      });
      if (!ticket) {
        response.status(404).json({
          error: { code: "TICKET_NOT_FOUND", message: "Ticket not found." },
        });
        return;
      }

      response.status(200).json({
        data: ticket.attachments.map(toAttachmentMetadata),
      });
    } catch {
      response.status(500).json({
        error: {
          code: "ATTACHMENT_METADATA_FAILED",
          message: "Attachments could not be loaded. Try again.",
        },
      });
    }
  },
);

attachmentRouter.post(
  "/",
  developmentRequesterContext,
  ticketOwnership,
  parseSingleFile,
  async (request, response: Response<unknown, AttachmentLocals>) => {
    const temporaryPath = request.file?.path;
    let finalPath: string | undefined;

    try {
      if (!request.file) {
        response.status(400).json({
          error: { code: "FILE_REQUIRED", message: "Attach one file using the file field." },
        });
        return;
      }

      const file = await open(request.file.path, "r");
      const signature = Buffer.alloc(12);
      const { bytesRead } = await file.read(signature, 0, signature.length, 0);
      await file.close();
      const valid = validateAttachment(
        request.file.originalname,
        request.file.mimetype,
        signature.subarray(0, bytesRead),
      );
      if (!valid) {
        response.status(415).json({
          error: {
            code: "FILE_TYPE_NOT_ALLOWED",
            message: "Use a JPEG, PNG, WEBP, or PDF whose extension and contents match.",
          },
        });
        return;
      }

      const prisma = getPrisma();
      const ticketId = response.locals.attachmentTicketId;
      const requesterId = response.locals.developmentRequester.id;
      const storedName = `${randomUUID()}.${valid.canonicalExtension}`;
      finalPath = `${uploadRoot}${storedName}`;

      const attachment = await prisma.$transaction(async (transaction) => {
        await transaction.$queryRaw`
          SELECT pg_advisory_xact_lock(141448, CAST(${ticketId} AS INTEGER))::text
        `;
        const ticket = await transaction.ticket.findFirst({
          where: { id: ticketId, requesterId },
          select: { id: true },
        });
        if (!ticket) throw new TicketNotFoundError();

        const activeCount = await transaction.attachment.count({
          where: { ticketId, removedAt: null },
        });
        if (activeCount >= 5) throw new AttachmentLimitError();

        await rename(request.file!.path, finalPath!);
        return transaction.attachment.create({
          data: {
            ticketId,
            originalName: valid.originalName,
            storedName,
            mimeType: valid.mimeType,
            sizeBytes: request.file!.size,
          },
          select: attachmentMetadataSelect,
        });
      });

      response.status(201).json({ data: toAttachmentMetadata(attachment) });
    } catch (error) {
      if (error instanceof TicketNotFoundError) {
        response.status(404).json({
          error: { code: "TICKET_NOT_FOUND", message: "Ticket not found." },
        });
      } else if (error instanceof AttachmentLimitError) {
        response.status(409).json({
          error: {
            code: "ATTACHMENT_LIMIT_REACHED",
            message: "A Ticket can have at most five active Attachments.",
          },
        });
      } else {
        response.status(500).json({
          error: {
            code: "ATTACHMENT_UPLOAD_FAILED",
            message: "The file could not be uploaded. Try again.",
          },
        });
      }
    } finally {
      await safeRemove(temporaryPath);
      if (!response.headersSent || response.statusCode !== 201) await safeRemove(finalPath);
    }
  },
);

attachmentRouter.get(
  "/:attachmentId/download",
  developmentRequesterContext,
  async (request, response: Response<unknown, DevelopmentRequesterLocals>) => {
    const ticketId = positiveRouteId(request.params.ticketId);
    const attachmentId = positiveRouteId(request.params.attachmentId);
    if (ticketId === null || attachmentId === null) {
      attachmentNotFound(response);
      return;
    }

    const rawDisposition = request.query.disposition;
    const disposition = rawDisposition === undefined ? "attachment" : rawDisposition;
    if (disposition !== "attachment" && disposition !== "inline") {
      response.status(400).json({
        error: {
          code: "INVALID_QUERY",
          message: "Correct the Attachment-content query and try again.",
          fields: { disposition: "disposition must be attachment or inline." },
        },
      });
      return;
    }

    try {
      const attachment = await getPrisma().attachment.findFirst({
        where: {
          id: attachmentId,
          ticketId,
          removedAt: null,
          ticket: { requesterId: response.locals.developmentRequester.id },
        },
        select: {
          originalName: true,
          storedName: true,
          mimeType: true,
          sizeBytes: true,
        },
      });
      if (!attachment || path.basename(attachment.storedName) !== attachment.storedName) {
        attachmentNotFound(response);
        return;
      }

      let content: Buffer;
      try {
        content = await readFile(path.join(uploadRoot, attachment.storedName));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          attachmentNotFound(response);
          return;
        }
        throw error;
      }

      if (content.length !== attachment.sizeBytes) {
        attachmentNotFound(response);
        return;
      }
      response.status(200)
        .set({
          "Content-Type": attachment.mimeType,
          "Content-Length": String(content.length),
          "Content-Disposition": contentDisposition(disposition, attachment.originalName),
          "Cache-Control": "private, no-store",
        })
        .send(content);
    } catch {
      response.status(500).json({
        error: {
          code: "ATTACHMENT_CONTENT_FAILED",
          message: "Attachment content could not be loaded. Try again.",
        },
      });
    }
  },
);

attachmentRouter.delete(
  "/:attachmentId",
  developmentRequesterContext,
  async (request, response: Response<unknown, DevelopmentRequesterLocals>) => {
    const ticketId = positiveRouteId(request.params.ticketId);
    const attachmentId = positiveRouteId(request.params.attachmentId);
    if (ticketId === null || attachmentId === null) {
      attachmentNotFound(response);
      return;
    }

    const body = request.body as { reason?: unknown };
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (reason.length < 5 || reason.length > 250) {
      response.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Correct the highlighted fields and try again.",
          fields: { reason: "Removal reason must be between 5 and 250 characters." },
        },
      });
      return;
    }

    try {
      const requesterId = response.locals.developmentRequester.id;
      const removed = await getPrisma().$transaction(async (transaction) => {
        const attachment = await transaction.attachment.findFirst({
          where: {
            id: attachmentId,
            ticketId,
            ticket: { requesterId },
          },
          select: { removedAt: true },
        });
        if (!attachment) throw new AttachmentNotFoundError();
        if (attachment.removedAt !== null) throw new AttachmentAlreadyRemovedError();

        const update = await transaction.attachment.updateMany({
          where: { id: attachmentId, ticketId, removedAt: null },
          data: {
            removedAt: new Date(),
            removalReason: reason,
            removedByRequesterId: requesterId,
          },
        });
        if (update.count !== 1) throw new AttachmentAlreadyRemovedError();

        return transaction.attachment.findUniqueOrThrow({
          where: { id: attachmentId },
          select: attachmentMetadataSelect,
        });
      });

      response.status(200).json({ data: toAttachmentMetadata(removed) });
    } catch (error) {
      if (error instanceof AttachmentNotFoundError) {
        attachmentNotFound(response);
      } else if (error instanceof AttachmentAlreadyRemovedError) {
        response.status(409).json({
          error: {
            code: "ATTACHMENT_ALREADY_REMOVED",
            message: "This Attachment has already been removed.",
          },
        });
      } else {
        response.status(500).json({
          error: {
            code: "ATTACHMENT_REMOVE_FAILED",
            message: "The Attachment could not be removed. Try again.",
          },
        });
      }
    }
  },
);
