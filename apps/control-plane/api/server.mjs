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

function ensureStore() {
  fs.mkdirSync(logsDir, { recursive: true });
  if (!fs.existsSync(runsFile)) {
    fs.writeFileSync(runsFile, '[]\n', 'utf8');
  }
}

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

function saveRuns(runs) {
  fs.writeFileSync(runsFile, `${JSON.stringify(runs, null, 2)}\n`, 'utf8');
}

function upsertRun(nextRun) {
  const runs = loadRuns();
  const idx = runs.findIndex((r) => r.id === nextRun.id);
  if (idx === -1) runs.unshift(nextRun);
  else runs[idx] = nextRun;
  saveRuns(runs);
}

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

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function json(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function jsonError(res, status, error, message, details = undefined) {
  const payload = { error, message };
  if (details) payload.details = details;
  return json(res, status, payload);
}
