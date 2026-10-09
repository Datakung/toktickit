import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { E2E_PASSWORD } from "../support/auth.js";
const api = "http://127.0.0.1:3100";
const evidenceRoot = fileURLToPath(new URL("../../../artifacts/lab-04/screenshots/workflow/", import.meta.url));
const persistent = process.env.npm_lifecycle_event === "test:e2e:lab4-workflow-evidence";
async function login(page: Page, email: string) {
  await page.goto("/login"); await page.getByLabel("Email", { exact: true }).fill(email); await page.getByLabel("Password", { exact: true }).fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click(); await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}
async function out(page: Page) { await page.getByRole("button", { name: "Sign out" }).click(); await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible(); }
async function headers(page: Page) { return { Origin: new URL(page.url()).origin, "X-CSRF-Token": (await (await page.request.get(`${api}/api/auth/me`)).json()).csrfToken as string }; }
async function detail(page: Page, id: number) { return (await page.request.get(`${api}/api/staff/tickets/${id}`)).json(); }
async function fixture(page: Page, open = true) {
  await login(page, "anan.chaiyasit@example.test");
  const categories = await (await page.request.get(`${api}/api/categories`)).json(), systems = await (await page.request.get(`${api}/api/related-systems`)).json();
  const response = await page.request.post(`${api}/api/tickets`, { headers: await headers(page), data: { categoryId: categories[0].id, relatedSystemId: systems[0].id, requestedPriority: "HIGH", summary: `Workflow fixture ${randomUUID()}`, description: "Isolated workflow evidence, not development data." } });
  expect(response.status()).toBe(201); const t = (await response.json()).data;
  await out(page); await login(page, "mali.support@example.test");
  if (open) expect((await page.request.patch(`${api}/api/staff/tickets/${t.id}/status`, { headers: await headers(page), data: { status: "OPEN", version: 1 } })).status()).toBe(200);
  await page.goto(`/staff/tickets/${t.id}`); await expect(page.getByRole("button", { name: "New action" })).toBeEnabled(); return t as { id: number; ticketNumber: string };
}
async function create(page: Page, ticketId: number, description: string, followUpRequired = false) {
  const parent = await detail(page, ticketId);
  const response = await page.request.post(`${api}/api/staff/tickets/${ticketId}/actions`, { headers: await headers(page), data: { actionAt: new Date().toISOString(), description, result: "", followUpRequired,
    followUpNote: followUpRequired ? "Needs verification" : "", attachmentNotes: "", assigneeId: null, ticketVersion: parent.version, requestId: randomUUID() } });
  expect(response.status()).toBe(201); return (await response.json()).actionId as number;
}
async function state(page: Page, ticketId: number, actionId: number, value: "COMPLETED" | "CANCELLED") {
  const current = await (await page.request.get(`${api}/api/tickets/${ticketId}/actions/${actionId}`)).json();
  const response = await page.request.patch(`${api}/api/staff/tickets/${ticketId}/actions/${actionId}/state`, { headers: await headers(page), data: { state: value, result: value === "COMPLETED" ? "Verified fix" : "",
    cancellationReason: value === "CANCELLED" ? "Duplicate work not needed" : "", version: current.action.version, ticketVersion: current.ticketVersion, requestId: randomUUID() } });
  expect(response.status()).toBe(200);
}
async function status(page: Page, value: string) {
  const change = page.getByLabel(value === "OPEN" ? "Choose an action" : "Change status to", { exact: true });
  await expect(change).toBeEnabled(); await change.selectOption(value);
  if (["RESOLVED", "CLOSED", "CANCELLED"].includes(value)) await page.getByLabel("I understand this is a terminal status.").check();
  const save = page.getByRole("button", { name: value === "OPEN" ? "Open Ticket" : "Save Status", exact: true });
  await expect(save).toBeEnabled(); await save.click();
  await expect(page.getByText("Status saved.", { exact: true })).toBeVisible(); await expect(page.getByRole("button", { name: "Refresh actions" })).toBeEnabled();
}
async function capture(page: Page, info: TestInfo, name: string) {
  await expect.poll(() => page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) <= innerWidth)).toBe(true);
  const path = persistent ? `${evidenceRoot}${name}.png` : info.outputPath(`${name}.png`); mkdirSync(dirname(path), { recursive: true });
  // Keep feature evidence readable: the intentionally 22-action fixture makes
  // full-page captures too tall to use in the submission PDF.
  if (/^(ready|reopened|later-page)/.test(name)) await page.locator(".workflow-controls").screenshot({ path, animations: "disabled" });
  else if (/^(opening-stage|status-selection)/.test(name)) await page.locator(".status-workflow-panel").screenshot({ path, animations: "disabled" });
  else if (/^checklist-/.test(name)) await page.getByRole("region", { name: "Resolution checklist" }).screenshot({ path, animations: "disabled" });
  else if (/^action-view-/.test(name)) await page.locator(".action-record").screenshot({ path, animations: "disabled" });
  else if (/^action-edit-/.test(name)) await page.getByRole("form", { name: "Edit action fields" }).screenshot({ path, animations: "disabled" });
  else if (/^action-progress-/.test(name)) await page.getByRole("region", { name: "Action state controls" }).screenshot({ path, animations: "disabled" });
  else if (/^audit-readable-/.test(name)) await page.locator(".action-history > ol > li").last().screenshot({ path, animations: "disabled" });
  else if (/^(requester-history|history-retry)/.test(name)) await page.getByRole("region", { name: "Workflow history" }).screenshot({ path, animations: "disabled" });
  else await page.screenshot({ path, fullPage: false, animations: "disabled" });
}
async function checkRequirementColours(page: Page, met: boolean[]) {
  const rows = page.getByRole("region", { name: "Resolution checklist" }).locator(".resolution-requirement");
  await expect(rows).toHaveCount(3);
  const checklist = page.getByRole("region", { name: "Resolution checklist" });
  const heading = await checklist.getByRole("heading", { name: "Resolution checklist" }).evaluate(el => ({ size: parseFloat(getComputedStyle(el).fontSize), weight: Number(getComputedStyle(el).fontWeight) }));
  const bodySize = await rows.first().evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  expect(heading.size).toBeGreaterThan(bodySize); expect(heading.weight).toBeGreaterThanOrEqual(700);
  const overview = await checklist.getByRole("status").evaluate(el => {
    const style = getComputedStyle(el);
    return { size: parseFloat(style.fontSize), weight: Number(style.fontWeight), padding: parseFloat(style.paddingTop), border: parseFloat(style.borderInlineStartWidth) };
  });
  expect(overview.size).toBeGreaterThan(bodySize);
  expect(overview.weight).toBeGreaterThanOrEqual(800);
  expect(overview.padding).toBeGreaterThanOrEqual(20);
  expect(overview.border).toBeGreaterThanOrEqual(6);
  for (let index = 0; index < met.length; index++) {
    const row = rows.nth(index);
    await expect(row).toHaveClass(new RegExp(met[index] ? "resolution-requirement-met" : "resolution-requirement-unmet"));
    await expect(row.locator(".resolution-requirement-icon")).toHaveText(met[index] ? "✓" : "✕");
    expect(await row.evaluate(el => getComputedStyle(el).color)).toBe(met[index] ? "rgb(0, 107, 60)" : "rgb(155, 28, 28)");
    const contrast = await row.evaluate(el => {
      const style = getComputedStyle(el);
      const luminance = (colour: string) => {
        const [r, g, b] = colour.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => {
          const channel = value / 255; return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const foreground = luminance(style.color), background = luminance(style.backgroundColor);
      return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
    });
    expect(contrast).toBeGreaterThanOrEqual(4.5);
  }
}

test("readable audit changes preserve exact snapshots and owned Requester visibility at every width", async ({ page }, info) => {
  const t = await fixture(page);
  const actionId = await create(page, t.id, "Investigate VPN connection");
  for (const followUpRequired of [true, false]) {
    const original = await (await page.request.get(`${api}/api/tickets/${t.id}/actions/${actionId}`)).json();
    const response = await page.request.patch(`${api}/api/staff/tickets/${t.id}/actions/${actionId}`, {
      headers: await headers(page), data: { actionAt: original.action.actionAt,
        description: "VPN connection restored", result: "Verified access", followUpRequired,
        followUpNote: followUpRequired ? "Verify stability tomorrow" : `Verified stable; ${"longtoken".repeat(30)}`,
        attachmentNotes: "", changeReason: "", version: original.action.version,
        ticketVersion: original.ticketVersion, requestId: randomUUID() },
    });
    expect(response.status()).toBe(200);
  }
  const saved = await (await page.request.get(`${api}/api/tickets/${t.id}/actions/${actionId}/history`)).json();
  expect(saved.total).toBe(3);
  await page.goto(`/staff/tickets/${t.id}?tab=actions&actionId=${actionId}`);
  const history = page.getByRole("region", { name: "Action audit history" });
  const revisions = history.locator(":scope > ol > li");
  await expect(revisions).toHaveCount(3);
  await expect(revisions.first().getByRole("heading", { name: "Action created" })).toBeVisible();
  await expect(revisions.first().getByText("Before", { exact: true })).toHaveCount(0);
  const edit = revisions.nth(1).getByRole("region", { name: "Changes in revision 2" });
  await expect(edit).toContainText("Investigate VPN connection"); await expect(edit).toContainText("VPN connection restored");
  await expect(edit.getByText("State", { exact: true })).toHaveCount(0);
  for (const role of ["staff", "requester"]) {
    if (role === "requester") {
      await out(page); await login(page, "anan.chaiyasit@example.test");
      await page.goto(`/tickets/${t.id}?tab=actions&actionId=${actionId}`);
      await expect(history.locator(":scope > ol > li")).toHaveCount(3);
      await expect(page.getByRole("button", { name: "Edit action", exact: true })).toHaveCount(0);
      await expect(page.getByRole("region", { name: "Action state controls" })).toHaveCount(0);
    }
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      const latest = revisions.last(), change = latest.getByRole("region", { name: "Changes in revision 3" });
      await expect(change.getByText("Yes", { exact: true })).toBeVisible();
      await expect(change.getByText("No", { exact: true })).toBeVisible();
      await expect(latest).toContainText("Changed by Mali Support");
      const disclosure = latest.locator("summary");
      await expect(disclosure).toHaveText("Technical details");
      await expect(latest.locator("details")).not.toHaveAttribute("open", "");
      await disclosure.focus(); await page.keyboard.press("Tab"); await page.keyboard.press("Shift+Tab");
      expect(await disclosure.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe("none");
      expect(await disclosure.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
      await capture(page, info, `audit-readable-${role}-${width}`);
      await page.keyboard.press("Enter");
      await expect(latest.locator("details")).toHaveAttribute("open", "");
      const snapshots = await latest.locator("pre").allTextContents();
      expect(snapshots.map(value => JSON.parse(value))).toEqual([saved.items[2].before, saved.items[2].after]);
      await expect.poll(() => page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) <= innerWidth)).toBe(true);
      await page.keyboard.press("Enter");
      const close = page.getByRole("button", { name: "Close detail", exact: true });
      await close.focus(); await page.keyboard.press("Tab"); await page.keyboard.press("Shift+Tab");
      expect(await close.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe("none");
      expect(await close.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
      await page.keyboard.press("Enter");
      await expect(history).toHaveCount(0);
      await expect(page.getByRole("region", { name: "Action 1 details" })).toHaveCount(0);
      const view = page.getByRole("button", { name: "View action 1", exact: true });
      await expect(view).toBeFocused();
      await page.getByRole("button", { name: "Refresh actions", exact: true }).click();
      await expect(view).toBeEnabled(); await expect(history).toHaveCount(0);
      await view.click(); await expect(revisions).toHaveCount(3);
    }
  }
  expect((await (await page.request.get(`${api}/api/tickets/${t.id}/actions/${actionId}/history`)).json()).items).toEqual(saved.items);
});

test("action details stay in view mode until Edit is chosen at every width", async ({ page }, info) => {
  const t = await fixture(page);
  const actionId = await create(page, t.id, "Verify account access with the Requester");
  await page.goto(`/staff/tickets/${t.id}?tab=actions&actionId=${actionId}`);
  const actions = page.getByRole("region", { name: "Actions Taken", exact: true });
  await expect(actions.getByRole("heading", { name: "Action 1", exact: true })).toBeFocused();
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(actions.getByRole("form", { name: "Edit action fields" })).toHaveCount(0);
    await expect(actions.getByRole("region", { name: "Action audit history" })).toBeVisible();
    const edit = actions.getByRole("button", { name: "Edit action", exact: true });
    await expect(edit).toHaveAttribute("aria-expanded", "false");
    await edit.focus(); await page.keyboard.press("Tab"); await page.keyboard.press("Shift+Tab");
    expect(await edit.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe("none");
    expect(await edit.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    await capture(page, info, `action-view-${width}`);
    const progress = actions.getByRole("region", { name: "Action state controls" });
    await expect(progress.getByRole("button", { name: "Start action" })).toBeEnabled();
    await expect(progress.getByRole("button", { name: "Cancel action" })).toBeEnabled();
    const complete = progress.getByRole("button", { name: "Complete action", exact: true });
    await complete.focus(); await page.keyboard.press("Tab"); await page.keyboard.press("Shift+Tab");
    expect(await complete.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe("none");
    expect(await complete.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    await capture(page, info, `action-progress-${width}`);
    await page.keyboard.press("Enter");
    await expect(actions.getByLabel("Completion Result")).toBeFocused();
    await expect(actions.getByRole("form", { name: "Edit action fields" })).toHaveCount(0);
    await actions.getByRole("button", { name: "Back without changing state" }).click();
    await expect(complete).toBeFocused();
    await edit.click();
    await expect(actions.getByLabel("Action Date/Time (Bangkok)")).toBeFocused();
    await actions.getByLabel("Description", { exact: true }).fill("Discard this unsaved draft");
    await capture(page, info, `action-edit-${width}`);
    await actions.getByRole("button", { name: "Close editor" }).click();
    await expect(edit).toBeFocused();
    await expect(actions.getByRole("region", { name: "Action 1 details" })).toContainText("Verify account access with the Requester");
    await edit.click();
    await actions.getByLabel("Description", { exact: true }).fill("Discard this draft and close the entire detail");
    await actions.getByRole("button", { name: "Discard changes and close detail" }).click();
    await expect(actions.getByRole("region", { name: "Action audit history" })).toHaveCount(0);
    await expect(actions.getByRole("form", { name: "Edit action fields" })).toHaveCount(0);
    const view = actions.getByRole("button", { name: "View action 1", exact: true });
    await expect(view).toBeFocused(); await view.click();
    await expect(actions.getByRole("region", { name: "Action 1 details" })).toContainText("Verify account access with the Requester");
  }
  expect((await (await page.request.get(`${api}/api/tickets/${t.id}/actions/${actionId}`)).json()).action.version).toBe(1);
});

test("saved status stays separate from the next choice, with every valid Open transition retained", async ({ page }, info) => {
  await fixture(page, false);
  const current = page.getByRole("group", { name: "Current status" });
  const opening = page.getByRole("region", { name: "Open ticket", exact: true });
  await expect(opening).toBeVisible();
  await expect(page.getByRole("heading", { name: "Update ticket status", exact: true })).toHaveCount(0);
  const start = page.getByLabel("Choose an action", { exact: true });
  await expect(current).toContainText("New");
  await expect(start).toHaveValue("");
  await expect(start.locator("option")).toHaveText(["Choose an action…", "Open Ticket", "Cancel Ticket"]);
  await expect(page.getByRole("button", { name: "Open Ticket", exact: true })).toBeDisabled();
  await start.selectOption("OPEN");
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await start.focus(); await page.keyboard.press("Tab"); await page.keyboard.press("Shift+Tab");
    await expect(start).toBeFocused();
    expect(await start.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe("none");
    expect(await start.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    await capture(page, info, `opening-stage-${width}`);
  }
  await status(page, "OPEN");
  await expect(opening).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Update ticket status", exact: true })).toBeFocused();
  const change = page.getByLabel("Change status to", { exact: true });
  await expect(current).toContainText("Open");
  await expect(change).toHaveValue("");
  await expect(change.locator("option")).toHaveText(["Choose a new status…", "In Progress", "Waiting for Requester", "Resolved", "Cancelled"]);
  await expect(page.getByRole("button", { name: "Save Status" })).toBeDisabled();
  await checkRequirementColours(page, [false, true, true]);
  await expect(page.getByRole("region", { name: "Resolution checklist" }).getByRole("status")).toHaveClass(/resolution-state-blocked/);
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await checkRequirementColours(page, [false, true, true]);
    await capture(page, info, `checklist-blocked-${width}`);
  }
  await change.selectOption("IN_PROGRESS");
  await expect(current).toContainText("Open");
  await expect(page.getByText("Open → In Progress. Not saved yet.", { exact: true })).toBeVisible();
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await change.focus(); await page.keyboard.press("Tab"); await page.keyboard.press("Shift+Tab");
    await expect(change).toBeFocused();
    expect(await change.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe("none");
    expect(await change.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    await capture(page, info, `status-selection-${width}`);
  }
  await change.selectOption("");
  await expect(page.getByRole("button", { name: "Save Status" })).toBeDisabled();
  await page.reload();
  await expect(current).toContainText("Open");
  await expect(change).toHaveValue("");
});

test("New-ticket cancellation remains available but cannot bypass unfinished work", async ({ page }) => {
  const t = await fixture(page, false);
  const work = await create(page, t.id, "Unfinished work blocks cancelling a New ticket");
  await page.reload();
  await page.getByLabel("Choose an action", { exact: true }).selectOption("CANCELLED");
  await page.getByLabel("I understand this is a terminal status.").check();
  await expect(page.getByRole("button", { name: "Cancel Ticket", exact: true })).toBeDisabled();
  await expect(page.getByRole("heading", { name: "Update ticket status", exact: true })).toHaveCount(0);
  await state(page, t.id, work, "CANCELLED");
  await page.reload();
  await expect(page.getByRole("button", { name: "Refresh actions" })).toBeEnabled();
  await page.getByLabel("Choose an action", { exact: true }).selectOption("CANCELLED");
  await expect(page.getByRole("button", { name: "Cancel Ticket", exact: true })).toBeDisabled();
  await page.getByLabel("I understand this is a terminal status.").check();
  await page.getByRole("button", { name: "Cancel Ticket", exact: true }).click();
  await expect(page.getByText("Status saved.", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ticket status", exact: true })).toBeVisible();
  await expect(page.getByRole("group", { name: "Current status" })).toContainText("Cancelled");
  await expect(page.getByRole("heading", { name: "Open ticket", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Update ticket status", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save Status" })).toBeDisabled();
});

test("whole-cycle blockers, formal resolution/close/reopen and read-only history at all widths", async ({ page }, info) => {
  test.setTimeout(120_000); const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  const t = await fixture(page), checklist = page.getByRole("region", { name: "Resolution checklist" }), history = page.getByRole("region", { name: "Workflow history" });
  await page.getByLabel("Change status to", { exact: true }).selectOption("RESOLVED"); await expect(page.getByRole("button", { name: "Save Status" })).toBeDisabled();
  const missing = await page.request.patch(`${api}/api/staff/tickets/${t.id}/status`, { headers: await headers(page), data: { status: "RESOLVED", version: (await detail(page, t.id)).version } });
  expect((await missing.json()).error.code).toBe("RESOLUTION_GATE_NOT_MET");
  const first = await create(page, t.id, "Completed qualifying work"); await state(page, t.id, first, "COMPLETED");
  for (let i = 0; i < 20; i++) { const id = await create(page, t.id, `Cancelled duplicate ${i}`); await state(page, t.id, id, "CANCELLED"); }
  const last = await create(page, t.id, "Later page blocking work", true);
  await page.reload(); await expect(page.getByRole("button", { name: "Refresh actions" })).toBeEnabled();
  await expect(page.getByText("Later page blocking work", { exact: true })).toHaveCount(0);
  await expect(checklist).toContainText("1 unfinished"); await page.getByLabel("Change status to", { exact: true }).selectOption("RESOLVED");
  await checkRequirementColours(page, [true, false, true]);
  await page.getByLabel("I understand this is a terminal status.").check(); await expect(page.getByRole("button", { name: "Save Status" })).toBeDisabled(); await capture(page, info, "later-page-blocker-1440");
  await state(page, t.id, last, "COMPLETED"); await page.reload(); await expect(page.getByRole("button", { name: "Refresh actions" })).toBeEnabled();
  await expect(checklist).toContainText("Not met: No completed-action follow-up outstanding (1)");
  await checkRequirementColours(page, [true, true, false]);
  const follow = await page.request.patch(`${api}/api/staff/tickets/${t.id}/status`, { headers: await headers(page), data: { status: "RESOLVED", version: (await detail(page, t.id)).version } });
  expect((await follow.json()).error.code).toBe("RESOLUTION_GATE_NOT_MET");
  await page.goto(`/staff/tickets/${t.id}?tab=actions&actionId=${last}`); const actions = page.getByRole("region", { name: "Actions Taken", exact: true });
  await expect(actions.getByLabel("Follow-Up Required")).toHaveCount(0);
  await actions.getByRole("button", { name: "Edit action", exact: true }).click();
  await expect(actions.getByLabel("Follow-Up Required")).toBeEnabled(); await actions.getByLabel("Follow-Up Required").uncheck();
  await actions.getByLabel("Change reason").fill("Verification complete; no further follow-up."); await actions.getByRole("button", { name: "Save action", exact: true }).click();
  await expect(actions.getByText("Action changes saved.", { exact: true })).toBeVisible(); await expect(checklist.getByText("Ready to resolve", { exact: true })).toBeVisible();
  await checkRequirementColours(page, [true, true, true]);
  await expect(checklist.getByRole("status")).toHaveClass(/resolution-state-ready/);
  await page.getByLabel("Change status to", { exact: true }).selectOption("RESOLVED");
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 }); await page.keyboard.press("Tab");
    const review = checklist.getByRole("link", { name: "Review Actions Taken" }); await review.focus();
    expect(await review.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe("none");
    expect(await review.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    expect(await history.getByRole("button", { name: "Next transitions" }).evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    await capture(page, info, `ready-${width}`);
    await capture(page, info, `checklist-ready-${width}`);
    await checkRequirementColours(page, [true, true, true]);
  }
  await status(page, "RESOLVED"); await expect(history.getByText("Open → Resolved", { exact: true })).toBeVisible(); await expect(checklist).toContainText("Formally resolved at");
  await expect(checklist.getByRole("status")).toHaveClass(/resolution-state-neutral/);
  await status(page, "CLOSED"); await expect(history.getByText("Resolved → Closed", { exact: true })).toBeVisible();
  await status(page, "REOPENED"); await expect(history.getByText("Closed → Reopened", { exact: true })).toBeVisible(); await expect(checklist).toContainText("Cycle 2");
  await expect(checklist).toContainText("Not ready to resolve"); await expect(actions).toContainText("previous resolution cycle");
  await expect(actions.getByRole("button", { name: "Save action", exact: true })).toHaveCount(0);
  for (const width of [1440, 768, 390]) { await page.setViewportSize({ width, height: 1000 }); await capture(page, info, `reopened-${width}`); }
  const blocked = await page.request.patch(`${api}/api/staff/tickets/${t.id}/status`, { headers: await headers(page), data: { status: "RESOLVED", version: (await detail(page, t.id)).version } });
  expect((await blocked.json()).error.code).toBe("RESOLUTION_GATE_NOT_MET");
  await out(page); await login(page, "anan.chaiyasit@example.test"); await page.goto(`/tickets/${t.id}`);
  await expect(history.getByText("Closed → Reopened", { exact: true })).toBeVisible(); await expect(history).toContainText("Mali Support");
  await expect(page.getByRole("button", { name: "Save Status" })).toHaveCount(0);
  for (const width of [1440, 768, 390]) { await page.setViewportSize({ width, height: 1000 }); await capture(page, info, `requester-history-${width}`); }
  await page.getByRole("button", { name: "Problem Appears Resolved" }).click(); await expect(page.getByText(/You indicated apparent resolution/)).toBeVisible();
  expect((await (await page.request.get(`${api}/api/tickets/${t.id}`)).json()).data.status).toBe("REOPENED");
  await out(page); await login(page, "kanya.srisuk@example.test"); expect((await page.request.get(`${api}/api/tickets/${t.id}/workflow-history`)).status()).toBe(404);
  expect(errors).toEqual([]);
});
test("lost status response blocks repeated saves until authoritative reload, and history read can retry", async ({ page }, info) => {
  const t = await fixture(page, false); let writes = 0;
  await page.route(`**/api/staff/tickets/${t.id}/status`, async route => { writes++; expect((await route.fetch()).status()).toBe(200); await route.abort("failed"); });
  await page.getByLabel("Choose an action", { exact: true }).selectOption("OPEN");
  await page.getByRole("button", { name: "Open Ticket", exact: true }).click(); await expect(page.getByText(/Status save outcome unknown/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Ticket", exact: true })).toBeDisabled(); await expect(page.getByRole("button", { name: "Save Owner" })).toBeDisabled(); await capture(page, info, "status-outcome-unknown-1440");
  await expect(page.getByRole("region", { name: "Resolution checklist" }).getByRole("status")).toHaveClass(/resolution-state-neutral/);
  await expect(page.locator(".resolution-requirement")).toHaveCount(0);
  await page.getByRole("button", { name: "Reload Ticket" }).click(); await expect(page.getByRole("button", { name: "Save Owner" })).toBeEnabled();
  expect(writes).toBe(1); expect((await (await page.request.get(`${api}/api/tickets/${t.id}/workflow-history`)).json()).total).toBe(1);
  // StrictMode may issue more than one initial read. Keep the outage active
  // until the user explicitly retries, rather than rely on request ordering.
  let unavailable = true; await page.route(`**/api/tickets/${t.id}/workflow-history**`, route => unavailable ? route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "WORKFLOW_HISTORY_FAILED", message: "Workflow history could not be loaded. Try again." } }) }) : route.continue());
  await page.reload(); await expect(page.getByRole("button", { name: "Retry workflow history" })).toBeVisible(); await capture(page, info, "history-retry-1440");
  unavailable = false; await page.getByRole("button", { name: "Retry workflow history" }).click(); await expect(page.getByText("New → Open", { exact: true })).toBeVisible();
});
