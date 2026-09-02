import { describe, expect, it } from "vitest";
import { requireIsolatedE2EDatabase } from "../support/e2e-environment.js";

const developmentUrl =
  "postgresql://developer:secret@localhost:5432/toktickit?schema=public";

describe("E2E database isolation guard", () => {
  it("rejects a missing E2E target", () => {
    expect(() =>
      requireIsolatedE2EDatabase({ developmentUrl, e2eUrl: undefined }),
    ).toThrow(/E2E_DATABASE_URL is required/);
  });

  it("rejects the development target even with different credentials", () => {
    expect(() =>
      requireIsolatedE2EDatabase({
        developmentUrl,
        e2eUrl:
          "postgresql://another:account@localhost:5432/toktickit?schema=public",
      }),
    ).toThrow(/must not target the development database/);
  });

  it("rejects a distinct target without an E2E marker", () => {
    expect(() =>
      requireIsolatedE2EDatabase({
        developmentUrl,
        e2eUrl:
          "postgresql://developer:secret@localhost:5432/toktickit_browser?schema=public",
      }),
    ).toThrow(/clearly marked for E2E/);
  });

  it("accepts a dedicated E2E database", () => {
    const e2eUrl =
      "postgresql://developer:secret@localhost:5432/toktickit_e2e?schema=public";

    expect(
      requireIsolatedE2EDatabase({ developmentUrl, e2eUrl }),
    ).toBe(e2eUrl);
  });

  it("accepts a clearly isolated E2E schema", () => {
    const e2eUrl =
      "postgresql://developer:secret@localhost:5432/toktickit?schema=lab2_e2e";

    expect(
      requireIsolatedE2EDatabase({ developmentUrl, e2eUrl }),
    ).toBe(e2eUrl);
  });
});
