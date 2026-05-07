import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 3000);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const isCI = Boolean(process.env.CI);

// In CI we run a single project (chromium) for the a11y smoke. Locally,
// developers can opt into the cross-browser matrix with --project=<name>
// or `npm run test:a11y -- --project=mobile-chrome` to debug a specific
// device. Keep the CI path fast; reserve the matrix for explicit runs.
const allProjects = [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
];

const projects = isCI ? allProjects.filter((p) => p.name === 'chromium') : allProjects;

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: 1,
  workers: isCI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects,
  webServer: {
    // next.config.ts uses `output: 'standalone'`, which breaks `next start`
    // (skips copying static assets — pages render without CSS) and is fragile
    // to wire up in CI. `next dev` serves CSS correctly in every environment;
    // it is slower per-request but plenty fast for a 5-route axe smoke.
    command: `npx next dev -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
