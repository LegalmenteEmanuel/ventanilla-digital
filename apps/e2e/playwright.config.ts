import { defineConfig, devices } from '@playwright/test';

/**
 * No arranca la app: se asume que Postgres/Redis/Mailhog, `apps/web` y
 * `apps/worker` ya están corriendo (ver README → "Pruebas end-to-end").
 * Orquestar esos 4 procesos desde aquí sería más frágil que un par de
 * comandos documentados / los pasos explícitos del job de CI.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'line' : 'list',
  timeout: 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
