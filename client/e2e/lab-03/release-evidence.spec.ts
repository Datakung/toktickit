import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { E2E_PASSWORD } from "../support/auth.js";

const screenshotRoot = fileURLToPath(new URL("../../../artifacts/lab-03/screenshots/", import.meta.url));
const persistent = process.env.npm_lifecycle_event === "test:e2e:lab3-evidence" || process.env.LAB3_CAPTURE_EVIDENCE === "1";
const api = "http://127.0.0.1:3100";
const ticketNumber = "TKT-20260902-EVID01";
const widths = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
] as const;

async function capture(page: Page, info: TestInfo, path: string) {
  await expect.poll(() => page.evaluate(() =>
    document.documentElement.scrollWidth <= window.innerWidth && document.body.scrollWidth <= window.innerWidth,
  )).toBe(true);
  const size = await page.evaluate(() => ({
    viewport: window.innerWidth,
    root: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(size.root, `${path}: root overflows`).toBeLessThanOrEqual(size.viewport);
  expect(size.body, `${path}: body overflows`).toBeLessThanOrEqual(size.viewport);
  const destination = persistent ? `${screenshotRoot}${path}` : info.outputPath("lab3-evidence", path);
  mkdirSync(dirname(destination), { recursive: true });
  await page.screenshot({ path: destination, fullPage: true, animations: "disabled" });
}

async function captureRegion(locator: Locator, info: TestInfo, path: string) {
  const destination = persistent ? `${screenshotRoot}${path}` : info.outputPath("lab3-evidence", path);
  mkdirSync(dirname(destination), { recursive: true });
  await expect(locator).toBeVisible();
  await locator.screenshot({ path: destination, animations: "disabled" });
}

async function login(page: Page, email: string, password = E2E_PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
}

test("captures integrated Lab 3 role, workflow, feedback and responsive evidence", async ({ page }, info) => {
  for (const width of widths) {
    await page.setViewportSize({ width: width.width, height: width.height });
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await capture(page, info, `authentication/login-${width.name}.png`);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, "unknown.evidence@example.test", "incorrect-password");
  await expect(page.getByRole("alert")).toContainText("Email or password is incorrect");
  await capture(page, info, "authentication/invalid-login-desktop.png");

  await login(page, "admin@example.test");
  await expect(page.getByRole("heading", { name: "Users", exact: true })).toBeVisible();
  for (const width of widths) {
    await page.setViewportSize({ width: width.width, height: width.height });
    await capture(page, info, `user-management/users-${width.name}.png`);
    await captureRegion(page.locator(".admin-table tbody tr").first(), info, `user-management/user-row-${width.name}.png`);
    await page.getByRole("button", { name: "Create user", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Create user", exact: true })).toBeVisible();
    await capture(page, info, `user-management/create-${width.name}.png`);
    await captureRegion(page.locator(".admin-editor"), info, `user-management/create-form-${width.name}.png`);
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Create user", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Lab 3 Evidence User");
  await page.getByLabel("Email", { exact: true }).fill("lab3.evidence@example.test");
  await page.getByLabel("Initial password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Save user" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Account saved" })).toBeVisible();
  await page.getByRole("button", { name: "Create user", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Duplicate Evidence User");
  await page.getByLabel("Email", { exact: true }).fill("lab3.evidence@example.test");
  await page.getByLabel("Initial password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Save user" }).click();
  await expect(page.getByRole("alert")).toContainText("already in use");
  await capture(page, info, "user-management/duplicate-email-desktop.png");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await signOut(page);

  await login(page, "lab3.evidence@example.test");
  await expect(page.getByRole("heading", { name: "Change your password" })).toBeVisible();
  for (const width of widths) {
    await page.setViewportSize({ width: width.width, height: width.height });
    await capture(page, info, `authentication/mandatory-change-${width.name}.png`);
  }
  await signOut(page);

  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, "mali.support@example.test");
  await expect(page.getByRole("heading", { name: "Ticket Queue", exact: true })).toBeVisible();
  for (const width of widths) {
    await page.setViewportSize({ width: width.width, height: width.height });
    await capture(page, info, `staff-queue/queue-${width.name}.png`);
    await captureRegion(page.locator(".queue-filters"), info, `staff-queue/filters-${width.name}.png`);
    await captureRegion(page.locator(".queue-table tbody tr").first(), info, `staff-queue/ticket-row-${width.name}.png`);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByLabel("Ticket Number or Summary").fill("no-such-release-evidence-ticket");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByText("No tickets match these filters.")).toBeVisible();
  await capture(page, info, "staff-queue/no-results-desktop.png");
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByLabel("Ticket Number or Summary").fill(ticketNumber);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  let releaseCommunication!: () => void;
  const communicationGate = new Promise<void>(resolve => { releaseCommunication = resolve; });
  await page.route(/\/api\/(?:staff\/tickets\/\d+\/notes|tickets\/\d+\/comments)\?/, async route => {
    if (route.request().method() === "GET") await communicationGate;
    await route.continue();
  });
  await page.getByRole("link", { name: `Open ${ticketNumber}` }).click();
  await expect(page.getByRole("heading", { name: ticketNumber })).toBeVisible();
  const ticketId = Number(new URL(page.url()).pathname.split("/").at(-1));
  try {
    await expect(page.getByRole("status").filter({ hasText: "Loading Public Comments" })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Loading Internal Notes" })).toBeVisible();
    await page.getByRole("button", { name: "Claim Ticket" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Claim saved" })).toBeVisible();
    await page.getByLabel("IT Priority", { exact: true }).selectOption("HIGH");
    await page.getByRole("button", { name: "Save IT Priority" }).click();
    await expect(page.getByRole("status").filter({ hasText: "IT Priority saved" })).toBeVisible();
    await page.getByLabel("Status", { exact: true }).selectOption("OPEN");
    await page.getByRole("button", { name: "Save Status" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Status saved" })).toBeVisible();
  } finally {
    releaseCommunication();
  }
  await expect(page.getByRole("status").filter({ hasText: "Loading Public Comments" })).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "Loading Internal Notes" })).toHaveCount(0);
  await page.unroute(/\/api\/(?:staff\/tickets\/\d+\/notes|tickets\/\d+\/comments)\?/);
  const comments = page.locator("section.communication-panel").filter({ has: page.getByRole("heading", { name: "Public Comments" }) });
  const notes = page.locator("section.communication-panel").filter({ has: page.getByRole("heading", { name: "Internal Notes" }) });
  await comments.getByLabel("Add a Public Comment").fill("Service desk is investigating the reported issue.");
  await comments.getByRole("button", { name: "Post" }).click();
  await expect(comments.getByText("Service desk is investigating the reported issue.")).toBeVisible();
  await notes.getByLabel("Add an Internal Note").fill("Private diagnostic plan for the service desk.");
  await notes.getByRole("button", { name: "Post" }).click();
  await expect(notes.getByText("Private diagnostic plan for the service desk.")).toBeVisible();
  for (const width of widths) {
    await page.setViewportSize({ width: width.width, height: width.height });
    await capture(page, info, `staff-ticket-detail/detail-${width.name}.png`);
    await captureRegion(page.locator(".operation-grid"), info, `staff-ticket-detail/operations-${width.name}.png`);
    await captureRegion(comments, info, `staff-ticket-detail/public-comments-${width.name}.png`);
    await captureRegion(notes, info, `staff-ticket-detail/internal-notes-${width.name}.png`);
  }
  await signOut(page);

  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, "anan.chaiyasit@example.test");
  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
  for (const width of widths) {
    await page.setViewportSize({ width: width.width, height: width.height });
    await page.goto("/tickets");
    await page.getByRole("searchbox", { name: /Ticket Number or Summary/ }).fill(ticketNumber);
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByRole("link", { name: ticketNumber })).toBeVisible();
    await capture(page, info, `requester/my-tickets-${width.name}.png`);
    await page.goto("/tickets/new");
    await expect(page.getByRole("heading", { name: "Create Ticket" })).toBeVisible();
    await capture(page, info, `requester/create-ticket-${width.name}.png`);
    await page.goto(`/tickets/${ticketId}`);
    await expect(page.getByRole("heading", { name: ticketNumber })).toBeVisible();
    await expect(page.getByText("Service desk is investigating the reported issue.")).toBeVisible();
    await expect(page.getByText("Private diagnostic plan for the service desk.")).toHaveCount(0);
    await capture(page, info, `requester/ticket-detail-${width.name}.png`);
    await captureRegion(page.locator("section.communication-panel"), info, `requester/public-comments-${width.name}.png`);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  const noteResponse = await page.request.get(`${api}/api/staff/tickets/${ticketId}/notes`);
  expect(noteResponse.status()).toBe(403);
  expect(JSON.stringify(await noteResponse.json())).not.toContain("Private diagnostic plan");
  console.log(`Authorization evidence: Requester GET /api/staff/tickets/${ticketId}/notes -> 403; private note text absent.`);
  await page.getByRole("button", { name: "Problem Appears Resolved" }).click();
  await expect(page.getByText(/You indicated apparent resolution/)).toBeVisible();
  await capture(page, info, "requester/resolution-indication-desktop.png");
  await page.goto("/staff/tickets");
  await expect(page.getByRole("heading", { name: "Access denied" })).toBeVisible();
  await capture(page, info, "requester/staff-access-denied-desktop.png");
});
