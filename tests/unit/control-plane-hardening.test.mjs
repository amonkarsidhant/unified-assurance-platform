import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { openDb, getDb } from '../../apps/control-plane/lib/db.mjs';
import { buildRunRequest } from '../../apps/control-plane/lib/runs.mjs';
import { createQueuedRun, claimNextQueuedRun, completeRun, getRun, reconcileStaleRunningRuns } from '../../apps/control-plane/lib/repository.mjs';

function uniqueTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cp-hardening-'));
}

test('lifecycle transition queued -> running -> passed is persisted', async () => {
  const tmp = uniqueTmpDir();
  process.env.CONTROL_PLANE_DB_PATH = path.join(tmp, 'control-plane.db');
  process.env.CONTROL_PLANE_DISABLE_MIGRATION = '1';

  openDb(process.env.CONTROL_PLANE_DB_PATH);
  const draft = buildRunRequest('assurance', {});
  const queued = createQueuedRun(draft);
  assert.equal(queued.status, 'queued');

  const running = claimNextQueuedRun();
  assert.equal(running.status, 'running');

  const finished = completeRun({ id: running.id, exitCode: 0, status: 'passed' });
  assert.equal(finished.status, 'passed');

  const loaded = getRun(running.id);
  assert.equal(loaded.status, 'passed');
  assert.equal(loaded.exitCode, 0);
  assert.ok(Number.isInteger(loaded.durationMs));
});

test('stale running run reconciliation marks run failed', async () => {
  const tmp = uniqueTmpDir();
  process.env.CONTROL_PLANE_DB_PATH = path.join(tmp, 'control-plane.db');
  process.env.CONTROL_PLANE_DISABLE_MIGRATION = '1';
  process.env.CONTROL_PLANE_STALE_RUN_TIMEOUT_MS = '1';

  openDb(process.env.CONTROL_PLANE_DB_PATH);
  const queued = createQueuedRun(buildRunRequest('assurance', {}));
  const running = claimNextQueuedRun();
  assert.equal(running.id, queued.id);

  const veryOld = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  getDb().prepare("UPDATE runs SET heartbeat_at=?, started_at=?, updated_at=? WHERE id=?").run(veryOld, veryOld, veryOld, running.id);

  const reconciled = reconcileStaleRunningRuns();
  assert.equal(reconciled, 1);

  const after = getRun(running.id);
  assert.equal(after.status, 'failed');
  assert.match(after.error, /stale_run_reconciled/);
});

test('auth enforcement requires token for non-health endpoints', async () => {
  const tmp = uniqueTmpDir();
  const port = 43172;
  const env = {
    ...process.env,
    CONTROL_PLANE_DB_PATH: path.join(tmp, 'control-plane.db'),
    CONTROL_PLANE_PORT: String(port),
    CONTROL_PLANE_HOST: '127.0.0.1',
    CONTROL_PLANE_API_TOKEN: 'secret-token',
    CONTROL_PLANE_DISABLE_MIGRATION: '1'
  };

  const api = spawn(process.execPath, ['apps/control-plane/api/server.mjs'], {
    cwd: path.resolve('.'),
    env,
    stdio: 'ignore'
  });

  try {
    await waitForHealth(port);
    const unauthorized = await fetch(`http://127.0.0.1:${port}/runs`);
    assert.equal(unauthorized.status, 401);

    const authorized = await fetch(`http://127.0.0.1:${port}/runs`, {
      headers: { Authorization: 'Bearer secret-token' }
    });
    assert.equal(authorized.status, 200);
  } finally {
    api.kill('SIGTERM');
  }
});

test('incident payload validation rejects traversal paths', async () => {
  const tmp = uniqueTmpDir();
  const port = 43173;
  const env = {
    ...process.env,
    CONTROL_PLANE_DB_PATH: path.join(tmp, 'control-plane.db'),
    CONTROL_PLANE_PORT: String(port),
    CONTROL_PLANE_HOST: '127.0.0.1',
    CONTROL_PLANE_DISABLE_MIGRATION: '1'
  };

  const api = spawn(process.execPath, ['apps/control-plane/api/server.mjs'], {
    cwd: path.resolve('.'),
    env,
    stdio: 'ignore'
  });

  try {
    await waitForHealth(port);

    const bad = await fetch(`http://127.0.0.1:${port}/runs/incident`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payloadPath: '../../etc/passwd' })
    });

    assert.equal(bad.status, 400);
    const data = await bad.json();
    assert.equal(data.error, 'bad_request');
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
