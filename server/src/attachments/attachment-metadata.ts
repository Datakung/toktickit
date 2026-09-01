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
  removedByRequesterId: true,
} satisfies Prisma.AttachmentSelect;

export type StoredAttachmentMetadata = Prisma.AttachmentGetPayload<{
  select: typeof attachmentMetadataSelect;
}>;

export function toAttachmentMetadata(attachment: StoredAttachmentMetadata) {
  return {
    ...attachment,
    removed: attachment.removedAt !== null,
  };
}
