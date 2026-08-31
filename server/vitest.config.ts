import { defineConfig } from "vitest/config";
import { configureTestDatabaseEnvironment } from "./tests/support/test-database.js";

const testDatabaseUrl = configureTestDatabaseEnvironment();

export default defineConfig({
  test: {
    environment: "node",
    env: {
      DATABASE_URL: testDatabaseUrl,
      NODE_ENV: "test",
    },
    globalSetup: ["./tests/global-setup.ts"],
    include: ["tests/**/*.test.ts"],
  },
});
