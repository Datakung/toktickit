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
  it("wraps workflow history and checklist content and permits pagination controls to reflow", () => {
    expect(css).toMatch(/\.workflow-event-list li\s*\{[^}]*overflow-wrap: anywhere/);
    expect(css).toMatch(/\.workflow-pagination\s*\{[^}]*flex-wrap: wrap/);
    expect(css).toMatch(/\.workflow-history, \.resolution-checklist\s*\{[^}]*min-width: 0;[^}]*overflow-wrap: anywhere/);
    expect(css).toMatch(/\.resolution-checklist a\s*\{[^}]*min-height: 44px;[^}]*color: var\(--green-700\)/);
    expect(css).toContain(".resolution-checklist a:focus-visible, .workflow-history button:focus-visible { outline: 3px solid var(--focus)");
  });
  it("emphasizes the overall resolution banner above individual requirements", () => {
    expect(css).toMatch(/\.resolution-checklist-status\s*\{[^}]*font-size: clamp\(1\.25rem,[^}]*font-weight: 800;[^}]*padding: 20px;[^}]*border-inline-start-width: 6px/);
    expect(css).toContain(".resolution-checklist-status .resolution-requirement-icon { font-size: 1.2em; }");
  });
  it("aligns equal-sized create/save and discard controls without the primary-button top margin", () => {
    expect(css).toMatch(/\.action-editor \.action-controls\s*\{[^}]*display: grid;[^}]*grid-template-columns: repeat\(2, minmax\(0, 300px\)\);[^}]*grid-auto-rows: 1fr;[^}]*align-items: stretch/);
    expect(css).toMatch(/\.action-editor \.action-controls > button\s*\{[^}]*min-height: 48px;[^}]*margin-top: 0/);
    expect(css).toMatch(/\.action-editor \.action-controls\s*\{ grid-template-columns: minmax\(0, 1fr\);/);
  });
});
