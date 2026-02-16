import { randomUUID } from 'node:crypto';
import { getDb } from './db.mjs';
import { staleRunTimeoutMs } from './config.mjs';

function nowIso() {
  return new Date().toISOString();
}

function fromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    createdAt: row.created_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    heartbeatAt: row.heartbeat_at,
    durationMs: row.duration_ms,
    exitCode: row.exit_code,
    command: JSON.parse(row.command_json),
    request: JSON.parse(row.request_json),
    artifacts: JSON.parse(row.artifacts_json),
    stdoutPath: row.stdout_path,
    stderrPath: row.stderr_path,
    runArtifactDir: row.run_artifact_dir,
    error: row.error,
    updatedAt: row.updated_at
  };
}

export function createQueuedRun({ id, type, command, request, artifacts, stdoutPath, stderrPath, runArtifactDir }) {
  const db = getDb();
  const createdAt = nowIso();
  const stmt = db.prepare(`
    INSERT INTO runs(
      id, type, status, created_at, started_at, finished_at, heartbeat_at, duration_ms, exit_code,
      command_json, request_json, artifacts_json, stdout_path, stderr_path, run_artifact_dir, error, updated_at
    ) VALUES (
      @id, @type, 'queued', @created_at, NULL, NULL, @heartbeat_at, NULL, NULL,
      @command_json, @request_json, @artifacts_json, @stdout_path, @stderr_path, @run_artifact_dir, NULL, @updated_at
    )
  `);

  stmt.run({
    id,
    type,
    created_at: createdAt,
    heartbeat_at: createdAt,
    command_json: JSON.stringify(command),
    request_json: JSON.stringify(request || {}),
    artifacts_json: JSON.stringify(artifacts || {}),
    stdout_path: stdoutPath,
    stderr_path: stderrPath,
    run_artifact_dir: runArtifactDir,
    updated_at: createdAt
  });

  appendEvent({ runId: id, eventType: 'run.queued', message: `Run queued for ${type}` });
  return getRun(id);
}

export function listRuns(limit = 200) {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM runs ORDER BY created_at DESC LIMIT ?').all(limit);
  return rows.map(fromRow);
}

export function getRun(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM runs WHERE id = ?').get(id);
  return fromRow(row);
}

export function appendEvent({ runId = null, eventType, message = null, payload = null }) {
  const db = getDb();
  db.prepare(`
    INSERT INTO run_events(id, run_id, event_type, message, payload_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), runId, eventType, message, payload ? JSON.stringify(payload) : null, nowIso());
}

export function listRunEvents(runId, limit = 100) {
  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM run_events WHERE run_id = ? ORDER BY created_at DESC LIMIT ?')
    .all(runId, limit);
  return rows.map((row) => ({
    id: row.id,
    runId: row.run_id,
    eventType: row.event_type,
    message: row.message,
    payload: row.payload_json ? JSON.parse(row.payload_json) : null,
    createdAt: row.created_at
  }));
}

export function claimNextQueuedRun() {
  const db = getDb();
  db.exec('BEGIN IMMEDIATE');
  try {
    const row = db.prepare("SELECT id FROM runs WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1").get();
    if (!row) {
      db.exec('COMMIT');
      return null;
    }
    const id = row.id;
    const startedAt = nowIso();
    const result = db
      .prepare(
        "UPDATE runs SET status='running', started_at=?, heartbeat_at=?, updated_at=? WHERE id=? AND status='queued'"
      )
      .run(startedAt, startedAt, startedAt, id);
    if (result.changes === 0) {
      db.exec('COMMIT');
      return null;
    }

    appendEvent({ runId: id, eventType: 'run.started', message: 'Worker started run execution' });
    db.exec('COMMIT');
    return getRun(id);
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function heartbeatRun(id) {
  const db = getDb();
  db.prepare("UPDATE runs SET heartbeat_at=?, updated_at=? WHERE id=? AND status='running'").run(nowIso(), nowIso(), id);
}

export function completeRun({ id, exitCode, error = null, status }) {
  const db = getDb();
  const current = getRun(id);
  if (!current || current.status !== 'running') return null;

  const finishedAt = nowIso();
  const startedAt = current.startedAt || finishedAt;
  const durationMs = Math.max(0, Date.parse(finishedAt) - Date.parse(startedAt));
  db.prepare(
    `UPDATE runs
       SET status=?, finished_at=?, heartbeat_at=?, duration_ms=?, exit_code=?, error=?, updated_at=?
     WHERE id=? AND status='running'`
  ).run(status, finishedAt, finishedAt, durationMs, exitCode, error, finishedAt, id);

  appendEvent({
    runId: id,
    eventType: `run.${status}`,
    message: status === 'passed' ? 'Run finished successfully' : 'Run finished with failure',
    payload: { exitCode, error }
  });
  return getRun(id);
}

export function reconcileStaleRunningRuns() {
  const db = getDb();
  const threshold = new Date(Date.now() - staleRunTimeoutMs).toISOString();
  const stale = db
    .prepare("SELECT id, started_at, heartbeat_at FROM runs WHERE status='running' AND COALESCE(heartbeat_at, started_at, created_at) < ?")
    .all(threshold);

  if (stale.length === 0) return 0;

  db.exec('BEGIN IMMEDIATE');
  try {
    const finishedAt = nowIso();
    for (const row of stale) {
      const startedAt = row.started_at || finishedAt;
      const durationMs = Math.max(0, Date.parse(finishedAt) - Date.parse(startedAt));
      db.prepare(
        `UPDATE runs
           SET status='failed', finished_at=?, heartbeat_at=?, duration_ms=?, error=?, updated_at=?
         WHERE id=? AND status='running'`
      ).run(
        finishedAt,
        finishedAt,
        durationMs,
        'stale_run_reconciled: worker heartbeat expired before completion',
        finishedAt,
        row.id
      );
      appendEvent({ runId: row.id, eventType: 'run.reconciled', message: 'Stale running run reconciled to failed' });
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  return stale.length;
}

// end of repository module
