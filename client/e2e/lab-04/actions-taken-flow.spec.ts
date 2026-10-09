import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { E2E_PASSWORD } from "../support/auth.js";

const api = "http://127.0.0.1:3100";
const evidenceRoot = fileURLToPath(new URL("../../../artifacts/lab-04/screenshots/actions-taken/", import.meta.url));
const persistent = process.env.npm_lifecycle_event === "test:e2e:lab4-actions-evidence";
async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
}
async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
}
async function csrf(page: Page) {
  return (await (await page.request.get(`${api}/api/auth/me`)).json()).csrfToken as string;
}
async function fixture(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, "anan.chaiyasit@example.test");
  const categories = await (await page.request.get(`${api}/api/categories`)).json();
  const systems = await (await page.request.get(`${api}/api/related-systems`)).json();
  const response = await page.request.post(`${api}/api/tickets`, {
    headers: { "X-CSRF-Token": await csrf(page), Origin: new URL(page.url()).origin },
    data: { categoryId: categories[0].id, relatedSystemId: systems[0].id, requestedPriority: "MEDIUM", summary: `Lab 4 action evidence ${randomUUID()}`, description: "Isolated browser fixture; never development data." },
  });
  expect(response.status()).toBe(201);
  const ticket = (await response.json()).data;
  await signOut(page); await login(page, "mali.support@example.test");
  await page.goto(`/staff/tickets/${ticket.id}`);
  await expect(page.getByRole("button", { name: "New action" })).toBeEnabled();
  return ticket as { id: number; ticketNumber: string };
}
async function create(page: Page, description: string, actionNumber = 1) {
  const section = page.getByRole("region", { name: "Actions Taken", exact: true });
  await section.getByRole("button", { name: "New action" }).click();
  await expect(section.getByLabel("Action Date/Time (Bangkok)")).toBeFocused();
  await section.getByLabel("Description", { exact: true }).fill(description);
  const response = page.waitForResponse(r => r.request().method() === "POST" && /\/api\/staff\/tickets\/\d+\/actions$/.test(new URL(r.url()).pathname));
  await section.getByRole("button", { name: "Create action", exact: true }).click();
  const receipt = await (await response).json();
  await expect(section.getByText("Action created.", { exact: true })).toBeVisible();
  await expect(section.getByRole("heading", { name: `Action ${actionNumber}`, exact: true })).toBeFocused();
  return receipt.actionId as number;
}
async function capture(page: Page, info: TestInfo, name: string) {
  await expect.poll(() => page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) <= innerWidth)).toBe(true);
  const destination = persistent ? `${evidenceRoot}${name}.png` : info.outputPath(`${name}.png`);
  mkdirSync(dirname(destination), { recursive: true });
  await page.getByRole("region", { name: "Actions Taken", exact: true }).screenshot({ path: destination, animations: "disabled" });
}

