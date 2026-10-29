import { defineConfig } from '@playwright/test';

const testPort = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const baseURL = `http://127.0.0.1:${testPort}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 90_000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    browserName: 'chromium',
    launchOptions: process.env.CHROME_EXEC ? { executablePath: process.env.CHROME_EXEC } : undefined,
    headless: true,
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm run serve:test',
    url: `${baseURL}/python-interpreter-lab/`,
    env: { PORT: String(testPort) },
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
