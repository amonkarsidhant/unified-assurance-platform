import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function loadJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

for (const fixture of ['examples/results/demo-happy.json', 'examples/results/demo-broken.json']) {
  test(`fixture shape is valid: ${fixture}`, () => {
    const data = loadJson(fixture);
    assert.equal(typeof data.service, 'string');
    assert.equal(typeof data.timestamp, 'string');
    assert.equal(typeof data.metrics.test_pass_rate, 'number');
    assert.ok(data.metrics.test_pass_rate >= 0 && data.metrics.test_pass_rate <= 1);

    for (const [name, status] of Object.entries(data.tests)) {
      assert.ok(['pass', 'fail', 'skipped'].includes(status), `invalid status for ${name}`);
    }
  });
}

test('happy path outperforms broken path', () => {
  const happy = loadJson('examples/results/demo-happy.json');
  const broken = loadJson('examples/results/demo-broken.json');

  assert.ok(happy.metrics.test_pass_rate > broken.metrics.test_pass_rate);
  assert.ok(happy.metrics.p95_latency_ms < broken.metrics.p95_latency_ms);
  assert.ok(happy.metrics.high_vulnerabilities <= broken.metrics.high_vulnerabilities);
});
