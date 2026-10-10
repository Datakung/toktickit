import { createRequire } from "node:module";
import { expect, it } from "vitest";
import { app } from "../../src/app.js";

it("keeps forwarded client addresses untrusted by default", () => {
  expect(app.get("trust proxy")).toBe(false);
});

it("uses Express's patched proxy matcher without trusting unrelated IPv4-mapped IPv6 addresses", () => {
  const require = createRequire(import.meta.url);
  const fromExpress = createRequire(require.resolve("express"));
  const proxyAddr = fromExpress("proxy-addr") as { compile: (ranges: string[]) => (address: string) => boolean };
  const loopback = proxyAddr.compile(["127.0.0.0/8"]);
  expect(loopback("127.0.0.1")).toBe(true);
  expect(loopback("::ffff:127.0.0.1")).toBe(true);
  expect(loopback("8.8.8.8")).toBe(false);
  expect(loopback("::ffff:8.8.8.8")).toBe(false);
});
