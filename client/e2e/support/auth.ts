import { expect, type Page } from "@playwright/test";

export const E2E_PASSWORD = "Lab3-e2e-password-2026";

export async function signIn(
  page: Page,
  email = "anan.chaiyasit@example.test",
) {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "My Dashboard" })).toBeVisible();
  // Existing list/workflow checks deliberately continue at their original destination.
  await page.goto("/tickets");
  await expect(page.getByRole("heading", { name: "My Tickets", exact: true })).toBeVisible();
}

export async function mockSignedInRequester(page: Page) {
  await page.route("**/api/auth/me", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      user: {
        id: 1,
        displayName: "Anan Chaiyasit",
        email: "anan.chaiyasit@example.test",
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
      },
      csrfToken: "mock-csrf-token",
    }),
  }));
}
