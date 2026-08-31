import { expect, test } from "@playwright/test";

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "mobile", width: 390, height: 844 },
];

for (const viewport of viewports) {
  test(`requester context remains usable at ${viewport.name} width`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/select-requester");

    const requesterSelect = page.getByRole("combobox", {
      name: /Development Requester/i,
    });
    const continueButton = page.getByRole("button", { name: "Continue" });

    await expect(requesterSelect).toBeEnabled();
    await expect(requesterSelect).toBeInViewport();
    await expect(continueButton).toBeInViewport();
    await expect
      .poll(() =>
        requesterSelect.evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).minHeight),
        ),
      )
      .toBeGreaterThanOrEqual(44);
    await expect
      .poll(() =>
        continueButton.evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).minHeight),
        ),
      )
      .toBeGreaterThanOrEqual(44);

    await requesterSelect.focus();
    await expect
      .poll(() =>
        requesterSelect.evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).outlineWidth),
        ),
      )
      .toBeGreaterThanOrEqual(3);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      )
      .toBe(true);

    await requesterSelect.selectOption({
      label: "Kanya Srisuk — kanya.srisuk@example.test",
    });
    await continueButton.click();

    await expect(page).toHaveURL(/\/tickets$/);
    await expect(
      page.getByRole("button", { name: "Change Requester" }),
    ).toBeInViewport();
    await expect(
      page.getByRole("heading", { name: "Requester context ready" }),
    ).toBeInViewport();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      )
      .toBe(true);

    const menu = page.getByRole("button", { name: "Menu" });
    const myTickets = page.getByRole("link", { name: "My Tickets" });
    const createTicket = page.getByRole("link", { name: "Create Ticket" });

    if (viewport.name === "mobile") {
      await expect(menu).toBeVisible();
      await expect(menu).toHaveAttribute("aria-expanded", "false");
      await expect(createTicket).toBeHidden();

      await menu.click();
      await expect(menu).toHaveAttribute("aria-expanded", "true");
      await expect(myTickets).toBeVisible();
      await expect(createTicket).toBeVisible();

      await createTicket.click();
      await expect(page).toHaveURL(/\/tickets\/new$/);
      await expect(menu).toHaveAttribute("aria-expanded", "false");

      await menu.click();
      await expect(createTicket).toBeVisible();
      await expect(createTicket).toHaveAttribute("aria-current", "page");
    } else {
      await expect(menu).toBeHidden();
      await expect(myTickets).toBeVisible();
      await expect(createTicket).toBeVisible();
      await expect(myTickets).toHaveAttribute("aria-current", "page");
    }
  });
}
