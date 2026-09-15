import { expect, test } from "@playwright/test";
import { E2E_PASSWORD, signIn } from "../support/auth.js";

test("failed logout retains the real session across reload, then retries successfully", async ({ page }) => {
  await signIn(page);
  await page.route("**/api/auth/logout", route => route.abort("failed"));
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Your session may still be active");
  await page.reload();
  await expect(page.getByText("Signed in · Requester")).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.unroute("**/api/auth/logout");
  await page.getByRole("button", { name: "Retry sign out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("a session revoked by a second login leaves protected pages and stays signed out on Back", async ({ page, browser }) => {
  await signIn(page);
  const other = await browser.newContext();
  try {
    const second = await other.newPage();
    await second.goto("http://127.0.0.1:5173/login");
    await signIn(second);
    await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Create Ticket", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByText("Signed in · Requester")).toHaveCount(0);
  } finally { await other.close(); }
});

test("a normal Requester changes their password and can sign in with it", async ({ page }) => {
  await signIn(page);
  await page.getByRole("button", { name: "Change password", exact: true }).click();
  await expect(page).toHaveURL(/\/change-password$/);
  await page.reload();
  const updated = "Updated-private-e2e-password-2026";
  async function change(current: string, next: string) {
    await page.getByLabel("Current password", { exact: true }).fill(current);
    await page.getByLabel("New password", { exact: true }).fill(next);
    await page.getByLabel("Confirm new password", { exact: true }).fill(next);
    await page.getByRole("button", { name: "Change password", exact: true }).click();
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
  }
  await change(E2E_PASSWORD, updated);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByLabel("Email").fill("anan.chaiyasit@example.test");
  await page.getByLabel("Password", { exact: true }).fill(updated);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
  await page.getByRole("button", { name: "Change password", exact: true }).click();
  await change(updated, E2E_PASSWORD);
});