test("different actors create, assign, edit, start, complete, correct and cancel distinct shared actions", async ({ page }, info) => {
  test.setTimeout(90_000);
  const ticket = await fixture(page);
  const section = page.getByRole("region", { name: "Actions Taken", exact: true });
  const first = await create(page, "Investigate VPN connection");
  await section.getByRole("button", { name: "Edit action", exact: true }).click();
  await section.getByLabel("Action assignee").selectOption({ label: "Suda Support" });
  await section.getByLabel("Description", { exact: true }).fill("Diagnosed VPN connection");
  const mutations: Array<{ path: string; body: Record<string, unknown> }> = [];
  page.on("request", request => { if (request.method() === "PATCH" && request.url().includes(`/staff/tickets/${ticket.id}/actions`)) mutations.push({ path: request.url(), body: request.postDataJSON() }); });
  await section.getByRole("button", { name: "Save action", exact: true }).click();
  await expect(section.getByText("Action changes saved.", { exact: true })).toBeVisible();
  expect(mutations).toHaveLength(1); expect(mutations[0].body).not.toHaveProperty("assigneeId");
  await expect(section.getByLabel("Action assignee")).toHaveValue(/\d+/);
  await section.getByRole("button", { name: "Save assignment", exact: true }).click();
  await expect(section.getByText(/Assignment saved/)).toBeVisible();
  expect(mutations).toHaveLength(2); expect(mutations[1].path).toMatch(/\/assignee$/);
  expect(Number(mutations[1].body.ticketVersion)).toBe(Number(mutations[0].body.ticketVersion) + 1);
  await section.getByRole("button", { name: "Close editor" }).click();
  await expect(section.getByRole("form", { name: "Edit action fields" })).toHaveCount(0);
  await section.getByRole("button", { name: "Start action" }).click();
  await expect(section.getByText("Action state saved.", { exact: true })).toBeVisible();
  await expect(section.getByRole("button", { name: "Start action" })).toHaveCount(0);
  await signOut(page); await login(page, "admin@example.test");
  await page.goto(`/staff/tickets/${ticket.id}?tab=actions&actionId=${first}`);
  await expect(section.getByRole("heading", { name: "Action 1", exact: true })).toBeFocused();
  await expect(section.getByRole("form", { name: "Edit action fields" })).toHaveCount(0);
  await section.getByRole("button", { name: "Complete action", exact: true }).click();
  await expect(section.getByLabel("Completion Result")).toBeFocused();
  await section.getByLabel("Completion Result").fill("VPN gateway restored; requester can connect.");
  await section.getByLabel("I confirm I performed this work.").check();
  await section.getByRole("button", { name: "Confirm complete" }).click();
  await expect(section.getByText("Action state saved.", { exact: true })).toBeVisible();
  const detail = section.getByRole("region", { name: "Action 1 details" });
  await expect(detail).toContainText("Mali Support"); await expect(detail).toContainText("Suda Support"); await expect(detail).toContainText("Local Administrator");
  await expect(section.getByLabel("Action assignee")).toHaveCount(0);
  await expect(section.getByRole("form", { name: "Edit action fields" })).toHaveCount(0);
  await section.getByRole("button", { name: "Edit action", exact: true }).click();
  await section.getByLabel("Follow-Up Required").check();
  await section.getByLabel("Follow-up Note").fill("Verify stability tomorrow.");
  await section.getByLabel("Attachment Notes").fill("Diagnostic export discussed in the Ticket attachment.");
  await section.getByLabel("Change reason").fill("Record follow-up after completed work.");
  await section.getByRole("button", { name: "Save action", exact: true }).click();
  await expect(section.getByText("Action changes saved.", { exact: true })).toBeVisible();
  await section.getByLabel("Follow-Up Required").uncheck();
  await section.getByLabel("Follow-up Note").fill("Stability verified; no further follow-up needed.");
  await section.getByLabel("Change reason").fill("Verified and cleared follow-up.");
  await section.getByRole("button", { name: "Save action", exact: true }).click();
  await expect(section.getByText("Action changes saved.", { exact: true })).toBeVisible();
  await capture(page, info, "staff-completed-correction-desktop");
  const second = await create(page, "Duplicate route investigation", 2);
  expect(second).not.toBe(first);
  await section.getByRole("button", { name: "Cancel action", exact: true }).click();
  await section.getByLabel("Cancellation reason").fill("Already covered by completed VPN diagnosis.");
  await section.getByLabel("I confirm cancellation of this action.").check();
  await section.getByRole("button", { name: "Confirm cancel action" }).click();
  await expect(section.getByText("Cancelled actions are read-only.")).toBeVisible();
  await expect(section.getByRole("button", { name: "Save action", exact: true })).toHaveCount(0);
  await capture(page, info, "staff-cancelled-desktop");
  await signOut(page); await login(page, "anan.chaiyasit@example.test");
  await page.goto(`/tickets/${ticket.id}?tab=actions&actionId=${first}`);
  await expect(section.getByRole("heading", { name: "Action 1", exact: true })).toBeFocused();
  await expect(section.getByText(/history is read-only/)).toBeVisible();
  await expect(section.getByRole("button", { name: "New action" })).toHaveCount(0);
  await expect(section.getByText(/Local Administrator/).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Internal Notes", exact: true })).toHaveCount(0);
  expect((await page.request.post(`${api}/api/staff/tickets/${ticket.id}/actions`, { headers: { "X-CSRF-Token": await csrf(page), Origin: new URL(page.url()).origin }, data: {} })).status()).toBe(403);
  await capture(page, info, "requester-readonly-desktop");
});

test("lost create and later assignment responses reconcile once without repeating an earlier field save", async ({ page }, info) => {
  test.setTimeout(90_000);
  const ticket = await fixture(page);
  const section = page.getByRole("region", { name: "Actions Taken", exact: true });
  const createBodies: unknown[] = [];
  await page.route(`**/api/staff/tickets/${ticket.id}/actions`, async route => {
    if (route.request().method() !== "POST") return route.continue();
    createBodies.push(route.request().postDataJSON());
    if (createBodies.length === 1) { expect((await route.fetch()).status()).toBe(201); return route.abort("failed"); }
    await route.continue();
  });
  await section.getByRole("button", { name: "New action" }).click();
  await section.getByLabel("Description", { exact: true }).fill("Lost response fixture");
  await section.getByRole("button", { name: "Create action", exact: true }).click();
  await expect(section.getByText(/Save outcome unknown/)).toBeVisible();
  await expect(section.getByLabel("Description", { exact: true })).toBeDisabled();
  await capture(page, info, "create-outcome-unknown-desktop");
  await page.reload();
  await expect(section.getByText(/Save outcome unknown after reload/)).toBeVisible();
  await section.getByRole("button", { name: "Retry same save" }).click();
  await expect(section.getByText("Action created.", { exact: true })).toBeVisible();
  expect(createBodies).toHaveLength(2); expect(createBodies[0]).toEqual(createBodies[1]);
  await section.getByRole("button", { name: "Edit action", exact: true }).click();
  let fieldSaves = 0;
  page.on("request", request => { if (request.method() === "PATCH" && /\/actions\/\d+$/.test(request.url())) fieldSaves++; });
  await section.getByLabel("Action assignee").selectOption({ label: "Suda Support" });
  await section.getByLabel("Description", { exact: true }).fill("Field save confirmed before separate assignment");
  await section.getByRole("button", { name: "Save action", exact: true }).click();
  await expect(section.getByText("Action changes saved.", { exact: true })).toBeVisible();
  const assignmentBodies: unknown[] = [];
  await page.route(`**/api/staff/tickets/${ticket.id}/actions/*/assignee`, async route => {
    assignmentBodies.push(route.request().postDataJSON());
    if (assignmentBodies.length === 1) { expect((await route.fetch()).status()).toBe(200); return route.abort("failed"); }
    await route.continue();
  });
  await section.getByRole("button", { name: "Save assignment", exact: true }).click();
  await expect(section.getByText(/Action changes saved; assignment outcome unknown/)).toBeVisible();
  await capture(page, info, "assignment-outcome-unknown-desktop");
  await section.getByRole("button", { name: "Retry same save" }).click();
  await expect(section.getByText(/Assignment saved/)).toBeVisible();
  expect(assignmentBodies).toHaveLength(2); expect(assignmentBodies[0]).toEqual(assignmentBodies[1]); expect(fieldSaves).toBe(1);
  const snapshot = await (await page.request.get(`${api}/api/tickets/${ticket.id}/actions`)).json();
  expect(snapshot.items).toHaveLength(1); expect(snapshot.ticketVersion).toBe(4);
  const history = await (await page.request.get(`${api}/api/tickets/${ticket.id}/actions/${snapshot.items[0].id}/history`)).json();
  expect(history.total).toBe(3);
});

test("responsive cards, field controls and read-only histories fit 1440/768/390px", async ({ page }, info) => {
  test.setTimeout(90_000);
  const ticket = await fixture(page);
  const section = page.getByRole("region", { name: "Actions Taken", exact: true });
  const actionId = await create(page, `Inspect long diagnostic token ${"longtoken".repeat(50)}`);
  await section.getByRole("button", { name: "Edit action", exact: true }).click();
  await section.getByLabel("Follow-Up Required").check();
  await section.getByLabel("Follow-up Note").fill("Schedule verification with the requester after the maintenance window.");
  await section.getByLabel("Attachment Notes").fill("See the separately uploaded diagnostic report.");
  await section.getByRole("button", { name: "Save action", exact: true }).click();
  await expect(section.getByText("Action changes saved.", { exact: true })).toBeVisible();
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 1024 });
    await page.keyboard.press("Tab");
    await section.getByRole("button", { name: "Save action", exact: true }).focus();
    expect(await section.getByRole("button", { name: "Save action", exact: true }).evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe("none");
    expect(await section.getByRole("button", { name: "Save action", exact: true }).evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    expect(await section.locator("tbody tr").first().evaluate(element => getComputedStyle(element).display)).toBe(width === 1440 ? "table-row" : "block");
    expect(await section.locator("caption").evaluate(element => element.getBoundingClientRect().height)).toBeLessThan(100);
    await capture(page, info, `staff-active-${width}`);
  }
  await signOut(page); await login(page, "anan.chaiyasit@example.test");
  await page.goto(`/tickets/${ticket.id}?tab=actions&actionId=${actionId}`);
  await expect(section.getByRole("heading", { name: "Action 1", exact: true })).toBeFocused();
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 1024 });
    await capture(page, info, `requester-history-${width}`);
  }
});

