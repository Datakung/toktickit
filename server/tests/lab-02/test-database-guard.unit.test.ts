import { describe, expect, it } from "vitest";
import { requireIsolatedTestDatabase } from "../support/test-database.js";

const developmentUrl =
  "postgresql://developer:secret@localhost:5432/toktickit?schema=public";

describe("test database isolation guard", () => {
  it("rejects a missing test target", () => {
    expect(() =>
      requireIsolatedTestDatabase({ developmentUrl, testUrl: undefined }),
    ).toThrow(/TEST_DATABASE_URL is required/);
  });

  it("rejects the development target even with different credentials", () => {
    expect(() =>
      requireIsolatedTestDatabase({
        developmentUrl,
        testUrl:
          "postgresql://another:account@localhost:5432/toktickit?schema=public",
      }),
    ).toThrow(/same database and schema/);
  });

  it("rejects a distinct target without a clear test marker", () => {
    expect(() =>
      requireIsolatedTestDatabase({
        developmentUrl,
        testUrl:
          "postgresql://developer:secret@localhost:5432/toktickit_shadow?schema=public",
      }),
    ).toThrow(/clearly marked as test-only/);
  });

  it("accepts a dedicated test database", () => {
    const testUrl =
      "postgresql://developer:secret@localhost:5432/toktickit_test?schema=public";

    expect(
      requireIsolatedTestDatabase({ developmentUrl, testUrl }),
    ).toBe(testUrl);
  });

  it("accepts a clearly isolated test schema", () => {
    const testUrl =
      "postgresql://developer:secret@localhost:5432/toktickit?schema=lab2_test";

    expect(
      requireIsolatedTestDatabase({ developmentUrl, testUrl }),
    ).toBe(testUrl);
  });
});
