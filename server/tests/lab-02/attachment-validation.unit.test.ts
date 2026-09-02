import { describe, expect, it } from "vitest";
import {
  sanitizeAttachmentName,
  validateAttachment,
} from "../../src/attachments/attachment-validation.js";

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const webp = Buffer.from("RIFF0000WEBP", "ascii");
const pdf = Buffer.from("%PDF-1.7", "ascii");

describe("Attachment validation", () => {
  it.each([
    ["photo.JPEG", "image/jpeg", jpeg, "photo.jpg"],
    ["screen.png", "image/png", png, "screen.png"],
    ["capture.webp", "image/webp", webp, "capture.webp"],
    ["report.pdf", "application/pdf", pdf, "report.pdf"],
  ])("accepts matching extension, MIME, and signature for %s", (name, mime, content, safeName) => {
    expect(validateAttachment(name, mime, content)).toMatchObject({ originalName: safeName });
  });

  it.each([
    ["report.exe", "application/pdf", pdf],
    ["report.pdf", "image/png", pdf],
    ["report.pdf", "application/pdf", png],
    ["short.webp", "image/webp", Buffer.from("RIFF")],
  ])("rejects a mismatched file %s", (name, mime, content) => {
    expect(validateAttachment(name, mime, content)).toBeNull();
  });

  it("removes paths and unsafe filename characters deterministically", () => {
    expect(sanitizeAttachmentName("../bad<name>.pdf", "pdf")).toBe("bad_name_.pdf");
    expect(sanitizeAttachmentName("..pdf", "pdf")).toBe("attachment.pdf");
    expect(Array.from(sanitizeAttachmentName(`${"x".repeat(200)}.pdf`, "pdf"))).toHaveLength(120);
  });
});
