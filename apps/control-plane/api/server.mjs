import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');
const artifactsDir = path.join(repoRoot, 'artifacts/control-plane');
const logsDir = path.join(artifactsDir, 'logs');
const runsFile = path.join(artifactsDir, 'runs.json');

const host = process.env.CONTROL_PLANE_HOST || '0.0.0.0';
const port = Number(process.env.CONTROL_PLANE_PORT || 4172);

ensureStore();

const server = http.createServer(async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      return json(res, 200, { status: 'ok' });
    }

    if (req.method === 'GET' && url.pathname === '/runs') {
      const runs = loadRuns();
      return json(res, 200, { runs });
    }

    if (req.method === 'GET' && url.pathname.startsWith('/runs/')) {
      const id = url.pathname.split('/')[2];
      const run = loadRuns().find((r) => r.id === id);
      if (!run) return jsonError(res, 404, 'not_found', 'Run not found');
      return json(res, 200, { run });
    }

    if (req.method === 'POST' && url.pathname === '/runs/assurance') {
      const run = createRun('assurance', {}, ['./scripts/run-assurance.sh'], {
        results: 'artifacts/latest/results.json'
      });
      startRun(run.id);
      return json(res, 202, { run });
    }

    if (req.method === 'POST' && url.pathname === '/runs/resilience') {
      const run = createRun('resilience', {}, ['./scripts/run-resilience-intelligence.sh'], {
        resilience: 'artifacts/latest/resilience-intelligence.json'
      });
      startRun(run.id);
      return json(res, 202, { run });
    }

    if (req.method === 'POST' && url.pathname === '/runs/incident') {
      const body = await readBody(req);
      const payloadPath = typeof body?.payloadPath === 'string' ? body.payloadPath : '';
      const validated = validateIncidentPayload(payloadPath);
      if (!validated.ok) {
        return jsonError(res, 400, 'bad_request', 'Invalid incident payload path', {
          reason: validated.reason
        });
      }

      const relPath = path.relative(repoRoot, validated.absolutePath);
      const run = createRun(
        'incident',
        { payloadPath: relPath },
        ['./scripts/resilience-incident-trigger.py', '--payload', relPath],
        { incident: 'artifacts/latest/incident-trigger-result.json' }
      );
      startRun(run.id);
      return json(res, 202, { run });
    }

    return jsonError(res, 404, 'not_found', 'Endpoint not found');
  } catch (error) {
    console.error('[control-plane] request failure', error);
    return jsonError(res, 500, 'internal_error', 'Unexpected server error');
  }
});

server.listen(port, host, () => {
  console.log(`[control-plane] API listening on http://${host}:${port}`);
});

/**
 * Ensure the on-disk store exists for run records and logs.
 *
 * Creates the logs directory (recursively) and, if missing, initializes the runs file with an empty JSON array.
 */
function ensureStore() {
  fs.mkdirSync(logsDir, { recursive: true });
  if (!fs.existsSync(runsFile)) {
    fs.writeFileSync(runsFile, '[]\n', 'utf8');
  }
}

/**
 * Load persisted runs from the local store and return them sorted newest first by `createdAt`.
 * @returns {Array} An array of run objects sorted by `createdAt` in descending order. Returns an empty array if the store is missing, malformed, or does not contain an array.
 */
