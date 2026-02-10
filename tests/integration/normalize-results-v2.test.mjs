import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function runNormalize(inputPath, outputPath) {
  const result = spawnSync('python3', ['scripts/normalize-results-v2.py', '--input', inputPath, '--output', outputPath], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, `normalize script failed: ${result.stderr || result.stdout}`);
}

test('normalize-results-v2 emits expected top-level contract fields', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'uap-normalize-'));
  const outputPath = path.join(tmpDir, 'results.v2.json');
  runNormalize('examples/results/sample-results.json', outputPath);

  const normalized = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  assert.equal(normalized.contract_version, 'results.v2');
  assert.equal(normalized.service, 'payments-api');
  assert.equal(typeof normalized.sections, 'object');
  assert.equal(typeof normalized.sections.policy, 'object');
  assert.equal(typeof normalized.summary.policy_validation_passed, 'boolean');
});
