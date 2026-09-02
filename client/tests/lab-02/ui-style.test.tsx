import { describe, expect, it } from "vitest";
import "../../src/app.css";

function compact(value: string) {
  return value.replace(/\s+/g, " ");
}

const css = compact(
  Array.from(document.styleSheets)
    .flatMap((sheet) => Array.from(sheet.cssRules).map((rule) => rule.cssText))
    .join("\n")
    .toLowerCase(),
);

describe("Lab 2 Zen Green visual contract", () => {
  it.each([
    ["--green-700", "#006b3c"],
    ["--green-600", "#0b7a46"],
    ["--green-100", "#eaf6ef"],
    ["--page-bg", "#f5f7f6"],
    ["--surface", "#ffffff"],
    ["--text", "#18352a"],
    ["--muted", "#52665e"],
    ["--border", "#c8d5cf"],
    ["--readonly-bg", "#f0f3ee"],
    ["--error", "#9b1c1c"],
    ["--error-bg", "#fdecec"],
    ["--warning", "#8a4b08"],
    ["--warning-bg", "#fff4d6"],
    ["--success", "#12633b"],
    ["--focus", "#0b7a46"],
  ])("defines the approved %s token", (token, value) => {
    expect(css).toContain(`${token}: ${value}`);
  });

  it("uses the tokens for focus, editable, read-only, invalid, and disabled states", () => {
    expect(css).toMatch(
      /button:focus-visible,.*?textarea:focus-visible\s*\{\s*outline: 3px solid var\(--focus\)/,
    );
    expect(css).toMatch(
      /\.form-grid select,.*?\.form-grid textarea \{.*?background: var\(--surface\)/,
    );
    expect(css).toMatch(
      /\.context-grid div \{.*?background: var\(--readonly-bg\)/,
    );
    expect(css).toMatch(
      /\.form-grid \[aria-invalid="true"\]\s*\{\s*border-color: var\(--error\)/,
    );
    expect(css).toMatch(
      /\.primary-button:disabled \{.*?background: #[0-9a-f]{6}/,
    );
  });

  it("keeps each button hierarchy and textual badge treatment distinct", () => {
    expect(css).toMatch(
      /\.primary-button \{.*?background: var\(--green-700\)/,
    );
    expect(css).toMatch(
      /\.secondary-button \{.*?background: var\(--surface\)/,
    );
    expect(css).toMatch(/\.text-button \{.*?text-decoration: underline/);
    expect(css).toMatch(/\.danger-button \{.*?background: var\(--error\)/);
    expect(css).toMatch(/\.badge \{.*?font-weight: 800/);
    expect(css).toContain(".status-new");
    expect(css).toContain(".priority-low");
    expect(css).toContain(".priority-medium");
    expect(css).toContain(".priority-high");
    expect(css).toContain(".badge-removed");
  });

  it("defines the mobile card and dialog layout without horizontal table forcing", () => {
    expect(css).toContain("@media (max-width: 767px)");
    expect(css).toMatch(/\.ticket-table-wrap\s*\{\s*display: none/);
    expect(css).toMatch(/\.ticket-card-list\s*\{\s*display: grid/);
    expect(css).toMatch(/\.preview-dialog,.*?\.removal-dialog\s*\{\s*padding: 18px/);
  });
});
