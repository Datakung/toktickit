import { expect, test } from "@playwright/test";
import { signIn } from "../support/auth.js";

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "mobile", width: 390, height: 844 },
];

for (const viewport of viewports) {
  test(`signed-in Requester context remains usable at ${viewport.name} width`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await signIn(page);
    const signOut = page.getByRole("button", { name: "Sign out" });
    await expect(signOut).toBeInViewport();
    await expect
      .poll(() =>
        signOut.evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).minHeight),
        ),
      )
      .toBeGreaterThanOrEqual(44);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      )
      .toBe(true);

    await expect(page).toHaveURL(/\/tickets$/);
    await expect(
      page.getByRole("heading", { name: "My Tickets" }),
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
    const navigation = page.getByRole("navigation", { name: "Primary navigation" });
    const myTickets = navigation.getByRole("link", { name: "My Tickets" });
    const createTicket = navigation.getByRole("link", { name: "Create Ticket" });

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
