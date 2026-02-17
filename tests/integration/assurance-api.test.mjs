import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import net from 'node:net';

function uniqueTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cp-assurance-'));
}

test('assurance ingest + query endpoints persist and return normalized data', async () => {
  const tempDir = uniqueTmpDir();
  const port = await getFreePort();
  const env = {
    ...process.env,
    CONTROL_PLANE_DB_PATH: path.join(tempDir, 'control-plane.db'),
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
    await terminateProcess(api);
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
});

test('policy evaluation returns deterministic block/allow decision with explanations', async () => {
  const tempDir = uniqueTmpDir();
  const port = await getFreePort();
  const env = {
    ...process.env,
    CONTROL_PLANE_DB_PATH: path.join(tempDir, 'control-plane.db'),
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

    await fetch(`http://127.0.0.1:${port}/ingest/execution`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: 'exec-policy',
        service: 'payments-api',
        repo: 'amonkarsidhant/unified-assurance-platform',
        commitSha: 'abc123',
        branch: 'main',
        environment: 'staging',
        startedAt: '2026-02-17T09:00:00.000Z',
        source: { provider: 'github-actions', version: '1' }
      })
    });

    await fetch(`http://127.0.0.1:${port}/ingest/signals`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        items: [
          {
            id: 'sig-policy-1',
            executionId: 'exec-policy',
            category: 'unit',
            status: 'pass',
            name: 'unit-pass-rate',
            value: 90,
            unit: '%',
            evidenceIds: [],
            createdAt: '2026-02-17T09:02:00.000Z'
          }
        ]
      })
    });

    const evalRes = await fetch(`http://127.0.0.1:${port}/policy/evaluate?executionId=exec-policy`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        rules: [
          {
            id: 'unit-hard-gate',
            name: 'Unit pass rate main gate',
            mode: 'hard',
            scope: { branches: ['main'], categories: ['unit'] },
            condition: { signalName: 'unit-pass-rate', operator: 'gte', threshold: 95 },
            failMessage: 'Unit pass rate below 95% on main'
          }
        ]
      })
    });

    assert.equal(evalRes.status, 200);
    const evalBody = await evalRes.json();
    assert.equal(evalBody.decision.outcome, 'block');
    assert.equal(evalBody.decision.evaluations[0].passed, false);

    const decisionRes = await fetch(`http://127.0.0.1:${port}/decisions/${evalBody.decision.id}`, {
      headers: { Authorization: 'Bearer secret-token' }
    });
    assert.equal(decisionRes.status, 200);
    const decisionBody = await decisionRes.json();
    assert.equal(decisionBody.decision.id, evalBody.decision.id);
  } finally {
    await terminateProcess(api);
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
});

test('ingest validation returns item index and FK violations map to 400', async () => {
  const tempDir = uniqueTmpDir();
  const port = await getFreePort();
  const env = {
    ...process.env,
    CONTROL_PLANE_DB_PATH: path.join(tempDir, 'control-plane.db'),
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

    const badEvidence = await fetch(`http://127.0.0.1:${port}/ingest/evidence`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        items: [
          {
            id: 'ev-bad',
            executionId: 'exec-1',
            category: 'bad-category',
            kind: 'artifact',
            source: { tool: 'jest', adapter: 'artifact-junit' },
            createdAt: '2026-02-17T09:01:00.000Z'
          }
        ]
      })
    });

    assert.equal(badEvidence.status, 400);
    const badEvidenceBody = await badEvidence.json();
    assert.match(badEvidenceBody.message, /index 0/i);

    const fkFail = await fetch(`http://127.0.0.1:${port}/ingest/signals`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        items: [
          {
            id: 'sig-missing-exec',
            executionId: 'missing-exec',
            category: 'unit',
            status: 'pass',
            name: 'unit-pass-rate',
            value: 90,
            unit: '%',
            evidenceIds: [],
            createdAt: '2026-02-17T09:02:00.000Z'
          }
        ]
      })
    });

    assert.equal(fkFail.status, 400);
    const fkBody = await fkFail.json();
    assert.match(fkBody.message, /invalid execution_id/i);
  } finally {
    await terminateProcess(api);
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
});

async function terminateProcess(child) {
  if (!child || child.exitCode !== null) return;

  child.kill('SIGTERM');
  const exited = await waitForExit(child, 1200);
  if (exited) return;

  child.kill('SIGKILL');
  await waitForExit(child, 1200);
}

function waitForExit(child, timeoutMs) {
  return new Promise((resolve) => {
    const onExit = () => {
      clearTimeout(timer);
      resolve(true);
    };

    const timer = setTimeout(() => {
      child.off('exit', onExit);
      resolve(false);
    }, timeoutMs);

    child.once('exit', onExit);
  });
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Unable to allocate free port')));
        return;
      }
      const { port } = address;
      server.close((error) => {
        if (error) return reject(error);
        resolve(port);
      });
    });
    server.on('error', reject);
  });
}

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
