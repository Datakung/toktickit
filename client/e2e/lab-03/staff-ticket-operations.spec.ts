import { expect, test, type Page } from "@playwright/test";
import { E2E_PASSWORD } from "../support/auth.js";

const operationsTicket = "TKT-20260916-QUEUE01";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(email === "mali.support@example.test" ? /\/staff\/tickets$/ : /\/tickets$/);
}

async function openOperationsTicket(page: Page) {
  await expect(page).toHaveURL(/\/staff\/tickets$/);
  await page.getByLabel("Ticket Number or Summary").fill(operationsTicket);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("link", { name: `Open ${operationsTicket}` }).click();
  await expect(page.getByRole("heading", { name: operationsTicket })).toBeVisible();
}

test("Staff operates a Ticket and communicates without exposing Internal Notes", async ({ page }) => {
  await login(page, "mali.support@example.test");
  await openOperationsTicket(page);
  const staffUrl = page.url();
  const ticketId = Number(new URL(staffUrl).pathname.split("/").at(-1));

  await page.getByRole("button", { name: "Claim Ticket" }).click();
  await expect(page.getByRole("status")).toContainText("Claim saved");
  await expect(page.getByText("Mali Support", { exact: true }).first()).toBeVisible();

  await page.getByLabel("IT Priority", { exact: true }).selectOption("HIGH");
  await page.getByRole("button", { name: "Save IT Priority" }).click();
  await expect(page.getByRole("status")).toContainText("IT Priority saved");

  await page.getByLabel("Status", { exact: true }).selectOption("OPEN");
  await page.getByRole("button", { name: "Save Status" }).click();
  await expect(page.getByRole("status")).toContainText("Status saved");
  await expect(page.getByText("Open", { exact: true }).first()).toBeVisible();

  const comments = page.locator("section.communication-panel").filter({ has: page.getByRole("heading", { name: "Public Comments" }) });
  await comments.getByLabel("Add a Public Comment").fill("Staff update visible to the requester.");
  await comments.getByRole("button", { name: "Post", exact: true }).click();
  await expect(comments.getByText("Staff update visible to the requester.")).toBeVisible();

  const notes = page.locator("section.communication-panel").filter({ has: page.getByRole("heading", { name: "Internal Notes" }) });
  await notes.getByLabel("Add an Internal Note").fill("Private diagnostic evidence for Staff only.");
  await notes.getByRole("button", { name: "Post", exact: true }).click();
  await expect(notes.getByText("Private diagnostic evidence for Staff only.")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download", exact: true }).click();
  expect((await downloadPromise).suggestedFilename()).toBe("issue-29-evidence.png");

  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await login(page, "kanya.srisuk@example.test");
  await page.goto(`/tickets/${ticketId}`);
  await expect(page.getByRole("heading", { name: operationsTicket })).toBeVisible();
  await expect(page.getByText("Staff update visible to the requester.")).toBeVisible();
  await expect(page.getByText("Private diagnostic evidence for Staff only.")).toHaveCount(0);
  const privateResponse = await page.request.get(`http://127.0.0.1:3100/api/staff/tickets/${ticketId}/notes`);
  expect(privateResponse.status()).toBe(403);

  await page.getByRole("button", { name: "Problem Appears Resolved" }).click();
  await expect(page.getByText(/You indicated apparent resolution/)).toBeVisible();
  await expect(page.getByText("Open", { exact: true }).first()).toBeVisible();
});

for (const width of [1440, 768, 390]) {
  test(`Staff Ticket Detail fits ${width}px without horizontal overflow`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await login(page, "mali.support@example.test");
    await openOperationsTicket(page);
    await expect(page.getByRole("heading", { name: operationsTicket })).toBeFocused();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`staff-ticket-detail-${width}.png`), fullPage: true });
  });
}
