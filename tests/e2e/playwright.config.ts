import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  webServer: [
    {
      command: "node mock-api.mjs",
      url: "http://127.0.0.1:4010/api/health",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000
    },
    {
      command: "pnpm --dir ../.. --filter @sanmarino/web dev",
      url: "http://127.0.0.1:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:4010/api"
      }
    }
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000"
  }
});
