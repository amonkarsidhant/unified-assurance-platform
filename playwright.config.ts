import fs from 'node:fs';
import { defineConfig } from '@playwright/test';

const demoPort = fs.existsSync('.demo-site.port') ? fs.readFileSync('.demo-site.port', 'utf8').trim() : '8790';
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${demoPort}`;

export default defineConfig({
  testDir: './tests/ui',
  timeout: 15_000,
  workers: 1,
  retries: 0,
  reporter: 'line',
  use: {
    baseURL,
    headless: true,
    trace: 'off'
  }
});
