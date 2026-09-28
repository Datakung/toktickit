import { readFile } from "node:fs/promises";
import { getPrisma } from "../src/prisma.js";
import { provisionUsers } from "../src/auth/provisioning.js";

async function main() {
  const filename = process.argv[2];
  if (!filename) throw new Error("Provide the path to your ignored local provisioning JSON file.");
  const count = await provisionUsers(getPrisma(), JSON.parse(await readFile(filename, "utf8")));
  console.log(`Provisioned ${count} accounts. Existing passwords were not changed.`);
}
main().catch(() => {
  // JSON parse/driver errors can include input; never print raw provisioning errors.
  console.error("Provisioning failed. Check input format, complete account coverage and database availability. No credentials are printed.");
  process.exitCode = 1;
}).finally(() => getPrisma().$disconnect());