function loadRuns() {
  ensureStore();
  const raw = fs.readFileSync(runsFile, 'utf8');
  try {
    const runs = JSON.parse(raw);
    if (!Array.isArray(runs)) return [];
    return runs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch {
    return [];
  }
}

/**
 * Persist the provided runs array to the on-disk runs file.
 *
 * @param {Array<Object>} runs - Array of run objects to save; overwrites the runs file with pretty-printed JSON.
 */
function saveRuns(runs) {
  fs.writeFileSync(runsFile, `${JSON.stringify(runs, null, 2)}\n`, 'utf8');
}

/**
 * Insert or update a run in the persistent runs store.
 *
 * If a run with the same `id` already exists it is replaced; otherwise the run is added to the front
 * of the list. The updated runs list is persisted to disk.
 * @param {object} nextRun - Run object to insert or update; must include an `id` property used for matching.
 */
function upsertRun(nextRun) {
  const runs = loadRuns();
  const idx = runs.findIndex((r) => r.id === nextRun.id);
  if (idx === -1) runs.unshift(nextRun);
  else runs[idx] = nextRun;
  saveRuns(runs);
}

/**
 * Create and persist a new queued run record with metadata and log file paths.
 *
 * @param {string} type - Logical run type (e.g., "assurance", "resilience", "incident").
 * @param {object} request - Payload or metadata that initiated the run.
 * @param {string|string[]} command - Command (and optionally its arguments) to execute for the run.
 * @param {any} artifacts - Artifact descriptors associated with the run.
 * @returns {object} The created run object containing id, type, status `'queued'`, timestamps, command, request, artifacts, stdoutPath, stderrPath, and other metadata.
function createRun(type, request, command, artifacts) {
  const id = `run_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const run = {
    id,
    type,
    status: 'queued',
    createdAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
    durationMs: null,
    exitCode: null,
    command,
    request,
    artifacts,
    stdoutPath: `artifacts/control-plane/logs/${id}.stdout.log`,
    stderrPath: `artifacts/control-plane/logs/${id}.stderr.log`,
    error: null
  };

  upsertRun(run);
  console.log(`[control-plane] queued run id=${run.id} type=${run.type}`);
  return run;
}

/**
 * Start the run identified by `id` by launching its configured command and managing its lifecycle.
 *
 * Marks the run as running and records start time, streams the child process stdout/stderr to the run's log files, and updates the persisted run record on spawn failure or process exit. On completion it records finishedAt, durationMs, exitCode, status (`completed` if exit code is 0, `failed` otherwise) and an error message when applicable.
 *
 * @param {string} id - Identifier of the run to start; if no run with this id exists, the function does nothing.
 */
function startRun(id) {
  const run = loadRuns().find((r) => r.id === id);
  if (!run) return;

  const stdoutFile = path.join(repoRoot, run.stdoutPath);
  const stderrFile = path.join(repoRoot, run.stderrPath);

  const startedAt = new Date().toISOString();
  run.status = 'running';
  run.startedAt = startedAt;
  upsertRun(run);

  console.log(`[control-plane] starting run id=${run.id} type=${run.type}`);

  const child = spawn(run.command[0], run.command.slice(1), {
    cwd: repoRoot,
    env: process.env,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.pipe(fs.createWriteStream(stdoutFile, { flags: 'a' }));
  child.stderr.pipe(fs.createWriteStream(stderrFile, { flags: 'a' }));

  child.on('error', (err) => {
    const next = { ...run };
    next.status = 'failed';
    next.error = `spawn_error: ${err.message}`;
    next.finishedAt = new Date().toISOString();
    next.durationMs = Date.parse(next.finishedAt) - Date.parse(next.startedAt);
    upsertRun(next);
    console.error(`[control-plane] failed spawn id=${next.id}`, err);
  });

  child.on('close', (code) => {
    const current = loadRuns().find((r) => r.id === id) || run;
    const finishedAt = new Date().toISOString();
    current.finishedAt = finishedAt;
    current.durationMs = Date.parse(finishedAt) - Date.parse(current.startedAt || startedAt);
    current.exitCode = code;
    current.status = code === 0 ? 'completed' : 'failed';
    current.error = code === 0 ? null : `script exited with code ${code}`;
    upsertRun(current);
    console.log(`[control-plane] finished run id=${current.id} status=${current.status} code=${code}`);
  });
}

/**
 * Validate and resolve an incident payload file path, ensuring it is a .json file located inside the repository root.
 * @param {string} payloadPath - Path to the payload file (relative to repo root or absolute). Must refer to an existing `.json` file within the repository.
 * @returns {{ok: true, absolutePath: string} | {ok: false, reason: string}} `ok: true` with `absolutePath` when validation succeeds; `ok: false` with `reason` when validation fails.
 */
function validateIncidentPayload(payloadPath) {
  if (!payloadPath || typeof payloadPath !== 'string') {
    return { ok: false, reason: 'payloadPath is required' };
  }

  const resolved = path.resolve(repoRoot, payloadPath);
  if (!resolved.startsWith(repoRoot + path.sep)) {
    return { ok: false, reason: 'payload path escapes repository root' };
  }

  if (!resolved.endsWith('.json')) {
    return { ok: false, reason: 'payload must be a .json file' };
  }

  if (!fs.existsSync(resolved)) {
    return { ok: false, reason: 'payload file does not exist' };
  }

  return { ok: true, absolutePath: resolved };
}

/**
 * Parse the HTTP request body as JSON and return the resulting object.
 *
 * @param {http.IncomingMessage} req - The incoming HTTP request to read.
 * @returns {Promise<any>} The parsed JSON object, or {} if the body is empty.
 * @throws {Error} When the request body exceeds 1,000,000 bytes ('request body too large').
 * @throws {Error} When the body is not valid JSON ('invalid JSON body').
 * @throws {Error} If the request stream emits an error.
 */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('request body too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Sets permissive CORS headers on the given HTTP response to allow requests from any origin.
 * @param {import('http').ServerResponse} res - Response object to set CORS headers on.
 */
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/**
 * Send a JSON HTTP response with the specified status code and payload.
 * @param {import('http').ServerResponse} res - The HTTP response object.
 * @param {number} status - HTTP status code to send.
 * @param {*} payload - Value to serialize as the JSON response body.
 */
function json(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

/**
 * Send a standardized JSON error response.
 * @param {object} res - HTTP ServerResponse to write to.
 * @param {number} status - HTTP status code for the response.
 * @param {string} error - Short error identifier or key.
 * @param {string} message - Human-readable error message.
 * @param {any} [details] - Optional additional error details to include in the payload.
 */
function jsonError(res, status, error, message, details = undefined) {
  const payload = { error, message };
  if (details) payload.details = details;
  return json(res, status, payload);
}