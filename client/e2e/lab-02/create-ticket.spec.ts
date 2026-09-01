import { expect, test } from "@playwright/test";

async function selectRequesterAndOpenForm(page: import("@playwright/test").Page) {
  await page.goto("/select-requester");
  const requester = page.getByRole("combobox", { name: /Development Requester/i });
  await expect(requester).toBeEnabled();
  await requester.selectOption({ index: 1 });
  await page.getByRole("button", { name: "Continue" }).click();
  const createTicketLink = page.getByRole("link", { name: "Create Ticket" });
  if (!(await createTicketLink.isVisible())) {
    await page.getByRole("button", { name: "Menu" }).click();
  }
  await createTicketLink.click();
  await expect(page).toHaveURL(/\/tickets\/new$/);
  await expect(page.getByRole("heading", { name: "Create Ticket" })).toBeVisible();
}

test("creates one Ticket and displays its official number", async ({ page }) => {
  let createCalls = 0;
  await page.route("**/api/tickets", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    createCalls += 1;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          id: 101,
          ticketNumber: "TKT-20260901-E2E001",
          requesterId: 1,
          status: "NEW",
          createdAt: "2026-09-01T03:00:00.000Z",
        },
      }),
    });
  });

  await selectRequesterAndOpenForm(page);
  await page.getByLabel(/Category/).selectOption({ index: 1 });
  await page.getByLabel(/Related System/).selectOption({ index: 1 });
  await page.getByLabel(/Requested Priority/).selectOption("MEDIUM");
  await page.getByLabel(/Summary/).fill("Cannot connect to VPN");
  await page.getByLabel(/Description/).fill("The VPN gateway cannot be reached from home.");
  await page.getByRole("button", { name: "Create Ticket" }).dblclick();

  await expect(page.getByRole("heading", { name: "TKT-20260901-E2E001" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ticket created" })).toBeDisabled();
  expect(createCalls).toBe(1);
});

test("keeps the Create Ticket form within a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await selectRequesterAndOpenForm(page);

  await expect(page.getByLabel(/Category/)).toBeVisible();
  await expect(page.getByLabel(/Description/)).toBeVisible();
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});
