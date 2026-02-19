#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

function run(cmd, args) {
  return spawnSync(cmd, args, { stdio: 'inherit', shell: false });
}

const pathCheck = spawnSync(
  process.execPath,
  [
    '-e',
    "import('playwright').then(({ chromium }) => { process.stdout.write(chromium.executablePath()); }).catch(() => process.exit(1));"
  ],
  { encoding: 'utf8' }
);

if (pathCheck.status === 0) {
  const executablePath = (pathCheck.stdout || '').trim();
  if (executablePath && existsSync(executablePath)) {
    process.exit(0);
  }
}

console.log('Playwright Chromium browser is missing. Installing now...');
const result = run('npx', ['playwright', 'install', 'chromium']);
process.exit(result.status ?? 1);
