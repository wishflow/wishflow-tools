import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 20_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:43127',
    browserName: 'chromium',
    launchOptions: process.env.CHROME_EXEC ? { executablePath: process.env.CHROME_EXEC } : undefined,
    headless: true,
    viewport: { width: 1365, height: 768 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm run preview --host 127.0.0.1 --port 43127 --strictPort',
    url: 'http://127.0.0.1:43127',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
