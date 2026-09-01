import { expect, test } from "@playwright/test";

const requester = {
  id: 1,
  displayName: "Anan Chaiyasit",
  email: "anan.chaiyasit@example.test",
};

const ticketResponse = {
  data: [{
    id: 41,
    ticketNumber: "TKT-20260901-ABC123",
    summary: "Cannot connect to VPN",
    requestedPriority: "HIGH",
    itPriority: null,
    status: "NEW",
    createdAt: "2026-09-01T03:00:00.000Z",
    updatedAt: "2026-09-01T04:00:00.000Z",
    category: { id: 1, name: "Account and Access" },
    relatedSystem: { id: 2, name: "Network and VPN" },
  }],
  meta: {
    page: 1,
    pageSize: 10,
    totalItems: 1,
    totalPages: 1,
    search: "",
    filters: {
      categoryId: null,
      relatedSystemId: null,
      requestedPriority: null,
      status: null,
    },
    sort: "updatedAt",
    direction: "desc",
  },
};

async function mockMyTicketsApis(page: import("@playwright/test").Page) {
  await page.route("**/api/development-requesters", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify([requester]),
  }));
  await page.route("**/api/categories", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify([{ id: 1, name: "Account and Access" }]),
  }));
  await page.route("**/api/related-systems", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify([{ id: 2, name: "Network and VPN" }]),
  }));
  await page.route("**/api/tickets?**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(ticketResponse),
  }));
  await page.addInitScript(() => {
    sessionStorage.setItem("toktickit.developmentRequesterId", "1");
  });
}

test("uses the desktop Ticket table without horizontal page overflow", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockMyTicketsApis(page);
  await page.goto("/tickets");

  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
  await expect(page.locator(".ticket-table")).toBeVisible();
  await expect(page.locator(".ticket-card-list")).toBeHidden();
  expect(await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});

test("keeps My Tickets usable at the tablet viewport", async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await mockMyTicketsApis(page);
  await page.goto("/tickets");

  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: /Ticket Number or Summary/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /TKT-20260901-ABC123/ }).first()).toBeVisible();
  expect(await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});

test("uses touch-friendly Ticket cards at 390 px without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockMyTicketsApis(page);
  await page.goto("/tickets");

  await expect(page.locator(".ticket-table-wrap")).toBeHidden();
  await expect(page.locator(".ticket-card")).toBeVisible();
  await expect(page.getByRole("link", { name: /View Ticket TKT-/ })).toBeVisible();
  expect(await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});
