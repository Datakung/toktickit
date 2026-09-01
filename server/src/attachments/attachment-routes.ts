import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { open, rename, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Router, type RequestHandler, type Response } from "express";
import multer from "multer";
import { getPrisma } from "../prisma.js";
import {
  developmentRequesterContext,
  type DevelopmentRequesterLocals,
} from "../middleware/development-requester-context.js";
import { MAX_ATTACHMENT_BYTES, validateAttachment } from "./attachment-validation.js";

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

interface AttachmentLocals extends DevelopmentRequesterLocals {
  attachmentTicketId: number;
}

const safeRemove = async (filename: string | undefined) => {
  if (!filename) return;
  await rm(filename, { force: true }).catch(() => undefined);
};

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
          select: {
            id: true,
            ticketId: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            createdAt: true,
            removedAt: true,
            removalReason: true,
            removedByRequesterId: true,
          },
        });
      });

      response.status(201).json({ data: attachment });
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
