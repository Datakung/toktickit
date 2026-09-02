import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

const committedScreenshotRoot = fileURLToPath(
  new URL("../../../artifacts/lab-02/screenshots/", import.meta.url),
);
const captureCommittedEvidence =
  process.env.npm_lifecycle_event === "test:e2e:evidence" ||
  process.env.LAB2_CAPTURE_EVIDENCE === "1";
const api = "http://127.0.0.1:3100";
const evidenceTicketNumber = "TKT-20260902-EVID01";

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "mobile", width: 390, height: 844 },
] as const;

async function expectNoHorizontalPageOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    root: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(dimensions.root).toBeLessThanOrEqual(dimensions.viewport);
  expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);
}

async function saveEvidence(
  page: Page,
  testInfo: TestInfo,
  relativePath: string,
) {
  const path = captureCommittedEvidence
    ? `${committedScreenshotRoot}${relativePath}`
    : testInfo.outputPath("responsive-evidence", relativePath);
  mkdirSync(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true, animations: "disabled" });
}

test("validates and captures Create, My Tickets, and Ticket Detail at all contract widths", async ({
  page,
  request,
}, testInfo) => {
  const requesters = await (await request.get(`${api}/api/development-requesters`)).json();
  const categories = await (await request.get(`${api}/api/categories`)).json();
  const requester = requesters[0] as { id: number; displayName: string };

  const ticketResponse = await request.get(
    `${api}/api/tickets?search=${encodeURIComponent(evidenceTicketNumber)}`,
    {
      headers: {
        "X-Development-Requester-Id": String(requester.id),
      },
    },
  );
  expect(ticketResponse.status()).toBe(200);
  const ticketList = (await ticketResponse.json()).data as Array<{
    id: number;
    ticketNumber: string;
  }>;
  expect(ticketList).toHaveLength(1);
  expect(ticketList[0].ticketNumber).toBe(evidenceTicketNumber);
  const ticket = ticketList[0];

  await page.goto("/select-requester");
  const requesterSelect = page.getByRole("combobox", { name: /Development Requester/i });
  await expect(requesterSelect).toBeEnabled();
  await requesterSelect.selectOption(String(requester.id));
  await page.getByRole("button", { name: "Continue" }).click();

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    await page.goto("/tickets/new");
    await expect(page.getByRole("heading", { name: "Create Ticket" })).toBeVisible();
    const category = page.getByLabel(/Category/);
    await expect(category).toBeVisible();
    await expect(category.locator("option", { hasText: categories[0].name })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Create Ticket" })).toBeVisible();
    await expectNoHorizontalPageOverflow(page);
    await saveEvidence(
      page,
      testInfo,
      `create-ticket/initial-${viewport.name}.png`,
    );

    await page.goto("/tickets");
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
    await page.getByRole("searchbox", { name: /Ticket Number or Summary/ })
      .fill(ticket.ticketNumber);
    await page.getByRole("button", { name: "Search" }).click();
    if (viewport.name === "mobile") {
      await expect(page.locator(".ticket-card-list")).toBeVisible();
      await expect(page.locator(".ticket-table-wrap")).toBeHidden();
      await expect(page.locator(".ticket-card-list")
        .getByRole("link", { name: ticket.ticketNumber })).toBeVisible();
    } else {
      await expect(page.locator(".ticket-table-wrap")).toBeVisible();
      await expect(page.locator(".ticket-table-wrap")
        .getByRole("link", { name: ticket.ticketNumber })).toBeVisible();
    }
    await expectNoHorizontalPageOverflow(page);
    await saveEvidence(
      page,
      testInfo,
      `my-tickets/requester-a-${viewport.name}.png`,
    );

    await page.goto(`/tickets/${ticket.id}`);
    await expect(page.getByRole("heading", { name: ticket.ticketNumber })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Attachments", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /Back to My Tickets/ })).toBeVisible();
    await expectNoHorizontalPageOverflow(page);
    await saveEvidence(
      page,
      testInfo,
      viewport.name === "desktop"
        ? "ticket-detail/owned-desktop.png"
        : `ticket-detail/${viewport.name}.png`,
    );
  }
});
