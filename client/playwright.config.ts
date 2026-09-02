import { defineConfig, devices } from "@playwright/test";

const e2eApiUrl = "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "e2e/lab-02",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "npm --prefix ../server run e2e:server",
      url: `${e2eApiUrl}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: "npm run dev -- --host 127.0.0.1",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        VITE_API_URL: e2eApiUrl,
      },
    },
  ],
});
