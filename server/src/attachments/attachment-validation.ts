import path from "node:path";

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

interface AllowedFileType {
  canonicalExtension: "jpg" | "png" | "webp" | "pdf";
  mimeType: string;
  signatureMatches: (content: Buffer) => boolean;
}

const startsWith = (expected: number[]) => (content: Buffer) =>
  content.length >= expected.length && expected.every((byte, index) => content[index] === byte);

const allowedTypes: Record<string, AllowedFileType> = {
  jpg: {
    canonicalExtension: "jpg",
    mimeType: "image/jpeg",
    signatureMatches: startsWith([0xff, 0xd8, 0xff]),
  },
  jpeg: {
    canonicalExtension: "jpg",
    mimeType: "image/jpeg",
    signatureMatches: startsWith([0xff, 0xd8, 0xff]),
  },
  png: {
    canonicalExtension: "png",
    mimeType: "image/png",
    signatureMatches: startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  webp: {
    canonicalExtension: "webp",
    mimeType: "image/webp",
    signatureMatches: (content) =>
      content.length >= 12 &&
      content.subarray(0, 4).toString("ascii") === "RIFF" &&
      content.subarray(8, 12).toString("ascii") === "WEBP",
  },
  pdf: {
    canonicalExtension: "pdf",
    mimeType: "application/pdf",
    signatureMatches: startsWith([0x25, 0x50, 0x44, 0x46, 0x2d]),
  },
};

export interface ValidAttachment {
  originalName: string;
  canonicalExtension: AllowedFileType["canonicalExtension"];
  mimeType: string;
}

function sanitizeStem(stem: string): string {
  const sanitized = stem
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .replace(/\.+$/u, "")
    .replace(/[<>:"/\\|?*]/g, "_");

  return !sanitized || sanitized === "." || sanitized === ".." ? "attachment" : sanitized;
}

export function sanitizeAttachmentName(
  unsafeName: string,
  canonicalExtension: AllowedFileType["canonicalExtension"],
): string {
  const basename = path.posix.basename(unsafeName.replace(/\\/g, "/").normalize("NFC"))
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .replace(/\.+$/u, "");
  const dot = basename.lastIndexOf(".");
  const rawStem = dot > 0 ? basename.slice(0, dot) : basename;
  const stem = sanitizeStem(rawStem);
  const maximumStemPoints = 120 - canonicalExtension.length - 1;
  const truncatedStem = Array.from(stem).slice(0, maximumStemPoints).join("") || "attachment";
  return `${truncatedStem}.${canonicalExtension}`;
}

export function validateAttachment(
  originalName: string,
  declaredMimeType: string,
  signatureBytes: Buffer,
): ValidAttachment | null {
  const basename = path.posix.basename(originalName.replace(/\\/g, "/"))
    .trim()
    .replace(/\.+$/u, "");
  const extension = path.posix.extname(basename).slice(1).toLowerCase();
  const allowed = allowedTypes[extension];

  if (!allowed || declaredMimeType.toLowerCase() !== allowed.mimeType) return null;
  if (!allowed.signatureMatches(signatureBytes)) return null;

  return {
    originalName: sanitizeAttachmentName(basename, allowed.canonicalExtension),
    canonicalExtension: allowed.canonicalExtension,
    mimeType: allowed.mimeType,
  };
}
