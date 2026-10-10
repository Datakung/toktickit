import { createServer, request } from "node:http";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { once } from "node:events";
import express from "express";
import multer from "multer";
import { expect, it } from "vitest";

it("removes aborted multipart work even before an asynchronous destination supplies a path", async () => {
  // A unique OS temporary directory and loopback server only: no development
  // attachment directory, credentials, or database records are involved.
  const root = await mkdtemp(path.join(tmpdir(), "toktickit-upload-hardening-test-"));
  let releaseDestination!: () => void;
  let markDestinationEntered!: () => void;
  let markServerAbort!: () => void;
  let markUploadFinished!: () => void;
  const destinationEntered = new Promise<void>(resolve => { markDestinationEntered = resolve; });
  const serverAborted = new Promise<void>(resolve => { markServerAbort = resolve; });
  const uploadFinished = new Promise<void>(resolve => { markUploadFinished = resolve; });
  const upload = multer({ storage: multer.diskStorage({
    destination(_request, _file, done) {
      releaseDestination = () => done(null, root);
      markDestinationEntered();
    },
    filename(_request, _file, done) { done(null, "aborted-upload.png"); },
  }) }).single("file");
  const app = express();
  app.get("/health", (_request, response) => { response.json({ ok: true }); });
  app.post("/upload", (incoming, response) => {
    incoming.once("aborted", markServerAbort);
    upload(incoming, response, () => { markUploadFinished(); });
  });
  const server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Loopback upload test did not start.");
  const client = request({ host: "127.0.0.1", port: address.port, path: "/upload", method: "POST", headers: {
    "Content-Type": "multipart/form-data; boundary=quality-gate-boundary",
  } });
  client.on("error", () => { /* Deliberate client cancellation, not an unhandled error. */ });
  try {
    client.write('--quality-gate-boundary\r\nContent-Disposition: form-data; name="file"; filename="evidence.png"\r\nContent-Type: image/png\r\n\r\n');
    client.write(Buffer.alloc(1024, 0x61));
    await destinationEntered;
    client.destroy();
    await serverAborted;
    releaseDestination();
    await uploadFinished;
    expect(await readdir(root)).toEqual([]);
    const health = await fetch(`http://127.0.0.1:${address.port}/health`);
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ ok: true });
  } finally {
    client.destroy();
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => { server.close(error => error ? reject(error) : resolve()); });
    // Only the verified mkdtemp child is removed, never the OS temp root.
    if (path.dirname(root) !== path.resolve(tmpdir()) || !path.basename(root).startsWith("toktickit-upload-hardening-test-")) {
      throw new Error("Unexpected upload test cleanup target.");
    }
    await rm(root, { recursive: true, force: true });
  }
}, 10000);
