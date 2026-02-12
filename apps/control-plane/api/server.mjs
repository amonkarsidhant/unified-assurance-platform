import http from 'node:http';
import { openDb } from '../lib/db.mjs';
import { host, port } from '../lib/config.mjs';
import { isAuthorized } from '../lib/auth.mjs';
import { buildRunRequest } from '../lib/runs.mjs';
import { createQueuedRun, listRuns, getRun, appendEvent, listRunEvents } from '../lib/repository.mjs';
import { createRunArtifactSkeleton } from '../lib/artifacts.mjs';
import { validateIncidentBody, validateJsonBody } from '../lib/validation.mjs';
import { json, jsonError, readBody, setCors } from '../lib/http.mjs';

openDb();

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

    if (!isAuthorized(req)) {
      return jsonError(res, 401, 'unauthorized', 'Missing or invalid API token');
    }

    if (req.method === 'GET' && url.pathname === '/runs') {
      const runs = listRuns();
      return json(res, 200, { runs });
    }

    if (req.method === 'GET' && /^\/runs\/[a-zA-Z0-9_-]+$/.test(url.pathname)) {
      const id = url.pathname.split('/')[2];
      const run = getRun(id);
      if (!run) return jsonError(res, 404, 'not_found', 'Run not found');
      return json(res, 200, { run, events: listRunEvents(id) });
    }

    if (req.method === 'POST' && url.pathname === '/runs/assurance') {
      return queueRun(res, req, 'assurance', {});
    }

    if (req.method === 'POST' && url.pathname === '/runs/resilience') {
      return queueRun(res, req, 'resilience', {});
    }

    if (req.method === 'POST' && url.pathname === '/runs/incident') {
      const raw = await readBody(req);
      const body = validateJsonBody(raw);
      const validated = validateIncidentBody(body);
      if (!validated.ok) {
        return jsonError(res, 400, 'bad_request', 'Invalid incident payload path', { reason: validated.reason });
      }
      return queueRun(res, req, 'incident', { payloadPath: validated.payloadPath });
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

function queueRun(res, req, type, request) {
  const draft = buildRunRequest(type, request);
  const run = createQueuedRun(draft);
  createRunArtifactSkeleton(run);
  appendEvent({
    runId: run.id,
    eventType: 'audit.trigger',
    message: `Run triggered: ${type}`,
    payload: {
      ip: req.socket.remoteAddress,
      userAgent: req.headers['user-agent'] || null,
      type,
      request
    }
  });
  return json(res, 202, { run });
}
