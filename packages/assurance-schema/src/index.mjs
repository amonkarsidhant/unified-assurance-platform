export class ValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export const ASSURANCE_CATEGORIES = Object.freeze([
  'unit',
  'integration',
  'performance',
  'stress',
  'chaos',
  'security',
  'contract',
  'smoke',
  'e2e',
  'reliability'
]);

export const SIGNAL_STATUSES = Object.freeze(['pass', 'fail', 'warn', 'error', 'skip']);
export const DECISION_OUTCOMES = Object.freeze(['allow', 'block', 'advisory']);
export const GATE_MODES = Object.freeze(['advisory', 'hard']);
export const EVIDENCE_KINDS = Object.freeze(['artifact', 'metric', 'log', 'vuln', 'contract', 'event']);
export const SIGNAL_SEVERITIES = Object.freeze(['low', 'medium', 'high', 'critical']);

function assertRecord(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError(`${name} must be a JSON object`);
  }
}

function assertString(value, name) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${name} is required`);
  }
}

function assertIsoTimestamp(value, name) {
  assertString(value, name);
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
  if (!iso8601Regex.test(value) || Number.isNaN(Date.parse(value))) {
    throw new ValidationError(`${name} must be an ISO timestamp`);
  }
}

function assertOneOf(value, allowed, name) {
  if (!allowed.includes(value)) {
    throw new ValidationError(`${name} must be one of: ${allowed.join(', ')}`);
  }
}

function assertStringArray(value, name) {
  if (!Array.isArray(value)) throw new ValidationError(`${name} must be an array`);
  for (const item of value) assertString(item, `${name}[]`);
}

export function validateExecutionRef(input) {
  assertRecord(input, 'execution');
  assertString(input.id, 'execution.id');
  assertString(input.service, 'execution.service');
  assertString(input.repo, 'execution.repo');
  assertString(input.commitSha, 'execution.commitSha');
  assertIsoTimestamp(input.startedAt, 'execution.startedAt');
  if (input.finishedAt != null) assertIsoTimestamp(input.finishedAt, 'execution.finishedAt');

  assertRecord(input.source, 'execution.source');
  assertString(input.source.provider, 'execution.source.provider');

  return {
    id: input.id,
    service: input.service,
    repo: input.repo,
    commitSha: input.commitSha,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt || null,
    branch: input.branch || null,
    environment: input.environment || null,
    pipelineId: input.pipelineId || null,
    jobId: input.jobId || null,
    source: {
      provider: input.source.provider,
      version: input.source.version || null
    }
  };
}

export function validateEvidenceRef(input) {
  assertRecord(input, 'evidence');
  assertString(input.id, 'evidence.id');
  assertString(input.executionId, 'evidence.executionId');
  assertOneOf(input.category, ASSURANCE_CATEGORIES, 'evidence.category');
  assertOneOf(input.kind, EVIDENCE_KINDS, 'evidence.kind');
  assertIsoTimestamp(input.createdAt, 'evidence.createdAt');
  assertRecord(input.source, 'evidence.source');
  assertString(input.source.tool, 'evidence.source.tool');
  assertString(input.source.adapter, 'evidence.source.adapter');

  return {
    id: input.id,
    executionId: input.executionId,
    category: input.category,
    kind: input.kind,
    createdAt: input.createdAt,
    uri: input.uri || null,
    checksum: input.checksum || null,
    summary: input.summary || null,
    raw: input.raw && typeof input.raw === 'object' && !Array.isArray(input.raw) ? input.raw : null,
    source: {
      tool: input.source.tool,
      toolVersion: input.source.toolVersion || null,
      adapter: input.source.adapter,
      adapterVersion: input.source.adapterVersion || null
    }
  };
}

export function validateSignal(input) {
  assertRecord(input, 'signal');
  assertString(input.id, 'signal.id');
  assertString(input.executionId, 'signal.executionId');
  assertOneOf(input.category, ASSURANCE_CATEGORIES, 'signal.category');
  assertOneOf(input.status, SIGNAL_STATUSES, 'signal.status');
  assertString(input.name, 'signal.name');
  assertIsoTimestamp(input.createdAt, 'signal.createdAt');
  const evidenceIds = input.evidenceIds == null ? [] : input.evidenceIds;
  assertStringArray(evidenceIds, 'signal.evidenceIds');

  if (input.value != null && !Number.isFinite(input.value)) {
    throw new ValidationError('signal.value must be a finite number');
  }

  if (input.confidence != null && (!Number.isFinite(input.confidence) || input.confidence < 0 || input.confidence > 1)) {
    throw new ValidationError('signal.confidence must be between 0 and 1');
  }

  if (input.severity != null) {
    assertOneOf(input.severity, SIGNAL_SEVERITIES, 'signal.severity');
  }

  return {
    id: input.id,
    executionId: input.executionId,
    category: input.category,
    status: input.status,
    name: input.name,
    createdAt: input.createdAt,
    metric: input.metric || null,
    value: input.value ?? null,
    unit: input.unit || null,
    severity: input.severity || null,
    confidence: input.confidence ?? null,
    message: input.message || null,
    evidenceIds,
    tags: input.tags && typeof input.tags === 'object' && !Array.isArray(input.tags) ? input.tags : null
  };
}
