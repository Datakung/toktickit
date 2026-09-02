import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export function deployTestMigrations(cwd = process.cwd()) {
  const prismaCli = require.resolve("prisma/build/index.js");

  execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    cwd,
    env: process.env,
    stdio: "inherit",
  });
}
