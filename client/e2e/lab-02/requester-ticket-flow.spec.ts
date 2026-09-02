import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";

const e2eApiUrl = "http://127.0.0.1:3100";

test("creates, finds, opens, attaches, downloads, removes, and protects a Requester Ticket", async ({ page }) => {
  const unique = Date.now().toString(36).toUpperCase();
  const summary = `Issue 15 browser lifecycle ${unique}`;

  await page.goto("/select-requester");
  const requesterSelect = page.getByRole("combobox", { name: /Development Requester/i });
  await expect(requesterSelect).toBeEnabled();
  await requesterSelect.selectOption({ index: 1 });
  const requesterId = await requesterSelect.inputValue();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Create Ticket" }).click();
  await page.getByLabel(/Category/).selectOption({ index: 1 });
  await page.getByLabel(/Related System/).selectOption({ index: 1 });
  await page.getByLabel(/Requested Priority/).selectOption("MEDIUM");
  await page.getByLabel(/Summary/).fill(summary);
  await page.getByLabel(/Description/).fill(
    "This Ticket verifies the owned detail and complete Attachment lifecycle.",
  );
  await page.getByLabel("Choose files").setInputFiles([
    {
      name: "initial-valid.png",
      mimeType: "image/png",
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
    },
    {
      name: "initial-invalid.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not an approved attachment"),
    },
  ]);
  await expect(page.getByText(/initial-invalid\.txt is not an allowed/i)).toBeVisible();
  await expect(page.getByText("initial-valid.png")).toBeVisible();
  await page.getByRole("button", { name: "Create Ticket" }).click();
  const ticketNumber = await page.locator(".success-panel h2").textContent();
  expect(ticketNumber).toMatch(/^TKT-/);
  const initialAttachment = page.locator(".attachment-list > li")
    .filter({ hasText: "initial-valid.png" });
  await expect(initialAttachment).toContainText("succeeded");

  await page.getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "My Tickets" }).click();
  await page.getByRole("searchbox", { name: /Ticket Number or Summary/ }).fill(summary);
  await page.getByRole("button", { name: "Search" }).click();
  const ticketLink = page.getByRole("link", { name: ticketNumber! }).first();
  await expect(ticketLink).toBeVisible();
  const href = await ticketLink.getAttribute("href");
  const ticketId = href?.match(/\/tickets\/(\d+)/)?.[1];
  expect(ticketId).toBeTruthy();
  await ticketLink.click();

  await expect(page.getByRole("heading", { name: ticketNumber! })).toBeVisible();
  await expect(page.getByText(summary)).toBeVisible();
  await page.getByLabel("Choose file").setInputFiles({
    name: "lifecycle.png",
    mimeType: "image/png",
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
  });
  const uploadResponsePromise = page.waitForResponse((response) =>
    response.request().method() === "POST" &&
    response.url().endsWith(`/api/tickets/${ticketId}/attachments`));
  await page.getByRole("button", { name: "Upload" }).click();
  const uploadResponse = await uploadResponsePromise;
  expect(uploadResponse.status()).toBe(201);
  const uploadedAttachmentId = (await uploadResponse.json()).data.id as number;
  await expect(page.getByText("lifecycle.png uploaded successfully.")).toBeVisible();

  const attachment = page.locator(".detail-attachment-list > li").filter({ hasText: "lifecycle.png" });
  await attachment.getByRole("button", { name: "Preview" }).click();
  await expect(page.getByRole("dialog", { name: "Preview lifecycle.png" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Preview of lifecycle.png" })).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();

  const downloadPromise = page.waitForEvent("download");
  await attachment.getByRole("button", { name: "Download" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("lifecycle.png");

  await attachment.getByRole("button", { name: "Remove" }).click();
  await page.getByLabel(/Removal reason/).fill("The lifecycle evidence is now outdated.");
  await page.getByRole("button", { name: "Confirm Remove" }).click();
  await expect(attachment.locator(".badge-removed")).toHaveText("Removed");
  await expect(attachment.getByRole("button", { name: "Preview" })).toHaveCount(0);
  await expect(attachment.getByRole("button", { name: "Download" })).toHaveCount(0);

  const removedDownload = await page.request.get(
    `${e2eApiUrl}/api/tickets/${ticketId}/attachments/${uploadedAttachmentId}/download`,
    { headers: { "X-Development-Requester-Id": requesterId } },
  );
  expect(removedDownload.status()).toBe(404);
  await expect(removedDownload.json()).resolves.toMatchObject({
    error: { code: "ATTACHMENT_NOT_FOUND" },
  });

  await page.getByRole("button", { name: "Change Requester" }).click();
  await requesterSelect.selectOption({ index: 2 });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.goto(`/tickets/${ticketId}`);
  await expect(page.getByRole("heading", { name: "Ticket unavailable" })).toBeVisible();
  await expect(page.getByText(summary)).toHaveCount(0);
});
