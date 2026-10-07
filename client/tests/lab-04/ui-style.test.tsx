import { describe, expect, it } from "vitest";
import css from "../../src/app.css?raw";
describe("Actions Taken responsive style contract", () => {
  it("reuses the green theme and visible keyboard focus", () => {
    expect(css).toContain(".actions-table th { background: var(--green-100); color: var(--green-700);");
    expect(css).toContain(".actions-taken :focus-visible { outline: 3px solid var(--focus)");
  });
  it("wraps long action and history content", () => {
    expect(css).toMatch(/\.actions-taken\s*\{[^}]*overflow-wrap: anywhere/);
    expect(css).toMatch(/\.action-history pre\s*\{[^}]*white-space: pre-wrap;[^}]*overflow-wrap: anywhere/);
  });
  it("converts tablet tables into labeled cards without hiding accessible headers", () => {
    expect(css).toContain("@media (max-width: 900px)");
    expect(css).toContain('content: attr(data-label)');
    expect(css).toMatch(/\.actions-table thead\s*\{[^}]*clip-path: inset\(50%\)/);
  });
  it("stacks mobile fields and keeps controls touch-friendly", () => {
    expect(css).toContain(".action-record-grid, .action-form-grid { grid-template-columns: minmax(0, 1fr);");
    expect(css).toMatch(/\.actions-taken button, \.action-history summary\s*\{ min-height: 44px/);
  });
});
