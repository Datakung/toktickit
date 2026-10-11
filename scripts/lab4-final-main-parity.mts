import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = process.argv[3] || process.cwd();
const req = createRequire(root + '/server/package.json');
const { PrismaClient } = req('@prisma/client');
const request = req('supertest');
const helpers = await import(pathToFileURL(root + '/server/tests/support/e2e-environment.ts').href);
const before = await helpers.snapshotDevelopmentState();
const development = process.env.DATABASE_URL;
const report: any = { revision: process.argv[2], startedAtUtc: new Date().toISOString(), environment: 'guarded disposable E2E fixtures; no development writes', developmentBefore: before, query: 'SELECT id, status, "requesterId", "ownerId", "itPriority", "updatedAt", "resolvedAt", "resolutionCycle" FROM "Ticket"; SELECT id, "ticketId", cycle, state, "assigneeId", "performedById", "performedAt" FROM "ActionTaken"', comparisons: [] };
let db: any;
let apiServer: any, vite: any, browser: any;
try {
  await helpers.prepareE2EEnvironment();
  process.env.FRONTEND_ORIGIN = 'http://127.0.0.1:5183';
  const { app } = await import(pathToFileURL(root + '/server/src/app.ts').href);
  const { getPrisma } = await import(pathToFileURL(root + '/server/src/prisma.ts').href);
  db = new PrismaClient();
  // Independent raw-row predicates; do not import production query builders.
  const tickets = await db.$queryRawUnsafe('SELECT id, status, "requesterId", "ownerId", "itPriority", "updatedAt", "resolvedAt", "resolutionCycle" FROM "Ticket"');
  const actions = await db.$queryRawUnsafe('SELECT id, "ticketId", cycle, state, "assigneeId", "performedById", "performedAt" FROM "ActionTaken"');
  const active = new Set(['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED']);
  for (const email of ['dashboard.requester@example.test', 'dashboard.empty@example.test', 'mali.support@example.test', 'admin@example.test']) {
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    const agent = request.agent(app);
    const csrf = (await agent.get('/api/auth/csrf')).body.csrfToken;
    const logged = await agent.post('/api/auth/login').set('Origin', process.env.FRONTEND_ORIGIN || 'http://localhost:5173').set('X-CSRF-Token', csrf).send({ email, password: helpers.E2E_PASSWORD });
    assert.equal(logged.status, 200);
    const kind = user.role === 'REQUESTER' ? 'requester' : 'staff';
    const response = await agent.get('/api/dashboard/' + kind);
    assert.equal(response.status, 200);
    const data = response.body;
    const from = new Date(data.recentFrom).getTime(), until = new Date(data.asOf).getTime();
    const recent = (value: any) => value != null && new Date(value).getTime() >= from && new Date(value).getTime() <= until;
    const expected: any = {};
    if (kind === 'requester') {
      const owned = tickets.filter((t: any) => t.requesterId === user.id);
      Object.assign(expected, { activeTickets: owned.filter((t: any) => active.has(t.status)).length, waitingForMe: owned.filter((t: any) => t.status === 'WAITING_FOR_REQUESTER').length, recentlyUpdated: owned.filter((t: any) => recent(t.updatedAt)).length, recentlyResolved: owned.filter((t: any) => t.status === 'RESOLVED' && recent(t.resolvedAt)).length });
    } else {
      expected.unassignedTickets = tickets.filter((t: any) => active.has(t.status) && t.ownerId === null).length;
      expected.myTickets = tickets.filter((t: any) => active.has(t.status) && t.ownerId === user.id).length;
      expected.myAssignedActions = actions.filter((a: any) => a.assigneeId === user.id && ['PLANNED', 'IN_PROGRESS'].includes(a.state) && tickets.some((t: any) => t.id === a.ticketId && t.resolutionCycle === a.cycle && active.has(t.status))).length;
      expected.statusCounts = Object.fromEntries(['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED'].map(status => [status, tickets.filter((t: any) => t.status === status).length]));
      expected.priorityCounts = Object.fromEntries(['LOW', 'MEDIUM', 'HIGH'].map(priority => [priority, tickets.filter((t: any) => active.has(t.status) && t.itPriority === priority).length]));
    }
    assert.deepEqual(data.metrics, expected);
    const counts: any[] = [];
    for (const [key, value] of Object.entries(expected)) {
      const entries = typeof value === 'number' ? [[key, value, data.drillDown[key]]] : Object.entries(value as any).map(([sub, count]) => [key + '.' + sub, count, data.drillDown[key][sub]]);
      for (const [metric, count, href] of entries) {
        const list = await agent.get('/api' + href);
        assert.equal(list.status, 200);
        const total = kind === 'requester' ? list.body.meta.totalItems : list.body.total;
        assert.equal(total, count);
        counts.push({ metric, api: metric.includes('.') ? data.metrics[key][metric.split('.')[1]] : data.metrics[key], database: count, drillDownTotal: total, href, passed: true });
      }
    }
    const recentRows = tickets.filter((t: any) => (kind !== 'requester' || t.requesterId === user.id) && recent(t.updatedAt)).sort((a: any, b: any) => b.updatedAt.getTime() - a.updatedAt.getTime() || b.id - a.id).slice(0, 5);
    assert.deepEqual(data.recentTickets.map((t: any) => t.id), recentRows.map((t: any) => t.id));
    if (kind === 'staff') {
      const performed = actions.filter((a: any) => a.state === 'COMPLETED' && a.performedById === user.id && recent(a.performedAt)).sort((a: any, b: any) => b.performedAt.getTime() - a.performedAt.getTime() || b.id - a.id).slice(0, 5);
      assert.deepEqual(data.recentPerformedActions.map((a: any) => a.id), performed.map((a: any) => a.id));
    } else {
      const waiting = tickets.filter((t: any) => t.requesterId === user.id && t.status === 'WAITING_FOR_REQUESTER').sort((a: any, b: any) => b.updatedAt.getTime() - a.updatedAt.getTime() || b.id - a.id).slice(0, 5);
      assert.deepEqual(data.attentionTickets.map((t: any) => t.id), waiting.map((t: any) => t.id));
    }
    report.comparisons.push({ role: user.role, actorId: user.id, fixture: email, asOf: data.asOf, recentFrom: data.recentFrom, counts, boundedListOrderPassed: true });
  }
  // A short supplementary real-browser audit on exactly the queried fixtures.
  // The complete 49-case gate remains a separate unchanged run.
  apiServer = app.listen(3100, '127.0.0.1');
  await new Promise<void>((done, reject) => { apiServer.once('listening', done); apiServer.once('error', reject); });
  vite = spawn(process.execPath, [resolve(root, 'client/node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '5183', '--strictPort'], { cwd: root + '/client', windowsHide: true, stdio: 'ignore', env: { ...process.env, VITE_API_URL: 'http://127.0.0.1:3100' } });
  let ready = false;
  for (let i = 0; i < 100; i++) { try { if ((await fetch('http://127.0.0.1:5183')).ok) { ready = true; break; } } catch {} await new Promise(done => setTimeout(done, 200)); }
  assert.equal(ready, true, 'Supplementary review UI must start on its own port.');
  const clientReq = createRequire(root + '/client/package.json');
  const { chromium } = clientReq('@playwright/test');
  browser = await chromium.launch();
  const captureRoot = resolve(root, 'artifacts/lab-04/final-main/supplementary-screenshots');
  mkdirSync(captureRoot, { recursive: true });
  report.browserAudit = [];
  for (const fixture of ['dashboard.requester@example.test', 'mali.support@example.test', 'admin@example.test']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage(), errors: string[] = [], consoleErrors: any[] = [];
    page.on('pageerror', (error: any) => errors.push(error.message));
    page.on('console', (message: any) => { if (message.type() === 'error') consoleErrors.push({ text: message.text(), url: message.location().url, page: page.url() }); });
    await page.goto('http://127.0.0.1:5183/login');
    await page.getByLabel('Email', { exact: true }).fill(fixture);
    await page.getByLabel('Password', { exact: true }).fill(helpers.E2E_PASSWORD);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.locator('.dashboard-snapshot').waitFor();
    const requester = fixture.startsWith('dashboard.'), admin = fixture.startsWith('admin');
    const label = requester ? 'requester' : admin ? 'admin' : 'staff';
    const routes = requester ? ['/dashboard', '/tickets', '/tickets/new'] : admin ? ['/staff/dashboard', '/admin/users'] : ['/staff/dashboard', '/staff/actions?assignedTo=me&stateGroup=active', '/staff/tickets'];
    for (const route of routes) for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto('http://127.0.0.1:5183' + route);
      await page.locator('h1').waitFor();
      if (route.includes('dashboard')) await page.locator('.dashboard-snapshot').waitFor();
      else if (route === '/tickets/new') await page.locator('#ticket-category option').nth(1).waitFor({ state: 'attached' });
      else if (route === '/admin/users') await page.locator('.admin-table tbody tr').first().waitFor();
      else if (route === '/tickets') await page.locator('.ticket-table tbody tr').first().waitFor({ state: 'attached' });
      else await page.locator('.queue-table tbody tr').first().waitFor();
      const size = await page.evaluate(() => ({ root: document.documentElement.scrollWidth, body: document.body.scrollWidth, viewport: innerWidth }));
      assert.ok(size.root <= width && size.body <= width, 'Supplementary screen must not overflow horizontally.');
      const name = label + '-' + (route.includes('dashboard') ? 'dashboard' : route.includes('actions') ? 'work' : route === '/tickets/new' ? 'create' : route === '/admin/users' ? 'users' : 'tickets') + '-' + width;
      await page.screenshot({ path: resolve(captureRoot, name + '.png'), fullPage: true, animations: 'disabled' });
      report.browserAudit.push({ screen: name, width, route, overflow: size, screenshot: 'supplementary-screenshots/' + name + '.png' });
    }
    const expectedSessionProbes = consoleErrors.filter((item: any) => item.url === 'http://127.0.0.1:3100/api/auth/me' && /401 \(Unauthorized\)/.test(item.text) && item.page.endsWith('/login'));
    const unexpected = consoleErrors.filter((item: any) => !expectedSessionProbes.includes(item));
    assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
    report.browserAudit.push({ fixture, pageErrors: errors, unexpectedConsoleErrors: unexpected, expectedSignedOutSessionProbes: expectedSessionProbes });
    await context.close();
  }
  await getPrisma().$disconnect();
  report.status = 'passed';
} finally {
  if (browser) await browser.close();
  if (vite) { vite.kill(); await new Promise(done => { if (vite.exitCode !== null) done(null); else vite.once('exit', done); }); }
  if (apiServer) await new Promise<void>(done => apiServer.close(() => done()));
  if (db) await db.$disconnect();
  process.env.DATABASE_URL = development;
  await helpers.cleanupE2EEnvironment();
  process.env.DATABASE_URL = development;
  report.developmentAfter = await helpers.snapshotDevelopmentState();
  report.preservationVerified = before === report.developmentAfter;
  assert.equal(report.preservationVerified, true);
  report.finishedAtUtc = new Date().toISOString();
}
writeFileSync(resolve(root, 'artifacts/lab-04/final-main/dashboard-parity.json'), JSON.stringify(report, null, 2));
console.log('PARITY_REPORT=' + JSON.stringify(report));
