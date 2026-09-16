import { expect, test, type Page } from "@playwright/test";
import { E2E_PASSWORD } from "../support/auth.js";

async function login(page: Page, email = "admin@example.test", password = E2E_PASSWORD) {
  await page.goto("/login"); await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
test("Admin creates, edits, deactivates, activates and resets a real account", async ({ page, browser }) => {
  await login(page); await expect(page.getByRole("heading", { name: "Users", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Create user", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Lab3 Browser Person");
  await page.getByLabel("Email", { exact: true }).fill("browser-person@admin-e2e.example.test");
  await page.getByLabel("Initial password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Save user" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Account saved" })).toBeVisible();
  await page.getByRole("button", { name: "Edit Lab3 Browser Person" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Lab3 Updated Person");
  await page.getByLabel("Status", { exact: true }).selectOption("false");
  await page.getByRole("checkbox").check(); await page.getByRole("button", { name: "Save user" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Account saved" })).toBeVisible();
  const context = await browser.newContext(); const other = await context.newPage();
  try {
    await other.goto("http://127.0.0.1:5173/login");
    await login(other, "browser-person@admin-e2e.example.test");
    await expect(other.getByRole("alert")).toContainText("Email or password is incorrect");
    await page.getByLabel("Name or email").fill("Lab3 Updated Person");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.getByLabel("Role filter").selectOption("REQUESTER");
    await page.getByLabel("Status filter").selectOption("true");
    await expect(page.getByText("No users match these filters.")).toBeVisible();
    await page.getByLabel("Status filter").selectOption("false");
    await page.getByRole("button", { name: "Edit Lab3 Updated Person" }).click();
    await page.getByLabel("Status", { exact: true }).selectOption("true"); await page.getByRole("button", { name: "Save user" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Account saved" })).toBeVisible();
    await expect(page.getByText("No users match these filters.")).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page.getByLabel("Status filter")).toHaveValue("");
    await page.getByRole("button", { name: "Reset password for Lab3 Updated Person" }).click();
    await page.getByLabel("Initial password", { exact: true }).fill("Reset-browser-password-2026");
    await page.getByRole("checkbox").check(); await page.getByRole("button", { name: "Confirm password reset" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Initial password reset" })).toBeVisible();
    await login(other, "browser-person@admin-e2e.example.test", "Reset-browser-password-2026");
    await expect(other.getByRole("heading", { name: "Change your password" })).toBeVisible();
    await other.goto("http://127.0.0.1:5173/admin/users");
    await expect(other.getByRole("heading", { name: "Change your password" })).toBeVisible();
  } finally { await context.close(); }
});
for (const width of [1440, 768, 390]) {
  test(`Administrator list and editor fit ${width}px with keyboard focus`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 }); await login(page);
    await expect(page.getByRole("heading", { name: "Users", exact: true })).toBeFocused();
    await page.getByRole("button", { name: "Create user", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Create user", exact: true })).toBeFocused();
    await page.keyboard.press("Tab"); await expect(page.getByLabel("Name", { exact: true })).toBeFocused();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`admin-${width}.png`), fullPage: true });
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByRole("button", { name: "Create user", exact: true })).toBeFocused();
  });
}