test("rejected assignment preserves earlier success, then a real concurrent write requires explicit conflict reload", async ({ page }, info) => {
  const ticket = await fixture(page);
  const section = page.getByRole("region", { name: "Actions Taken", exact: true });
  const actionId = await create(page, "Independent recovery fixture");
  await section.getByRole("button", { name: "Edit action", exact: true }).click();
  await section.getByLabel("Action assignee").selectOption({ label: "Suda Support" });
  await section.getByLabel("Description", { exact: true }).fill("These fields really saved before assignment failed");
  await section.getByRole("button", { name: "Save action", exact: true }).click();
  await expect(section.getByText("Action changes saved.", { exact: true })).toBeVisible();
  // Inject only this definite rejection to exercise the browser feedback. Invalid
  // assignment enforcement is separately covered by the real API test suite.
  await page.route(`**/api/staff/tickets/${ticket.id}/actions/${actionId}/assignee`, route => route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: { code: "INVALID_ASSIGNEE", message: "Choose an active Staff account.", fields: { assigneeId: "Choose an active Staff account." } } }) }));
  await section.getByRole("button", { name: "Save assignment", exact: true }).click();
  await expect(section.getByText(/Action changes saved; assignment not saved/)).toBeVisible();
  await expect(section.getByLabel("Action assignee")).toHaveAttribute("aria-invalid", "true");
  await expect(section.getByLabel("Action assignee")).toHaveValue(/\d+/);
  await capture(page, info, "assignment-rejected-desktop");
  const current = await (await page.request.get(`${api}/api/tickets/${ticket.id}/actions`)).json();
  expect(current.items[0].description).toBe("These fields really saved before assignment failed");
  expect(current.items[0].assignee).toBeNull();
  const concurrent = await page.request.post(`${api}/api/staff/tickets/${ticket.id}/actions`, {
    headers: { "X-CSRF-Token": await csrf(page), Origin: new URL(page.url()).origin },
    data: { ticketVersion: current.ticketVersion, requestId: randomUUID(), assigneeId: null, actionAt: new Date().toISOString(), description: "Concurrent work", result: "", followUpRequired: false, followUpNote: "", attachmentNotes: "" },
  });
  expect(concurrent.status()).toBe(201);
  await section.getByLabel("Description", { exact: true }).fill("Keep this draft during conflict recovery");
  await section.getByRole("button", { name: "Save action", exact: true }).click();
  await expect(section.getByText(/This Ticket or action changed/)).toBeVisible();
  await expect(section.getByRole("button", { name: "Save assignment", exact: true })).toBeDisabled();
  await capture(page, info, "version-conflict-desktop");
  await section.getByRole("button", { name: "Reload and review" }).click();
  await expect(section.getByRole("button", { name: "Save action", exact: true })).toBeEnabled();
  await expect(section.getByLabel("Description", { exact: true })).toHaveValue("Keep this draft during conflict recovery");
});

