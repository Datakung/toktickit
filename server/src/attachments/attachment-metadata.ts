import { Prisma } from "@prisma/client";

export const attachmentMetadataSelect = {
  id: true,
  ticketId: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  createdAt: true,
  removedAt: true,
  removalReason: true,
  removedByUserId: true,
} satisfies Prisma.AttachmentSelect;

export type StoredAttachmentMetadata = Prisma.AttachmentGetPayload<{
  select: typeof attachmentMetadataSelect;
}>;

export function toAttachmentMetadata(attachment: StoredAttachmentMetadata) {
  const { removedByUserId, ...metadata } = attachment;
  return {
    ...metadata,
    removedByRequesterId: removedByUserId,
    removed: attachment.removedAt !== null,
  };
}
