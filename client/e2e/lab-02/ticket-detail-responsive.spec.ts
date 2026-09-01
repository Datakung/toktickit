import { expect, test } from "@playwright/test";

const requester = {
  id: 1,
  displayName: "Anan Chaiyasit",
  email: "anan.chaiyasit@example.test",
};

const detail = {
  id: 41,
  ticketNumber: "TKT-20260901-ABC123",
  requester,
  category: { id: 1, name: "Hardware" },
  relatedSystem: { id: 2, name: "Student Information System" },
  summary: "Laptop screen flickers after sleep",
  description: "The screen flickers after the laptop resumes from sleep.",
  requestedPriority: "HIGH",
  itPriority: null,
  status: "NEW",
  createdAt: "2026-09-01T03:00:00.000Z",
  updatedAt: "2026-09-01T04:00:00.000Z",
  attachments: [{
    id: 21,
    ticketId: 41,
    originalName: `${"very-long-accessible-filename-".repeat(8)}.png`,
    mimeType: "image/png",
    sizeBytes: 2048,
    createdAt: "2026-09-01T03:10:00.000Z",
    removed: false,
    removedAt: null,
    removalReason: null,
    removedByRequesterId: null,
  }],
};

async function mockDetail(page: import("@playwright/test").Page) {
  await page.route("**/api/development-requesters", (route) => route.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify([requester]),
  }));
  await page.route("**/api/tickets/41", (route) => route.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify({ data: detail }),
  }));
  await page.addInitScript(() => {
    sessionStorage.setItem("toktickit.developmentRequesterId", "1");
  });
}

for (const viewport of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`keeps Ticket Detail usable at the ${viewport.name} viewport`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await mockDetail(page);
    await page.goto("/tickets/41");

    await expect(page.getByRole("heading", { name: detail.ticketNumber })).toBeVisible();
    await expect(page.getByText(detail.attachments[0].originalName)).toBeVisible();
    expect(await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);

    await page.getByRole("button", { name: "Remove" }).click();
    const dialog = page.getByRole("dialog", { name: /Remove .*\.png\?/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel(/Removal reason/)).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Confirm Remove" })).toBeVisible();
    expect(await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });
}