test("action and audit paging open exact later records, and invalid deep links stay unavailable", async ({ page }) => {
  test.setTimeout(90_000);
  const ticket = await fixture(page), token = await csrf(page);
  let ticketVersion = 1, lastId = 0;
  for (let index = 0; index < 21; index++) {
    const response = await page.request.post(`${api}/api/staff/tickets/${ticket.id}/actions`, {
      headers: { "X-CSRF-Token": token, Origin: new URL(page.url()).origin },
      data: { ticketVersion, requestId: randomUUID(), assigneeId: null, actionAt: new Date().toISOString(), description: `Paged action ${index}`, result: "", followUpRequired: false, followUpNote: "", attachmentNotes: "" },
    });
    expect(response.status()).toBe(201);
    const receipt = await response.json(); ticketVersion = receipt.ticketVersion; lastId = receipt.actionId;
  }
  for (let index = 1; index <= 20; index++) {
    const response = await page.request.patch(`${api}/api/staff/tickets/${ticket.id}/actions/${lastId}`, {
      headers: { "X-CSRF-Token": token, Origin: new URL(page.url()).origin },
      data: { ticketVersion, version: index, requestId: randomUUID(), actionAt: new Date().toISOString(), description: `Paged revision ${index}`, result: "", followUpRequired: false, followUpNote: "", attachmentNotes: "", changeReason: "" },
    });
    expect(response.status()).toBe(200); ticketVersion = (await response.json()).ticketVersion;
  }
  await page.goto(`/staff/tickets/${ticket.id}?tab=actions&actionId=${lastId}`);
  const section = page.getByRole("region", { name: "Actions Taken", exact: true });
  await expect(section.getByRole("heading", { name: "Action 21", exact: true })).toBeFocused();
  await section.getByRole("button", { name: "Next actions" }).click();
  await expect(section.getByRole("button", { name: "View action 21" })).toBeVisible();
  await section.getByRole("button", { name: "Next history" }).click();
  await expect(section.getByText("History page 2 of 2 · 21 revisions")).toBeVisible();
  await page.goto(`/staff/tickets/${ticket.id}?tab=actions&actionId=2147483648`);
  await expect(section.getByText(/linked action is unavailable/)).toBeVisible();
  await expect(section.getByRole("button", { name: "Save action", exact: true })).toHaveCount(0);
});
