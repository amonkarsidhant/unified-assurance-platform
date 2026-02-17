import { getDb } from './db.mjs';

function parseJson(value, fallback = null) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function upsertExecution(execution) {
  const db = getDb();
  db.prepare(`
    INSERT INTO assurance_executions (
      id, service, repo, commit_sha, branch, environment, pipeline_id, job_id,
      started_at, finished_at, source_provider, source_version, payload_json, created_at, updated_at
    ) VALUES (
      @id, @service, @repo, @commit_sha, @branch, @environment, @pipeline_id, @job_id,
      @started_at, @finished_at, @source_provider, @source_version, @payload_json, @created_at, @updated_at
    )
    ON CONFLICT(id) DO UPDATE SET
      service=excluded.service,
      repo=excluded.repo,
      commit_sha=excluded.commit_sha,
      branch=excluded.branch,
      environment=excluded.environment,
      pipeline_id=excluded.pipeline_id,
      job_id=excluded.job_id,
      started_at=excluded.started_at,
      finished_at=excluded.finished_at,
      source_provider=excluded.source_provider,
      source_version=excluded.source_version,
      payload_json=excluded.payload_json,
      updated_at=excluded.updated_at
  `).run({
    id: execution.id,
    service: execution.service,
    repo: execution.repo,
    commit_sha: execution.commitSha,
    branch: execution.branch,
    environment: execution.environment,
    pipeline_id: execution.pipelineId,
    job_id: execution.jobId,
    started_at: execution.startedAt,
    finished_at: execution.finishedAt,
    source_provider: execution.source.provider,
    source_version: execution.source.version,
    payload_json: JSON.stringify(execution),
    created_at: execution.startedAt,
    updated_at: new Date().toISOString()
  });
}

