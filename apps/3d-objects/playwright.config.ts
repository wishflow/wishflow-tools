import { defineConfig } from '@playwright/test';

const executablePath = process.env.CHROME_EXEC;

export default defineConfig({
  testDir: './objects',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    headless: true,
    viewport: { width: 1365, height: 768 },
    launchOptions: {
      args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
      ...(executablePath ? { executablePath } : {}),
    },
  },
  webServer: {
    command: 'pnpm run preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
