import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { E2E_PASSWORD } from "../support/auth.js";
const api = "http://127.0.0.1:3100";
const evidenceRoot = fileURLToPath(new URL("../../../artifacts/lab-04/screenshots/dashboards/", import.meta.url));
async function login(page: Page, email: string, staff: boolean) {
  await page.goto("/login"); await page.getByLabel("Email", { exact: true }).fill(email); await page.getByLabel("Password", { exact: true }).fill(E2E_PASSWORD); await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(staff ? /\/staff\/dashboard$/ : /\/dashboard$/); await expect(page.locator(".dashboard-snapshot")).toBeVisible();
}
async function capture(page: Page, info: TestInfo, name: string, selector?: string) {
  await expect.poll(() => page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) <= innerWidth)).toBe(true);
  const destination = process.env.DASHBOARD_EVIDENCE === "1" || process.env.npm_lifecycle_event === "test:e2e:lab4-dashboard-evidence" ? `${evidenceRoot}${name}.png` : info.outputPath(`${name}.png`); mkdirSync(dirname(destination), { recursive: true });
  if (selector) await page.locator(selector).screenshot({ path: destination, animations: "disabled" });
  else await page.screenshot({ path: destination, fullPage: true, animations: "disabled" });
}
test("Requester snapshot links match owned lists, keep captured range after reload and Back, and recover refresh", async ({ page }, info) => {
  await login(page, "dashboard.requester@example.test", false);
  const data = await (await page.request.get(`${api}/api/dashboard/requester`)).json();
  for (const key of ["activeTickets", "waitingForMe", "recentlyUpdated", "recentlyResolved"]) {
    const list = await page.request.get(`${api}/api${data.drillDown[key]}`); expect(list.status()).toBe(200); expect((await list.json()).meta.totalItems).toBe(data.metrics[key]);
  }
  for (const width of [1920, 1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.locator(".app-layout").evaluate(el => getComputedStyle(el).fontSize)).toBe("15px");
    expect(await page.locator(".metric-value").first().evaluate(el => getComputedStyle(el).fontSize)).toBe("36px");
    expect(await page.locator(".dashboard-page h1").evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeLessThanOrEqual(40);
    const quickActions = await page.locator(".dashboard-quick-actions a").evaluateAll(links => links.map(el => ({ height: el.getBoundingClientRect().height, marginTop: getComputedStyle(el).marginTop, decoration: getComputedStyle(el).textDecorationLine })));
    expect(quickActions).toHaveLength(2);
    for (const button of quickActions) { expect(button.height).toBeGreaterThanOrEqual(44); expect(button.marginTop).toBe("0px"); expect(button.decoration).toBe("none"); }
    expect(Math.abs(quickActions[0].height - quickActions[1].height)).toBeLessThan(1);
    await capture(page, info, `requester-${width}`);
  }
  const rangeLink = page.getByRole("link", { name: /Updated in Last Seven Days/ }), href = await rangeLink.getAttribute("href"); await rangeLink.click();
  await expect(page.getByRole("heading", { name: "My Tickets", exact: true })).toBeVisible(); await expect(page.getByText(/Captured dashboard range/)).toBeVisible();
  expect(new URL(page.url()).search).toBe(new URL(href!, "http://local").search); await page.reload(); await expect(page.getByText(/Captured dashboard range/)).toBeVisible();
  await page.goBack(); await expect(page.getByRole("heading", { name: "My Dashboard" })).toBeVisible();
  await page.route("**/api/dashboard/requester", route => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { code: "DASHBOARD_LOAD_FAILED", message: "Unavailable" } }) }));
  await page.getByRole("button", { name: "Refresh dashboard" }).click(); await expect(page.getByRole("alert")).toContainText("Not refreshed"); await expect(page.locator(".dashboard-metrics")).toBeVisible(); await capture(page, info, "requester-refresh-failed-390");
  await page.unroute("**/api/dashboard/requester"); await page.getByRole("button", { name: "Retry dashboard" }).click(); await expect(page.getByRole("alert")).toHaveCount(0);
  await page.goto("/staff/dashboard"); await expect(page.getByRole("heading", { name: "Access denied" })).toBeVisible();
});
for (const email of ["mali.support@example.test", "admin@example.test"]) test(`Staff metrics and assigned-work destination for ${email}`, async ({ page }, info) => {
  await login(page, email, true); const data = await (await page.request.get(`${api}/api/dashboard/staff`)).json();
  for (const key of ["unassignedTickets", "myTickets", "myAssignedActions"]) { const result = await page.request.get(`${api}/api${data.drillDown[key]}`); expect(result.status()).toBe(200); expect((await result.json()).total).toBe(data.metrics[key]); }
  for (const group of ["statusCounts", "priorityCounts"]) for (const key of Object.keys(data.metrics[group])) { const result = await page.request.get(`${api}/api${data.drillDown[group][key]}`); expect((await result.json()).total).toBe(data.metrics[group][key]); }
  expect(data.recentTickets.length).toBeLessThanOrEqual(5); expect(data.recentPerformedActions.length).toBeLessThanOrEqual(5);
  for (const action of data.recentPerformedActions) {
    const link = page.getByRole("link", { name: new RegExp(`${action.ticketNumber} · Action ${action.actionNumber} `) });
    await expect(link).toHaveAttribute("href", `/staff/tickets/${action.ticketId}?tab=actions&actionId=${action.id}`);
  }
  if (email.startsWith("mali")) for (const width of [1920, 1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    if (width > 1100) {
      const tops = await page.locator(".metric-value").evaluateAll(items => items.map(el => el.getBoundingClientRect().top));
      for (const top of tops) expect(Math.abs(top - tops[0])).toBeLessThan(1);
      const gaps = await page.locator(".metric-card").evaluateAll(cards => cards.map(card => card.querySelector(".metric-value")!.getBoundingClientRect().top - card.querySelector(".metric-label")!.getBoundingClientRect().bottom));
      for (const gap of gaps) expect(gap).toBeLessThanOrEqual(7);
      const headings = await page.locator(".dashboard-section-heading").evaluateAll(items => items.map(item => {
        const title = item.querySelector("h2")!.getBoundingClientRect(), link = item.querySelector("a")!.getBoundingClientRect();
        return { overlap: Math.min(title.bottom, link.bottom) - Math.max(title.top, link.top), text: item.querySelector("a")!.textContent };
      }));
      for (const heading of headings) { expect(heading.overlap).toBeGreaterThan(0); expect(heading.text).toBe("View all"); }
    }
    await capture(page, info, `staff-${width}`);
  }
  await expect(page.getByRole("link", { name: "Create Ticket", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: /My Assigned Actions/ }).click(); await expect(page.getByRole("heading", { name: "My Actions", exact: true })).toBeVisible(); await expect(page.getByText(/Active current-cycle work/)).toBeVisible(); await expect(page.getByRole("status").filter({ hasText: /\d+ actions/ })).toBeVisible();
  if (email.startsWith("mali")) { const caption = await page.locator(".queue-table caption").boundingBox(), table = await page.locator(".queue-table").boundingBox(); expect(caption!.width).toBeGreaterThanOrEqual(table!.width - 2); }
  await capture(page, info, email.startsWith("mali") ? "assigned-work-390" : "admin-work-desktop");
  await page.reload(); await expect(page).toHaveURL(/assignedTo=me&stateGroup=active/); await page.goBack(); await expect(page.getByRole("heading", { name: "Staff Dashboard" })).toBeVisible();
  if (email.startsWith("mali")) {
    await page.getByRole("link", { name: /TKT-20261010-DASH03 · Action/ }).click(); await expect(page.locator(".action-record")).toBeVisible(); await expect(page.locator(".action-record")).toContainText("Dashboard action 3");
    await expect(page.locator(".action-record").getByRole("heading", { name: "Action 1", exact: true })).toBeFocused();
    await page.goto("/staff/dashboard"); await expect(page.locator(".dashboard-snapshot")).toBeVisible();
  }
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.getByRole("link", { name: /My Active Tickets/ }).focus();
  expect(await page.getByRole("link", { name: /My Active Tickets/ }).evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe("none");
  for (const box of await page.locator(".dashboard-page a").evaluateAll(links => links.map(el => ({ height: el.getBoundingClientRect().height })))) expect(box.height).toBeGreaterThanOrEqual(44);
});
test("empty Requester and forbidden dashboard show honest feedback without leaked counts", async ({ page }, info) => {
  await login(page, "dashboard.empty@example.test", false); await expect(page.getByRole("link", { name: /Active Tickets 0/ })).toBeVisible(); await expect(page.getByText("No Tickets waiting for you.")).toBeVisible(); await capture(page, info, "requester-empty-desktop");
  await page.route("**/api/dashboard/requester", route => route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: { code: "FORBIDDEN", message: "Forbidden" } }) }));
  await page.getByRole("button", { name: "Refresh dashboard" }).click(); await expect(page.getByRole("alert")).toContainText("Your role cannot open"); await expect(page.locator(".dashboard-metrics")).toHaveCount(0); await capture(page, info, "requester-forbidden-desktop");
});

