import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";
import { signIn } from "../support/auth.js";

async function selectRequesterAndOpenForm(page: import("@playwright/test").Page) {
  await signIn(page);
  const createTicketLink = page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Create Ticket" });
  if (!(await createTicketLink.isVisible())) {
    await page.getByRole("button", { name: "Menu" }).click();
  }
  await createTicketLink.click();
  await expect(page).toHaveURL(/\/tickets\/new$/);
  await expect(page.getByRole("heading", { name: "Create Ticket" })).toBeVisible();
}

test("creates one Ticket and displays its official number", async ({ page }) => {
  let createCalls = 0;
  let officialNumber = "";
  let createdId = 0;
  await page.route("**/api/tickets", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    createCalls += 1;
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    const { data } = await response.json(); officialNumber = data.ticketNumber; createdId = data.id;
    await route.fulfill({ response });
  });

  await selectRequesterAndOpenForm(page);
  await page.getByRole("button", { name: "Create Ticket" }).click();
  const invalidSummary = page.getByLabel(/Summary/);
  await expect(invalidSummary).toHaveAttribute("aria-invalid", "true");
  expect(await invalidSummary.evaluate((element) => getComputedStyle(element).borderColor))
    .toBe("rgb(155, 28, 28)");
  await page.getByLabel(/Category/).selectOption({ index: 1 });
  await page.getByLabel(/Related System/).selectOption({ index: 1 });
  await page.getByLabel(/Requested Priority/).selectOption("MEDIUM");
  await page.getByLabel(/Summary/).fill("Cannot connect to VPN");
  await page.getByLabel(/Description/).fill("The VPN gateway cannot be reached from home.");
  await page.getByRole("button", { name: "Create Ticket" }).dblclick();

  await expect(page).toHaveURL(/\/tickets\/\d+$/);
  expect(new URL(page.url()).pathname).toBe(`/tickets/${createdId}`);
  expect(officialNumber).toMatch(/^TKT-/);
  await expect(page.getByRole("heading", { name: officialNumber, exact: true })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Ticket created successfully." })).toBeVisible();
  await expect(page.getByRole("link", { name: /Back to My Tickets/ })).toBeVisible();
  expect(createCalls).toBe(1);
  await page.getByRole("link", { name: /Back to My Tickets/ }).click();
  await expect(page.getByRole("heading", { name: "My Tickets", exact: true })).toBeVisible();
  await page.goto(`/tickets/${createdId}`);
  await expect(page.getByRole("heading", { name: officialNumber, exact: true })).toBeVisible();
  await expect(page.getByText("Ticket created successfully.", { exact: true })).toHaveCount(0);
  expect(createCalls).toBe(1);
});

async function fillCreation(page: import("@playwright/test").Page, summary: string) {
  await page.getByLabel(/Category/).selectOption({ index: 1 });
  await page.getByLabel(/Related System/).selectOption({ index: 1 });
  await page.getByLabel(/Requested Priority/).selectOption("MEDIUM");
  await page.getByLabel(/Summary/).fill(summary);
  await page.getByLabel(/Description/).fill("Verify creation navigation and attachment outcomes without duplicate Tickets.");
}
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

test("redirects only after both initial attachments succeed", async ({ page }, info) => {
  let uploads = 0, release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/tickets/*/attachments", async route => {
    if (route.request().method() !== "POST") return route.continue();
    uploads++; if (uploads === 2) await gate; await route.continue();
  });
  await selectRequesterAndOpenForm(page); await fillCreation(page, `Navigation uploads ${Date.now()}`);
  await page.getByLabel("Choose files").setInputFiles([{ name: "one.png", mimeType: "image/png", buffer: png }, { name: "two.png", mimeType: "image/png", buffer: png }]);
  await page.getByRole("button", { name: "Create Ticket" }).click();
  try {
    await expect.poll(() => uploads).toBe(2);
    await expect(page).toHaveURL(/\/tickets\/new$/);
    await expect(page.getByRole("button", { name: "Uploading Attachments…" })).toBeDisabled();
    await expect(page.getByText("Ticket created successfully.", { exact: true })).toHaveCount(0);
  } finally { release(); }
  await expect(page).toHaveURL(/\/tickets\/\d+$/);
  await expect(page.getByText("Ticket created successfully.", { exact: true })).toBeVisible();
  for (const name of ["one.png", "two.png"]) await expect(page.locator(".detail-attachment-list > li").filter({ hasText: name })).toContainText("Active");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) <= innerWidth)).toBe(true);
    await page.locator(".ticket-detail-page").screenshot({ path: info.outputPath(`creation-success-${width}.png`), animations: "disabled" });
  }
});

test("upload failure shows failure instead of success, stays on form and opens the saved Ticket without duplicating it", async ({ page }, info) => {
  let creates = 0; let ticketId = 0;
  await page.route("**/api/tickets", async route => {
    if (route.request().method() !== "POST") return route.continue();
    creates++; const response = await route.fetch(); expect(response.status()).toBe(201);
    ticketId = (await response.json()).data.id; await route.fulfill({ response });
  });
  await page.route("**/api/tickets/*/attachments", route => route.request().method() === "POST"
    ? route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { code: "ATTACHMENT_UPLOAD_FAILED", message: "Upload failed. Try again from Ticket Detail." } }) }) : route.continue());
  await selectRequesterAndOpenForm(page); await fillCreation(page, `Navigation failure ${Date.now()}`);
  await page.getByLabel("Choose files").setInputFiles({ name: "retry.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Create Ticket" }).click();
  const failure = page.getByRole("alert"); await expect(failure).toContainText("Attachment upload failed");
  await expect(failure).toContainText("Your Ticket is saved"); await expect(page).toHaveURL(/\/tickets\/new$/);
  await expect(page.locator(".success-panel")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Ticket saved — attachment upload failed" })).toBeDisabled();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) <= innerWidth)).toBe(true);
    const recovery = failure.getByRole("link", { name: "Open Ticket to retry attachments" });
    await recovery.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    await expect(recovery).toBeFocused();
    expect(await recovery.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe("none");
    expect(await recovery.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    await failure.screenshot({ path: info.outputPath(`creation-failure-${width}.png`), animations: "disabled" });
  }
  await page.unroute("**/api/tickets/*/attachments");
  await page.getByRole("link", { name: "Open Ticket to retry attachments" }).click();
  await expect(page).toHaveURL(new RegExp(`/tickets/${ticketId}$`));
  await expect(page.getByText("Ticket created successfully.", { exact: true })).toHaveCount(0);
  await page.getByLabel("Choose file", { exact: true }).setInputFiles({ name: "retry.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Upload", exact: true }).click();
  await expect(page.getByText("retry.png uploaded successfully.", { exact: true })).toBeVisible(); expect(creates).toBe(1);
});

test("keeps the Create Ticket form within a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await selectRequesterAndOpenForm(page);

  await expect(page.getByLabel(/Category/)).toBeVisible();
  await expect(page.getByLabel(/Description/)).toBeVisible();
  const longName = `${"accessible-filename-".repeat(10)}.png`;
  await page.getByLabel("Choose files").setInputFiles({
    name: longName,
    mimeType: "image/png",
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
  });
  const attachmentName = page.locator(".attachment-name");
  await expect(attachmentName).toHaveText(longName);
  await expect(attachmentName).toHaveAttribute("title", longName);
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});