export function insertEvidence(evidenceList) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO assurance_evidence (
      id, execution_id, category, kind, uri, checksum, summary,
      raw_json, source_tool, source_tool_version, source_adapter, source_adapter_version, created_at
    ) VALUES (
      @id, @execution_id, @category, @kind, @uri, @checksum, @summary,
      @raw_json, @source_tool, @source_tool_version, @source_adapter, @source_adapter_version, @created_at
    )
    ON CONFLICT(id) DO UPDATE SET
      category=excluded.category,
      kind=excluded.kind,
      uri=excluded.uri,
      checksum=excluded.checksum,
      summary=excluded.summary,
      raw_json=excluded.raw_json,
      source_tool=excluded.source_tool,
      source_tool_version=excluded.source_tool_version,
      source_adapter=excluded.source_adapter,
      source_adapter_version=excluded.source_adapter_version,
      created_at=excluded.created_at
    WHERE assurance_evidence.execution_id = excluded.execution_id
  `);

  db.exec('BEGIN IMMEDIATE');
  try {
    for (const evidence of evidenceList) {
      const result = stmt.run({
        id: evidence.id,
        execution_id: evidence.executionId,
        category: evidence.category,
        kind: evidence.kind,
        uri: evidence.uri,
        checksum: evidence.checksum,
        summary: evidence.summary,
        raw_json: evidence.raw ? JSON.stringify(evidence.raw) : null,
        source_tool: evidence.source.tool,
        source_tool_version: evidence.source.toolVersion,
        source_adapter: evidence.source.adapter,
        source_adapter_version: evidence.source.adapterVersion,
        created_at: evidence.createdAt
      });

      if (result.changes === 0) {
        throw new Error(`Evidence id ${evidence.id} already exists for a different execution`);
      }
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function insertSignals(signals) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO assurance_signals (
      id, execution_id, category, status, name, metric, value, unit,
      severity, confidence, message, evidence_ids_json, tags_json, created_at
    ) VALUES (
      @id, @execution_id, @category, @status, @name, @metric, @value, @unit,
      @severity, @confidence, @message, @evidence_ids_json, @tags_json, @created_at
    )
    ON CONFLICT(id) DO UPDATE SET
      category=excluded.category,
      status=excluded.status,
      name=excluded.name,
      metric=excluded.metric,
      value=excluded.value,
      unit=excluded.unit,
      severity=excluded.severity,
      confidence=excluded.confidence,
      message=excluded.message,
      evidence_ids_json=excluded.evidence_ids_json,
      tags_json=excluded.tags_json,
      created_at=excluded.created_at
    WHERE assurance_signals.execution_id = excluded.execution_id
  `);

  db.exec('BEGIN IMMEDIATE');
  try {
    for (const signal of signals) {
      const result = stmt.run({
        id: signal.id,
        execution_id: signal.executionId,
        category: signal.category,
        status: signal.status,
        name: signal.name,
        metric: signal.metric,
        value: signal.value,
        unit: signal.unit,
        severity: signal.severity,
        confidence: signal.confidence,
        message: signal.message,
        evidence_ids_json: JSON.stringify(signal.evidenceIds),
        tags_json: signal.tags ? JSON.stringify(signal.tags) : null,
        created_at: signal.createdAt
      });

      if (result.changes === 0) {
        throw new Error(`Signal id ${signal.id} already exists for a different execution`);
      }
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function listAssuranceExecutions({ service = null, commitSha = null, environment = null, limit = 100, offset = 0 } = {}) {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT * FROM assurance_executions
      WHERE (@service IS NULL OR service = @service)
        AND (@commit_sha IS NULL OR commit_sha = @commit_sha)
        AND (@environment IS NULL OR environment = @environment)
      ORDER BY started_at DESC
      LIMIT @limit
      OFFSET @offset
    `)
    .all({ service, commit_sha: commitSha, environment, limit, offset });

  return rows.map((row) => parseJson(row.payload_json, {
    id: row.id,
    service: row.service,
    repo: row.repo,
    commitSha: row.commit_sha,
    branch: row.branch,
    environment: row.environment,
    pipelineId: row.pipeline_id,
    jobId: row.job_id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    source: { provider: row.source_provider, version: row.source_version }
  }));
}

export function getAssuranceExecution(executionId) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM assurance_executions WHERE id = ?').get(executionId);
  if (!row) return null;
  return parseJson(row.payload_json, {
    id: row.id,
    service: row.service,
    repo: row.repo,
    commitSha: row.commit_sha,
    branch: row.branch,
    environment: row.environment,
    pipelineId: row.pipeline_id,
    jobId: row.job_id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    source: { provider: row.source_provider, version: row.source_version }
  });
}

export function listAssuranceEvidence(executionId) {
  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM assurance_evidence WHERE execution_id = ? ORDER BY created_at DESC')
    .all(executionId);

  return rows.map((row) => ({
    id: row.id,
    executionId: row.execution_id,
    category: row.category,
    kind: row.kind,
    uri: row.uri,
    checksum: row.checksum,
    summary: row.summary,
    raw: parseJson(row.raw_json, null),
    source: {
      tool: row.source_tool,
      toolVersion: row.source_tool_version,
      adapter: row.source_adapter,
      adapterVersion: row.source_adapter_version
    },
    createdAt: row.created_at
  }));
}

export function listAssuranceSignals(executionId) {
  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM assurance_signals WHERE execution_id = ? ORDER BY created_at DESC')
    .all(executionId);

  return rows.map((row) => ({
    id: row.id,
    executionId: row.execution_id,
    category: row.category,
    status: row.status,
    name: row.name,
    metric: row.metric,
    value: row.value,
    unit: row.unit,
    severity: row.severity,
    confidence: row.confidence,
    message: row.message,
    evidenceIds: parseJson(row.evidence_ids_json, []),
    tags: parseJson(row.tags_json, null),
    createdAt: row.created_at
  }));
}

export function insertAssuranceDecision(decision) {
  const db = getDb();
  db.prepare(`
    INSERT INTO assurance_decisions(id, execution_id, outcome, summary, evaluations_json, created_at)
    VALUES (@id, @execution_id, @outcome, @summary, @evaluations_json, @created_at)
  `).run({
    id: decision.id,
    execution_id: decision.executionId,
    outcome: decision.outcome,
    summary: decision.summary,
    evaluations_json: JSON.stringify(decision.evaluations || []),
    created_at: decision.createdAt
  });
}

export function getAssuranceDecision(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM assurance_decisions WHERE id = ?').get(id);
  if (!row) return null;
  return {
    id: row.id,
    executionId: row.execution_id,
    outcome: row.outcome,
    summary: row.summary,
    evaluations: parseJson(row.evaluations_json, []),
    createdAt: row.created_at
  };
}
