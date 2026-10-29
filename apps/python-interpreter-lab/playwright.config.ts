import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 90_000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    launchOptions: process.env.CHROME_EXEC ? { executablePath: process.env.CHROME_EXEC } : undefined,
    headless: true,
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm run serve:test',
    url: 'http://127.0.0.1:4173/python-interpreter-lab/',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
