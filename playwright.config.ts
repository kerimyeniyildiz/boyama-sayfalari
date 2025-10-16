import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60000,
  expect: {
    timeout: 10000
  },
  use: {
    baseURL: BASE_URL,
    trace: "retry-with-trace",
    screenshot: "only-on-failure"
  },
  webServer: process.env.CI
    ? {
        command: "npm run build && npm run start",
        url: BASE_URL,
        timeout: 120000,
        reuseExistingServer: !process.env.CI
      }
    : undefined,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
