import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command:
      process.env.E2E_WEB_SERVER_COMMAND ??
      "npm run dev -- --webpack --hostname 127.0.0.1",
    url: "http://localhost:3000",
    reuseExistingServer: process.env.E2E_REUSE_SERVER === "true",
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_E2E: "true",
      NEXT_PUBLIC_USE_MOCKS: "true",
    },
  },
  projects: [
    {
      name: "smoke",
      testDir: "tests/e2e/smoke",
    },
    {
      name: "full",
      testDir: "tests/e2e/full",
    },
  ],
});
