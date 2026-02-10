import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function normalizeTo(outputPath) {
  const result = spawnSync('python3', ['scripts/normalize-results-v2.py', '--input', 'examples/results/sample-results.json', '--output', outputPath], {
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, `normalize script failed: ${result.stderr || result.stdout}`);
}

test('normalized results satisfy required results-v2 contract fields', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'uap-contract-'));
  const normalizedPath = path.join(tmpDir, 'results.v2.json');
  normalizeTo(normalizedPath);

  const payload = JSON.parse(fs.readFileSync(normalizedPath, 'utf8'));

  assert.equal(payload.contract_version, 'results.v2');
  assert.equal(typeof payload.service, 'string');
  assert.ok(payload.service.length > 0);
  assert.equal(typeof payload.timestamp, 'string');
  assert.ok(!Number.isNaN(Date.parse(payload.timestamp)), 'timestamp must be RFC3339/date-time');

  assert.equal(typeof payload.summary, 'object');
  assert.ok(['GO', 'CONDITIONAL', 'NO-GO'].includes(payload.summary.recommendation));
  assert.ok(['low', 'medium', 'high', 'critical'].includes(payload.summary.risk_tier));
  assert.equal(typeof payload.summary.policy_validation_passed, 'boolean');

  assert.equal(typeof payload.sections, 'object');
  for (const section of ['tests', 'security', 'performance', 'policy', 'exceptions', 'evidence']) {
    assert.equal(typeof payload.sections[section], 'object', `missing sections.${section}`);
  }
});
