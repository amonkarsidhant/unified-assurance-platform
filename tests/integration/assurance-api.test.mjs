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

    const executionIngestRes = await fetch(`http://127.0.0.1:${port}/ingest/execution`, {
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
    assert.equal(executionIngestRes.status, 202);

    const signalsIngestRes = await fetch(`http://127.0.0.1:${port}/ingest/signals`, {
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
    assert.equal(signalsIngestRes.status, 202);

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

    const allowRes = await fetch(`http://127.0.0.1:${port}/policy/evaluate?executionId=exec-policy`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        rules: [
          {
            id: 'all-pass',
            name: 'Unit pass rate >= 80',
            mode: 'hard',
            scope: { branches: ['main'], categories: ['unit'] },
            condition: { signalName: 'unit-pass-rate', operator: 'gte', threshold: 80 },
            failMessage: 'Unit pass rate below 80% on main'
          }
        ]
      })
    });
    assert.equal(allowRes.status, 200);
    const allowBody = await allowRes.json();
    assert.equal(allowBody.decision.outcome, 'allow');

    const advisoryRes = await fetch(`http://127.0.0.1:${port}/policy/evaluate?executionId=exec-policy`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        rules: [
          {
            id: 'advisory-fail',
            name: 'Advisory unit pass rate >= 95',
            mode: 'advisory',
            scope: { branches: ['main'], categories: ['unit'] },
            condition: { signalName: 'unit-pass-rate', operator: 'gte', threshold: 95 },
            failMessage: 'Unit pass rate below 95% on main'
          }
        ]
      })
    });
    assert.equal(advisoryRes.status, 200);
    const advisoryBody = await advisoryRes.json();
    assert.equal(advisoryBody.decision.outcome, 'advisory');

    const scopedRes = await fetch(`http://127.0.0.1:${port}/policy/evaluate?executionId=exec-policy`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        rules: [
          {
            id: 'main-only-rule',
            name: 'Main-only strict rule',
            mode: 'hard',
            scope: { branches: ['release'], categories: ['unit'] },
            condition: { signalName: 'unit-pass-rate', operator: 'gte', threshold: 99 },
            failMessage: 'Should not fail outside scope'
          }
        ]
      })
    });
    assert.equal(scopedRes.status, 200);
    const scopedBody = await scopedRes.json();
    assert.equal(scopedBody.decision.outcome, 'allow');
    assert.equal(scopedBody.decision.evaluations[0].skipped, true);

    const badOperatorRes = await fetch(`http://127.0.0.1:${port}/policy/evaluate?executionId=exec-policy`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        rules: [
          {
            id: 'bad-op',
            name: 'Bad op',
            mode: 'hard',
            scope: { branches: ['main'], categories: ['unit'] },
            condition: { signalName: 'unit-pass-rate', operator: 'gtee', threshold: 95 },
            failMessage: 'Bad operator should not 500'
          }
        ]
      })
    });
    assert.equal(badOperatorRes.status, 400);
    const badOperatorBody = await badOperatorRes.json();
    assert.match(badOperatorBody.message, /operator/i);
    assert.match(badOperatorBody.message, /gtee|eq|ne|gt|gte|lt|lte|in|exists/i);

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

test('adapter ingestion (github actions + junit) powers flaky baseline report', async () => {
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

    const ghaPayload = {
      service: 'payments-api',
      environment: 'ci',
      workflow_run: {
        id: 2001,
        head_sha: 'abc123',
        head_branch: 'main',
        run_started_at: '2026-02-17T09:00:00.000Z',
        updated_at: '2026-02-17T09:05:00.000Z',
        repository: { name: 'unified-assurance-platform', full_name: 'amonkarsidhant/unified-assurance-platform' }
      }
    };

    const ghaRes = await fetch(`http://127.0.0.1:${port}/ingest/adapter/github-actions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(ghaPayload)
    });
    assert.equal(ghaRes.status, 202);

    const junitPass = `<testsuite><testcase classname="auth" name="login"/></testsuite>`;
    const junitFail = `<testsuite><testcase classname="auth" name="login"><failure>flaky timeout</failure></testcase></testsuite>`;

    const junitRes1 = await fetch(`http://127.0.0.1:${port}/ingest/adapter/junit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ executionId: 'gha-2001', tool: 'jest', xml: junitPass })
    });
    assert.equal(junitRes1.status, 202);

    // second run same testcase but fail
    const ghaRes2 = await fetch(`http://127.0.0.1:${port}/ingest/adapter/github-actions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...ghaPayload, workflow_run: { ...ghaPayload.workflow_run, id: 2002, updated_at: '2026-02-17T09:10:00.000Z' } })
    });
    assert.equal(ghaRes2.status, 202);

    const junitRes2 = await fetch(`http://127.0.0.1:${port}/ingest/adapter/junit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ executionId: 'gha-2002', tool: 'jest', xml: junitFail })
    });
    assert.equal(junitRes2.status, 202);

    const flakyRes = await fetch(`http://127.0.0.1:${port}/analytics/flaky?service=payments-api&lookbackRuns=20&limit=10`, {
      headers: { Authorization: 'Bearer secret-token' }
    });
    assert.equal(flakyRes.status, 200);
    const flakyBody = await flakyRes.json();
    assert.ok(Array.isArray(flakyBody.flakyTests));
    assert.equal(flakyBody.flakyTests[0].testCase, 'login');
    assert.ok(flakyBody.flakyTests[0].flakyScore > 0);
  } finally {
    await terminateProcess(api);
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
});