test("work lists keep desktop labels on one line and action progress controls aligned", async ({ page }, info) => {
  await login(page, "mali.support@example.test", true);
  for (const kind of ["assigned", "performed"]) {
    const path = kind === "assigned" ? "/staff/actions?assignedTo=me&stateGroup=active" : "/staff/actions?performedBy=me&state=COMPLETED";
    await page.goto(path);
    await expect(page.getByRole("status").filter({ hasText: /\d+ actions/ })).toBeVisible();
    const work = await (await page.request.get(`${api}/api${path}`)).json();
    for (const action of work.items) {
      const link = page.locator(`.queue-table a[href="/staff/tickets/${action.ticketId}?tab=actions&actionId=${action.id}"]`);
      await expect(link).toHaveText(`View Action ${action.actionNumber}`);
    }
    for (const width of [1920, 1440, 1150, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      const links = page.locator(".queue-table td:last-child a");
      for (const link of await links.all()) {
        expect(await link.evaluate(el => { const range = document.createRange(); range.selectNodeContents(el); return new Set(Array.from(range.getClientRects(), rect => Math.round(rect.top))).size; })).toBe(1);
      }
      if (width > 1100) {
        const area = await page.locator(".app-content").boundingBox();
        expect(area!.width).toBeLessThanOrEqual(1200);
        expect(area!.x).toBeGreaterThanOrEqual(32);
        for (const label of await page.locator(".queue-table td:first-child strong").all()) {
          expect(await label.evaluate(el => { const range = document.createRange(); range.selectNodeContents(el); return new Set(Array.from(range.getClientRects(), rect => Math.round(rect.top))).size; })).toBe(1);
        }
      }
      await capture(page, info, `${kind}-work-${width}`);
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/staff/actions?assignedTo=me&stateGroup=active");
  await page.locator(".queue-table td:last-child a").first().click();
  const controls = page.locator(".action-state-controls > .action-controls > button");
  await expect(controls).toHaveCount(3);
  const checkButtons = async (buttons = controls) => {
    const boxes = await buttons.evaluateAll(items => items.map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height, top: el.getBoundingClientRect().top })));
    for (const box of boxes) { expect(box.height).toBeGreaterThanOrEqual(48); expect(Math.abs(box.width - boxes[0].width)).toBeLessThan(1); expect(Math.abs(box.height - boxes[0].height)).toBeLessThan(1); }
    if (page.viewportSize()!.width > 575) for (const box of boxes) expect(Math.abs(box.top - boxes[0].top)).toBeLessThan(1);
  };
  await checkButtons(); await capture(page, info, "action-progress-planned-1440");
  await page.getByRole("button", { name: "Start action", exact: true }).click();
  await expect(page.getByText("Action state saved.", { exact: true })).toBeVisible();
  await expect(controls).toHaveCount(2); await checkButtons(); await capture(page, info, "action-progress-active-1440");
  await page.setViewportSize({ width: 390, height: 1000 }); await checkButtons(); await capture(page, info, "action-progress-active-390");
  for (const operation of ["complete", "cancel"]) {
    await page.getByRole("button", { name: operation === "complete" ? "Complete action" : "Cancel action", exact: true }).click();
    const form = page.getByRole("form", { name: operation === "complete" ? "Confirm completion" : "Confirm cancellation" });
    await expect(form.getByRole("textbox")).toBeFocused();
    const buttons = form.locator(".action-controls > button"); await expect(buttons).toHaveCount(2);
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 }); await checkButtons(buttons);
      await capture(page, info, `action-confirm-${operation}-${width}`, ".action-state-controls");
    }
    await form.getByRole("button", { name: "Back without changing state" }).click();
    await expect(page.getByRole("button", { name: operation === "complete" ? "Complete action" : "Cancel action", exact: true })).toBeFocused();
    await expect(form).toHaveCount(0); await expect(controls).toHaveCount(2);
  }
  for (const mode of ["edit", "create"]) {
    await page.getByRole("button", { name: mode === "edit" ? "Edit action" : "New action", exact: true }).click();
    const form = page.getByRole("form", { name: mode === "edit" ? "Edit action fields" : "Create action", exact: true });
    const buttons = form.locator(".action-controls > button"); await expect(buttons).toHaveCount(2);
    await expect(buttons.first()).toHaveText(mode === "edit" ? "Save action" : "Create action");
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 }); await checkButtons(buttons);
      for (const margin of await buttons.evaluateAll(items => items.map(el => getComputedStyle(el).marginTop))) expect(margin).toBe("0px");
      await capture(page, info, `action-${mode}-controls-${width}`, ".action-editor .action-controls");
    }
    await form.getByRole("button", { name: "Discard unsaved fields" }).click();
    await expect(form).toHaveCount(0);
  }
});
