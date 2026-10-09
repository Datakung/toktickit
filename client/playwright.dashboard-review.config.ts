import { defineConfig } from "@playwright/test";
import base from "./playwright.config.js";
// Reproducible isolated review run alongside a development UI on 5173.
// Uses the existing guarded E2E database, uploads and development fingerprint.
export default defineConfig({ ...base, use: { ...base.use, baseURL: "http://127.0.0.1:5183" }, webServer: [
  { command: "npm --prefix ../server run e2e:server", url: "http://127.0.0.1:3100/api/health", reuseExistingServer: false, timeout: 60000, env: { FRONTEND_ORIGIN: "http://127.0.0.1:5183" } },
  { command: "npm run dev -- --host 127.0.0.1 --port 5183 --strictPort", url: "http://127.0.0.1:5183", reuseExistingServer: false, timeout: 60000, env: { VITE_API_URL: "http://127.0.0.1:3100" } },
] });