test('junit adapter maps missing execution FK violations to 400 bad_request', async () => {
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

    const res = await fetch(`http://127.0.0.1:${port}/ingest/adapter/junit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        executionId: 'missing-exec',
        tool: 'jest',
        xml: '<testsuite><testcase classname="auth" name="login"/></testsuite>'
      })
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /invalid execution_id/i);
  } finally {
    await terminateProcess(api);
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
});

test('flaky baseline keeps distinct classes separate and handles self-closing failures', async () => {
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

    const run1 = await fetch(`http://127.0.0.1:${port}/ingest/adapter/github-actions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(mkWorkflowRun(3001, '2026-02-17T09:05:00.000Z'))
    });
    assert.equal(run1.status, 202);

    const run2 = await fetch(`http://127.0.0.1:${port}/ingest/adapter/github-actions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(mkWorkflowRun(3002, '2026-02-17T09:10:00.000Z'))
    });
    assert.equal(run2.status, 202);

    const passInClassA = await fetch(`http://127.0.0.1:${port}/ingest/adapter/junit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        executionId: 'gha-3001',
        tool: 'jest',
        xml: '<testsuite><testcase classname="suite.A" name="should work"/></testsuite>'
      })
    });
    assert.equal(passInClassA.status, 202);

    const failInClassB = await fetch(`http://127.0.0.1:${port}/ingest/adapter/junit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        executionId: 'gha-3002',
        tool: 'jest',
        xml: '<testsuite><testcase classname="suite.B" name="should work"><failure type="AssertionError"/></testcase></testsuite>'
      })
    });
    assert.equal(failInClassB.status, 202);

    const flakyRes = await fetch(`http://127.0.0.1:${port}/analytics/flaky?service=payments-api&lookbackRuns=20&limit=10`, {
      headers: { Authorization: 'Bearer secret-token' }
    });
    assert.equal(flakyRes.status, 200);
    const flakyBody = await flakyRes.json();

    assert.ok(Array.isArray(flakyBody.flakyTests));
    assert.equal(flakyBody.flakyTests.length, 0);
  } finally {
    await terminateProcess(api);
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
});

test('junit parser keeps self-closing testcase separate from following closed testcase', async () => {
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

    const run1 = await fetch(`http://127.0.0.1:${port}/ingest/adapter/github-actions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(mkWorkflowRun(4001, '2026-02-17T09:05:00.000Z'))
    });
    assert.equal(run1.status, 202);

    const run2 = await fetch(`http://127.0.0.1:${port}/ingest/adapter/github-actions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(mkWorkflowRun(4002, '2026-02-17T09:10:00.000Z'))
    });
    assert.equal(run2.status, 202);

    const junitRun1 = await fetch(`http://127.0.0.1:${port}/ingest/adapter/junit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        executionId: 'gha-4001',
        tool: 'jest',
        xml: '<testsuite><testcase classname="auth" name="login"/></testsuite>'
      })
    });
    assert.equal(junitRun1.status, 202);

    const junitRun2 = await fetch(`http://127.0.0.1:${port}/ingest/adapter/junit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        executionId: 'gha-4002',
        tool: 'jest',
        xml: '<testsuite><testcase classname="auth" name="setup"/><testcase classname="auth" name="login"><failure>timeout</failure></testcase></testsuite>'
      })
    });
    assert.equal(junitRun2.status, 202);

    const flakyRes = await fetch(`http://127.0.0.1:${port}/analytics/flaky?service=payments-api&lookbackRuns=20&limit=10`, {
      headers: { Authorization: 'Bearer secret-token' }
    });
    assert.equal(flakyRes.status, 200);
    const flakyBody = await flakyRes.json();

    assert.ok(Array.isArray(flakyBody.flakyTests));
    assert.equal(flakyBody.flakyTests[0]?.testCase, 'login');
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


function mkWorkflowRun(id, updatedAt, service = 'payments-api') {
  return {
    service,
    environment: 'ci',
    workflow_run: {
      id,
      head_sha: `sha-${id}`,
      head_branch: 'main',
      run_started_at: '2026-02-17T09:00:00.000Z',
      updated_at: updatedAt,
      repository: { name: 'unified-assurance-platform', full_name: 'amonkarsidhant/unified-assurance-platform' }
    }
  };
}

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
