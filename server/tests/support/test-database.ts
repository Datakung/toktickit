import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

interface TestDatabaseTargets {
  developmentUrl: string | undefined;
  testUrl: string | undefined;
}

function parsePostgresTarget(rawUrl: string, variableName: string) {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`${variableName} must be a valid PostgreSQL URL.`);
  }

  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error(`${variableName} must use the PostgreSQL protocol.`);
  }

  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  const schema = url.searchParams.get("schema") ?? "public";

  if (!database) {
    throw new Error(`${variableName} must include a database name.`);
  }

  return {
    database,
    schema,
    target: [
      url.hostname.toLowerCase(),
      url.port || "5432",
      database.toLowerCase(),
      schema.toLowerCase(),
    ].join("/"),
  };
}

function hasTestMarker(value: string) {
  return /(^|[-_])tests?(?:ing)?($|[-_])/i.test(value);
}

export function requireIsolatedTestDatabase({
  developmentUrl,
  testUrl,
}: TestDatabaseTargets): string {
  if (!testUrl) {
    throw new Error(
      "TEST_DATABASE_URL is required. Server tests will not use the development database.",
    );
  }

  if (!developmentUrl) {
    throw new Error(
      "DATABASE_URL is required so the test target can be checked against development.",
    );
  }

  const development = parsePostgresTarget(developmentUrl, "DATABASE_URL");
  const test = parsePostgresTarget(testUrl, "TEST_DATABASE_URL");

  if (test.target === development.target) {
    throw new Error(
      "TEST_DATABASE_URL must not target the same database and schema as DATABASE_URL.",
    );
  }

  if (!hasTestMarker(test.database) && !hasTestMarker(test.schema)) {
    throw new Error(
      "TEST_DATABASE_URL must use a database or schema clearly marked as test-only.",
    );
  }

  return testUrl;
}

export function configureTestDatabaseEnvironment() {
  if (existsSync(".env")) {
    loadEnvFile(".env");
  }

  const testUrl = requireIsolatedTestDatabase({
    developmentUrl: process.env.DATABASE_URL,
    testUrl: process.env.TEST_DATABASE_URL,
  });

  process.env.DATABASE_URL = testUrl;
  process.env.NODE_ENV = "test";
  return testUrl;
}
