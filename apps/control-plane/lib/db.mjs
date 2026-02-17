import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { dbPath, logsDir, controlPlaneRoot, runArtifactsRoot, RUN_STATES } from './config.mjs';

let db;

export function openDb(customPath = dbPath) {
  fs.mkdirSync(path.dirname(customPath), { recursive: true });
  fs.mkdirSync(logsDir, { recursive: true });
  fs.mkdirSync(runArtifactsRoot, { recursive: true });
  db = new DatabaseSync(customPath);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  initSchema(db);
  migrateRunsJsonIfPresent(db);
  return db;
}

export function getDb() {
  if (!db) return openDb();
  return db;
}

function initSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      started_at TEXT,
      finished_at TEXT,
      heartbeat_at TEXT,
      duration_ms INTEGER,
      exit_code INTEGER,
      command_json TEXT NOT NULL,
      request_json TEXT NOT NULL,
      artifacts_json TEXT NOT NULL,
      stdout_path TEXT NOT NULL,
      stderr_path TEXT NOT NULL,
      run_artifact_dir TEXT NOT NULL,
      error TEXT,
      updated_at TEXT NOT NULL,
      CHECK (status IN ('queued','running','passed','failed','canceled'))
    );

    CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);

    CREATE TABLE IF NOT EXISTS run_events (
      id TEXT PRIMARY KEY,
      run_id TEXT,
      event_type TEXT NOT NULL,
      message TEXT,
      payload_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(run_id) REFERENCES runs(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_run_events_run_id_created_at ON run_events(run_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS assurance_executions (
      id TEXT PRIMARY KEY,
      service TEXT NOT NULL,
      repo TEXT NOT NULL,
      commit_sha TEXT NOT NULL,
      branch TEXT,
      environment TEXT,
      pipeline_id TEXT,
      job_id TEXT,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      source_provider TEXT NOT NULL,
      source_version TEXT,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_assurance_exec_lookup
      ON assurance_executions(service, commit_sha, environment, started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_assurance_exec_commit_sha
      ON assurance_executions(commit_sha, started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_assurance_exec_environment
      ON assurance_executions(environment, started_at DESC);

    CREATE TABLE IF NOT EXISTS assurance_evidence (
      id TEXT PRIMARY KEY,
      execution_id TEXT NOT NULL,
      category TEXT NOT NULL,
      kind TEXT NOT NULL,
      uri TEXT,
      checksum TEXT,
      summary TEXT,
      raw_json TEXT,
      source_tool TEXT NOT NULL,
      source_tool_version TEXT,
      source_adapter TEXT NOT NULL,
      source_adapter_version TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(execution_id) REFERENCES assurance_executions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_assurance_evidence_execution
      ON assurance_evidence(execution_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS assurance_signals (
      id TEXT PRIMARY KEY,
      execution_id TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL,
      name TEXT NOT NULL,
      metric TEXT,
      value REAL,
      unit TEXT,
      severity TEXT,
      confidence REAL,
      message TEXT,
      evidence_ids_json TEXT NOT NULL,
      tags_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(execution_id) REFERENCES assurance_executions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_assurance_signals_execution
      ON assurance_signals(execution_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS assurance_decisions (
      id TEXT PRIMARY KEY,
      execution_id TEXT NOT NULL,
      outcome TEXT NOT NULL,
      summary TEXT NOT NULL,
      evaluations_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(execution_id) REFERENCES assurance_executions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_assurance_decisions_execution
      ON assurance_decisions(execution_id, created_at DESC);
  `);
}

function migrateRunsJsonIfPresent(database) {
  if (process.env.CONTROL_PLANE_DISABLE_MIGRATION === '1') return;
  const legacyPath = path.join(controlPlaneRoot, 'runs.json');
  const markerPath = path.join(controlPlaneRoot, '.runs-json-migrated');
  if (!fs.existsSync(legacyPath) || fs.existsSync(markerPath)) return;

  let runs;
  try {
    runs = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
  } catch {
    runs = [];
  }

  if (!Array.isArray(runs)) runs = [];

  const countStmt = database.prepare('SELECT COUNT(1) AS count FROM runs');
  const { count } = countStmt.get();
  if (count === 0 && runs.length > 0) {
    const insertRun = database.prepare(`
      INSERT INTO runs(
        id, type, status, created_at, started_at, finished_at, heartbeat_at, duration_ms,
        exit_code, command_json, request_json, artifacts_json, stdout_path, stderr_path,
        run_artifact_dir, error, updated_at
      ) VALUES (
        @id, @type, @status, @created_at, @started_at, @finished_at, @heartbeat_at, @duration_ms,
        @exit_code, @command_json, @request_json, @artifacts_json, @stdout_path, @stderr_path,
        @run_artifact_dir, @error, @updated_at
      )
    `);

    const now = new Date().toISOString();
    runInTransaction(database, () => {
      for (const run of runs) {
        const id = typeof run.id === 'string' && run.id ? run.id : `run_legacy_${randomUUID().slice(0, 8)}`;
        const normalizedStatus = normalizeLegacyStatus(run.status);
        if (!RUN_STATES.has(normalizedStatus)) continue;

        const artifactDir = path.join('artifacts/control-plane/runs', id);

        insertRun.run({
          id,
          type: run.type || 'assurance',
          status: normalizedStatus,
          created_at: run.createdAt || now,
          started_at: run.startedAt || null,
          finished_at: run.finishedAt || null,
          heartbeat_at: run.finishedAt || run.startedAt || run.createdAt || now,
          duration_ms: Number.isFinite(run.durationMs) ? run.durationMs : null,
          exit_code: Number.isInteger(run.exitCode) ? run.exitCode : null,
          command_json: JSON.stringify(Array.isArray(run.command) ? run.command : []),
          request_json: JSON.stringify(run.request && typeof run.request === 'object' ? run.request : {}),
          artifacts_json: JSON.stringify(run.artifacts && typeof run.artifacts === 'object' ? run.artifacts : {}),
          stdout_path: run.stdoutPath || `artifacts/control-plane/logs/${id}.stdout.log`,
          stderr_path: run.stderrPath || `artifacts/control-plane/logs/${id}.stderr.log`,
          run_artifact_dir: run.runArtifactDir || artifactDir,
          error: typeof run.error === 'string' ? run.error : null,
          updated_at: now
        });
      }
    });
  }

  fs.writeFileSync(markerPath, `${new Date().toISOString()}\n`, 'utf8');
}

function normalizeLegacyStatus(status) {
  if (status === 'completed') return 'passed';
  if (status === 'failed') return 'failed';
  if (status === 'running') return 'running';
  if (status === 'queued') return 'queued';
  return 'failed';
}

function runInTransaction(database, fn) {
  database.exec('BEGIN IMMEDIATE');
  try {
    fn();
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}
