import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { openDb } from '../lib/db.mjs';
import { repoRoot, workerPollMs, workerHeartbeatMs } from '../lib/config.mjs';
import { claimNextQueuedRun, heartbeatRun, completeRun, reconcileStaleRunningRuns, appendEvent, getRun } from '../lib/repository.mjs';
import { finalizeRunArtifacts } from '../lib/artifacts.mjs';

openDb();

const reconciled = reconcileStaleRunningRuns();
if (reconciled > 0) {
  console.warn(`[control-plane-worker] reconciled ${reconciled} stale running run(s)`);
}

let active = false;

setInterval(async () => {
  if (active) return;
  active = true;
  try {
    const run = claimNextQueuedRun();
    if (run) await executeRun(run);
  } catch (error) {
    console.error('[control-plane-worker] loop error', error);
  } finally {
    active = false;
  }
}, workerPollMs);

console.log('[control-plane-worker] worker started');

async function executeRun(run) {
  const stdoutFile = path.resolve(repoRoot, run.stdoutPath);
  const stderrFile = path.resolve(repoRoot, run.stderrPath);
  fs.mkdirSync(path.dirname(stdoutFile), { recursive: true });
  fs.mkdirSync(path.dirname(stderrFile), { recursive: true });

  appendEvent({ runId: run.id, eventType: 'run.exec', message: 'Executing command', payload: { command: run.command } });

  const child = spawn(run.command[0], run.command.slice(1), {
    cwd: repoRoot,
    env: process.env,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const stdoutStream = fs.createWriteStream(stdoutFile, { flags: 'a' });
  const stderrStream = fs.createWriteStream(stderrFile, { flags: 'a' });
  child.stdout.pipe(stdoutStream);
  child.stderr.pipe(stderrStream);

  const closeStreams = () => {
    stdoutStream.end();
    stderrStream.end();
  };

  const heartbeatTimer = setInterval(() => {
    try {
      heartbeatRun(run.id);
    } catch (error) {
      console.error('[control-plane-worker] loop error', error);
    }
  }, workerHeartbeatMs);

  await new Promise((resolve) => {
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      closeStreams();
      resolve();
    };

    child.on('error', (err) => {
      clearInterval(heartbeatTimer);
      completeRun({ id: run.id, exitCode: -1, status: 'failed', error: `spawn_error: ${err.message}` });
      appendEvent({ runId: run.id, eventType: 'run.error', message: 'Spawn failure', payload: { error: err.message } });
      finalizeSafely(run.id);
      done();
    });

    child.on('close', (code, signal) => {
      clearInterval(heartbeatTimer);
      const success = code === 0;
      completeRun({
        id: run.id,
        exitCode: Number.isInteger(code) ? code : -1,
        status: success ? 'passed' : 'failed',
        error: success ? null : `script exited with code ${code}${signal ? ` signal=${signal}` : ''}`
      });
      finalizeSafely(run.id);
      done();
    });
  });
}

function finalizeSafely(runId) {
  try {
    const run = getRun(runId);
    if (run) finalizeRunArtifacts(run);
  } catch (error) {
    appendEvent({ runId, eventType: 'artifacts.finalize_failed', message: error.message });
  }
}
