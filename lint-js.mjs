#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const files = ['demo/site/app.js', 'tests/perf/smoke.js'];
let hasError = false;

for (const file of files) {
  const syntax = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (syntax.status !== 0) {
    process.stderr.write(syntax.stderr || syntax.stdout);
    hasError = true;
  }

  const text = fs.readFileSync(file, 'utf8');
  if (/\b(TODO|FIXME)\b/.test(text)) {
    console.error(`Lint failure: ${file} contains TODO/FIXME markers.`);
    hasError = true;
  }

  if (/[ 	]+$/m.test(text)) {
    console.error(`Lint failure: ${file} contains trailing whitespace.`);
    hasError = true;
  }
}

if (hasError) {
  process.exit(1);
}

console.log(`Lint passed for ${files.length} JavaScript files.`);
