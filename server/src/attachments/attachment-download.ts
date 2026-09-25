import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultUploadRoot = fileURLToPath(new URL("../../uploads/", import.meta.url));
const uploadRoot = process.env.ATTACHMENT_UPLOAD_ROOT ? path.resolve(process.env.ATTACHMENT_UPLOAD_ROOT) : defaultUploadRoot;

export function dispositionHeader(value: "inline" | "attachment", filename: string) {
  const fallback = filename.replace(/[^\x20-\x7e]|["\\]/g, "_") || "attachment";
  const encoded = encodeURIComponent(filename).replace(/[!'()*]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${value}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

export async function storedAttachmentContent(storedName: string, expectedSize: number) {
  if (path.basename(storedName) !== storedName) return null;
  try {
    const content = await readFile(path.join(uploadRoot, storedName));
    return content.length === expectedSize ? content : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
