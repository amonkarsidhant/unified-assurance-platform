import http from 'node:http';
import { openDb } from '../lib/db.mjs';
import { host, port } from '../lib/config.mjs';
import { isAuthorized } from '../lib/auth.mjs';
import { buildRunRequest } from '../lib/runs.mjs';
import { createQueuedRun, listRuns, getRun, appendEvent, listRunEvents } from '../lib/repository.mjs';
import {
  upsertExecution,
  insertEvidence,
  insertSignals,
  listAssuranceExecutions,
  listAssuranceEvidence,
  listAssuranceSignals,
  getAssuranceExecution,
  insertAssuranceDecision,
  getAssuranceDecision
} from '../lib/assurance-repository.mjs';
import { createRunArtifactSkeleton } from '../lib/artifacts.mjs';
import { validateIncidentBody, validateJsonBody } from '../lib/validation.mjs';
import { ValidationError, validateExecutionRef, validateEvidenceRef, validateSignal } from '../../../packages/assurance-schema/src/index.mjs';
import { json, jsonError, readBody, setCors } from '../lib/http.mjs';
import { evaluatePolicies } from '../../../packages/policy-engine/src/index.mjs';

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

    if (req.method === 'POST' && url.pathname === '/ingest/execution') {
      const payload = validateJsonBody(await readBody(req));
      const execution = validateExecutionRef(payload);
      upsertExecution(execution);
      return json(res, 202, { executionId: execution.id });
    }

    if (req.method === 'POST' && url.pathname === '/ingest/evidence') {
      const payload = validateJsonBody(await readBody(req));
      if (!Array.isArray(payload.items)) {
        return jsonError(res, 400, 'bad_request', 'items array is required');
      }
      const evidence = validateItemsWithIndex(payload.items, validateEvidenceRef, 'evidence');
      try {
        insertEvidence(evidence);
      } catch (error) {
        if (isExecutionForeignKeyConstraint(error)) {
          return jsonError(res, 400, 'bad_request', 'Invalid execution_id: execution does not exist for one or more evidence items');
        }
        if (isCrossExecutionIdConflict(error)) {
          return jsonError(res, 400, 'bad_request', error.message);
        }
        throw error;
      }
      return json(res, 202, { ingested: evidence.length });
    }

    if (req.method === 'POST' && url.pathname === '/ingest/signals') {
      const payload = validateJsonBody(await readBody(req));
      if (!Array.isArray(payload.items)) {
        return jsonError(res, 400, 'bad_request', 'items array is required');
      }
      const signals = validateItemsWithIndex(payload.items, validateSignal, 'signal');
      try {
        insertSignals(signals);
      } catch (error) {
        if (isExecutionForeignKeyConstraint(error)) {
          return jsonError(res, 400, 'bad_request', 'Invalid execution_id: execution does not exist for one or more signal items');
        }
        if (isCrossExecutionIdConflict(error)) {
          return jsonError(res, 400, 'bad_request', error.message);
        }
        throw error;
      }
      return json(res, 202, { ingested: signals.length });
    }

    if (req.method === 'GET' && url.pathname === '/query/executions') {
      const service = url.searchParams.get('service');
      const commitSha = url.searchParams.get('commitSha');
      const environment = url.searchParams.get('environment');
      const limit = parseInt(url.searchParams.get('limit') || '100', 10);
      const offset = parseInt(url.searchParams.get('offset') || '0', 10);
      const executions = listAssuranceExecutions({
        service: service || null,
        commitSha: commitSha || null,
        environment: environment || null,
        limit: Number.isFinite(limit) && limit > 0 ? limit : 100,
        offset: Number.isFinite(offset) && offset >= 0 ? offset : 0
      });
      return json(res, 200, { executions });
    }

    if (req.method === 'GET' && url.pathname === '/query/evidence') {
      const executionId = url.searchParams.get('executionId');
      if (!executionId) return jsonError(res, 400, 'bad_request', 'executionId is required');
      return json(res, 200, { evidence: listAssuranceEvidence(executionId) });
    }

    if (req.method === 'GET' && url.pathname === '/query/signals') {
      const executionId = url.searchParams.get('executionId');
      if (!executionId) return jsonError(res, 400, 'bad_request', 'executionId is required');
      return json(res, 200, { signals: listAssuranceSignals(executionId) });
    }

    if (req.method === 'POST' && url.pathname === '/policy/evaluate') {
      const executionId = url.searchParams.get('executionId');
      if (!executionId) return jsonError(res, 400, 'bad_request', 'executionId is required');

      const execution = getAssuranceExecution(executionId);
      if (!execution) return jsonError(res, 404, 'not_found', 'Execution not found');

      const payload = validateJsonBody(await readBody(req));
      if (!Array.isArray(payload.rules)) {
        return jsonError(res, 400, 'bad_request', 'rules array is required');
      }

      const rulesValidationError = validatePolicyRules(payload.rules);
      if (rulesValidationError) {
        return jsonError(res, 400, 'bad_request', rulesValidationError);
      }

      const decision = evaluatePolicies({
        execution,
        signals: listAssuranceSignals(executionId),
        rules: payload.rules
      });
      insertAssuranceDecision(decision);
      return json(res, 200, { decision });
    }

    if (req.method === 'GET' && /^\/decisions\/[a-zA-Z0-9_-]+$/.test(url.pathname)) {
      const id = url.pathname.split('/')[2];
      const decision = getAssuranceDecision(id);
      if (!decision) return jsonError(res, 404, 'not_found', 'Decision not found');
      return json(res, 200, { decision });
    }

    return jsonError(res, 404, 'not_found', 'Endpoint not found');
  } catch (error) {
    if (error?.code === 'PAYLOAD_TOO_LARGE' || error?.statusCode === 413) {
      return jsonError(res, 413, 'payload_too_large', 'Request body exceeds 1 MB limit');
    }
    if (error instanceof ValidationError) {
      return jsonError(res, 400, 'bad_request', error.message, error.details ? { details: error.details } : undefined);
    }
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

function validateItemsWithIndex(items, validator, itemType) {
  const validated = [];
  for (let i = 0; i < items.length; i += 1) {
    try {
      validated.push(validator(items[i]));
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(`${itemType} item at index ${i} failed validation: ${error.message}`, {
          index: i,
          itemType
        });
      }
      throw error;
    }
  }
  return validated;
}

const ALLOWED_POLICY_OPERATORS = new Set(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'exists']);

function validatePolicyRules(rules) {
  for (let i = 0; i < rules.length; i += 1) {
    const operator = rules[i]?.condition?.operator;
    if (operator && !ALLOWED_POLICY_OPERATORS.has(operator)) {
      return `rules[${i}].condition.operator must be one of: ${Array.from(ALLOWED_POLICY_OPERATORS).join(', ')}`;
    }
  }
  return null;
}

function isExecutionForeignKeyConstraint(error) {
  if (!(error instanceof Error)) return false;
  const code = error.code || '';
  const message = error.message || '';
  return code.includes('SQLITE_CONSTRAINT') || /FOREIGN KEY constraint failed|constraint failed/i.test(message);
}

function isCrossExecutionIdConflict(error) {
  return error instanceof Error && /already exists for a different execution/i.test(error.message);
}
