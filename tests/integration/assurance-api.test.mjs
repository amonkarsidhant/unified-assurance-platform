import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

function uniqueTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cp-assurance-'));
}

test('assurance ingest + query endpoints persist and return normalized data', async () => {
  const tmp = uniqueTmpDir();
  const port = 43180;
  const env = {
    ...process.env,
    CONTROL_PLANE_DB_PATH: path.join(tmp, 'control-plane.db'),
    CONTROL_PLANE_PORT: String(port),
    CONTROL_PLANE_HOST: '127.0.0.1',
    CONTROL_PLANE_DISABLE_MIGRATION: '1',
    CONTROL_PLANE_API_TOKEN: 'secret-token'
  };

  const api = spawn(process.execPath, ['apps/control-plane/api/server.mjs'], {
    cwd: path.resolve('.'),
    env,
    stdio: 'ignore'
  });

  try {
    await waitForHealth(port);

    const headers = {
      Authorization: 'Bearer secret-token',
      'Content-Type': 'application/json'
    };

    const execution = {
      id: 'exec-1',
      service: 'payments-api',
      repo: 'amonkarsidhant/unified-assurance-platform',
      commitSha: 'abc123',
      branch: 'main',
      environment: 'staging',
      startedAt: '2026-02-17T09:00:00.000Z',
      source: { provider: 'github-actions', version: '1' }
    };

    const ingestExecution = await fetch(`http://127.0.0.1:${port}/ingest/execution`, {
      method: 'POST',
      headers,
      body: JSON.stringify(execution)
    });
    assert.equal(ingestExecution.status, 202);

    const ingestEvidence = await fetch(`http://127.0.0.1:${port}/ingest/evidence`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        items: [
          {
            id: 'ev-1',
            executionId: 'exec-1',
            category: 'unit',
            kind: 'artifact',
            uri: 'artifacts/junit.xml',
            source: { tool: 'jest', adapter: 'artifact-junit' },
            createdAt: '2026-02-17T09:01:00.000Z'
          }
        ]
      })
    });
    assert.equal(ingestEvidence.status, 202);

    const ingestSignals = await fetch(`http://127.0.0.1:${port}/ingest/signals`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        items: [
          {
            id: 'sig-1',
            executionId: 'exec-1',
            category: 'unit',
            status: 'pass',
            name: 'unit-pass-rate',
            value: 98.4,
            unit: '%',
            evidenceIds: ['ev-1'],
            createdAt: '2026-02-17T09:02:00.000Z'
          }
        ]
      })
    });
    assert.equal(ingestSignals.status, 202);

    const executionsRes = await fetch(`http://127.0.0.1:${port}/query/executions?service=payments-api&commitSha=abc123&environment=staging`, {
      headers: { Authorization: 'Bearer secret-token' }
    });
    assert.equal(executionsRes.status, 200);
    const executionsBody = await executionsRes.json();
    assert.equal(executionsBody.executions.length, 1);

    const evidenceRes = await fetch(`http://127.0.0.1:${port}/query/evidence?executionId=exec-1`, {
      headers: { Authorization: 'Bearer secret-token' }
    });
    const evidenceBody = await evidenceRes.json();
    assert.equal(evidenceBody.evidence.length, 1);
    assert.equal(evidenceBody.evidence[0].id, 'ev-1');

    const signalsRes = await fetch(`http://127.0.0.1:${port}/query/signals?executionId=exec-1`, {
      headers: { Authorization: 'Bearer secret-token' }
    });
    const signalsBody = await signalsRes.json();
    assert.equal(signalsBody.signals.length, 1);
    assert.equal(signalsBody.signals[0].name, 'unit-pass-rate');
  } finally {
    api.kill('SIGTERM');
  }
});

async function waitForHealth(port) {
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`API did not become healthy on port ${port}`);
}
