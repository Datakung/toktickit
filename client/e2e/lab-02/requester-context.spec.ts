import { expect, test } from "@playwright/test";
import { signIn } from "../support/auth.js";

test("signs in and signs out of the Requester session", async ({ page }) => {
  await signIn(page, "kanya.srisuk@example.test");
  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
  await expect(page.getByText("Kanya Srisuk", { exact: true })).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  await page.goto("/tickets");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});
