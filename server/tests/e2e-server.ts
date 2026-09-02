import { prepareE2EEnvironment } from "./support/e2e-environment.js";

await prepareE2EEnvironment();
await import("../src/index.js");
