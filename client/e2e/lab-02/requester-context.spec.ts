import { expect, test } from "@playwright/test";

test("selects and changes the Development Requester context", async ({ page }) => {
  await page.goto("/select-requester");

  const requesterSelect = page.getByRole("combobox", {
    name: /Development Requester/i,
  });
  await expect(requesterSelect).toBeEnabled();
  await expect(requesterSelect.locator("option")).toHaveCount(5);

  await requesterSelect.selectOption({
    label: "Kanya Srisuk — kanya.srisuk@example.test",
  });
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page).toHaveURL(/\/tickets$/);
  await expect(
    page.getByRole("heading", { name: "Requester context ready" }),
  ).toBeVisible();
  await expect(page.getByText("Kanya Srisuk", { exact: true })).toHaveCount(2);
  await expect
    .poll(() =>
      page.evaluate(() =>
        sessionStorage.getItem("toktickit.developmentRequesterId"),
      ),
    )
    .toBeTruthy();

  await page.goBack();
  await expect(page).toHaveURL(/\/select-requester$/);
  await expect(requesterSelect).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Requester context ready" }),
  ).toBeHidden();

  await page.goForward();
  await expect(page).toHaveURL(/\/tickets$/);
  await expect(
    page.getByRole("heading", { name: "Requester context ready" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Change Requester" }).click();

  await expect(page).toHaveURL(/\/select-requester$/);
  await expect(requesterSelect).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        sessionStorage.getItem("toktickit.developmentRequesterId"),
      ),
    )
    .toBeNull();
});
