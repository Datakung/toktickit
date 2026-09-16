import { expect, test, type Page } from "@playwright/test";
import { E2E_PASSWORD, signIn } from "../support/auth.js";

async function signInStaff(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("mali.support@example.test");
  await page.getByLabel("Password", { exact: true }).fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/staff\/tickets$/);
  await expect(page.getByRole("heading", { name: "Ticket Queue", exact: true })).toBeVisible();
}

test("Staff searches, combines filters, sorts, paginates and opens the detail destination", async ({ page }) => {
  await signInStaff(page);
  await page.getByLabel("Ticket Number or Summary").fill("Staff queue fixture");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("12 tickets");
  await expect(page.locator(".queue-table tbody tr")).toHaveCount(10);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Page 2 of 2");
  await expect(page.locator(".queue-table tbody tr")).toHaveCount(2);
  await page.getByLabel("Tickets per page").selectOption("20");
  await expect(page.getByRole("status")).toContainText("Page 1 of 1");
  await page.getByLabel("Sort by").selectOption("itPriority");
  await page.getByLabel("Direction").selectOption("asc");
  await expect(page.locator('.queue-table tbody tr').first().locator('[data-label="IT Priority"]')).toHaveText("LOW");
  await page.getByLabel("Assignment", { exact: true }).selectOption("true");
  await expect(page.getByRole("status")).toContainText("6 tickets");
  await page.getByLabel("Status", { exact: true }).selectOption("NEW");
  await page.getByLabel("IT Priority", { exact: true }).selectOption("LOW");
  await expect(page.getByRole("status")).toContainText("1 tickets");
  await expect(page.getByRole("cell", { name: "Unassigned", exact: true })).toBeVisible();
  await page.getByRole("link", { name: /^Open TKT-/ }).click();
  await expect(page).toHaveURL(/\/staff\/tickets\/\d+$/);
  await expect(page.getByRole("button", { name: "Back to Ticket Queue" })).toBeVisible();
  await page.getByRole("button", { name: "Back to Ticket Queue" }).click();
  await page.getByLabel("Ticket Number or Summary").fill("No matching queue fixture");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByText("No tickets match these filters.")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(page.getByRole("status")).not.toContainText("0 tickets");
});

for (const width of [1440, 768, 390]) {
  test(`Staff queue fits ${width}px with labels and keyboard focus`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await signInStaff(page);
    await expect(page.getByRole("heading", { name: "Ticket Queue", exact: true })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Ticket Number or Summary")).toBeFocused();
    await page.getByLabel("Ticket Number or Summary").fill("Staff queue fixture");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("12 tickets");
    await expect(page.locator(".queue-table")).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`staff-queue-${width}.png`), fullPage: true });
  });
}

test("Requester cannot navigate or read the shared Staff queue", async ({ page }) => {
  await signIn(page);
  await page.goto("/staff/tickets");
  await expect(page.getByRole("heading", { name: "Access denied" })).toBeVisible();
  const response = await page.request.get("http://127.0.0.1:3100/api/staff/tickets");
  expect(response.status()).toBe(403);
  expect(JSON.stringify(await response.json())).not.toContain("Staff queue fixture");
});
