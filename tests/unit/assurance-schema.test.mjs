import test from 'node:test';
import assert from 'node:assert/strict';
import { validateExecutionRef, validateEvidenceRef, validateSignal } from '../../packages/assurance-schema/src/index.mjs';

test('validateExecutionRef accepts valid execution payload and strips unexpected fields', () => {
  const execution = validateExecutionRef({
    id: 'exec-1',
    service: 'payments-api',
    repo: 'amonkarsidhant/unified-assurance-platform',
    commitSha: 'abc123',
    startedAt: '2026-02-17T09:00:00.000Z',
    source: { provider: 'github-actions' },
    extra: 'ignore-me'
  });

  assert.equal(execution.id, 'exec-1');
  assert.equal(execution.source.provider, 'github-actions');
  assert.equal(execution.extra, undefined);
});

test('validateExecutionRef rejects missing id and malformed startedAt', () => {
  assert.throws(
    () => validateExecutionRef({
      service: 'payments-api',
      repo: 'amonkarsidhant/unified-assurance-platform',
      commitSha: 'abc123',
      startedAt: '2026-02-17T09:00:00.000Z',
      source: { provider: 'github-actions' }
    }),
    /execution.id is required/
  );

  assert.throws(
    () => validateExecutionRef({
      id: 'exec-1',
      service: 'payments-api',
      repo: 'amonkarsidhant/unified-assurance-platform',
      commitSha: 'abc123',
      startedAt: '17-02-2026 09:00:00',
      source: { provider: 'github-actions' }
    }),
    /execution.startedAt must be an ISO timestamp/
  );
});

test('validateEvidenceRef rejects missing required fields and unknown category', () => {
  assert.throws(
    () => validateEvidenceRef({
      executionId: 'exec-1',
      category: 'unit',
      kind: 'artifact',
      source: { tool: 'jest', adapter: 'artifact-junit' },
      createdAt: '2026-02-17T09:01:00.000Z'
    }),
    /evidence.id is required/
  );

  assert.throws(
    () => validateEvidenceRef({
      id: 'ev-1',
      executionId: 'exec-1',
      category: 'nonsense',
      kind: 'artifact',
      source: { tool: 'jest', adapter: 'artifact-junit' },
      createdAt: '2026-02-17T09:01:00.000Z'
    }),
    /evidence.category must be one of/
  );
});

test('validateSignal accepts confidence boundaries and rejects invalid status/confidence', () => {
  const lowBoundary = validateSignal({
    id: 'sig-0',
    executionId: 'exec-1',
    category: 'unit',
    status: 'pass',
    name: 'unit-pass-rate',
    confidence: 0,
    evidenceIds: [],
    createdAt: '2026-02-17T09:02:00.000Z'
  });

  const highBoundary = validateSignal({
    id: 'sig-1',
    executionId: 'exec-1',
    category: 'unit',
    status: 'warn',
    name: 'unit-pass-rate',
    confidence: 1,
    evidenceIds: [],
    createdAt: '2026-02-17T09:02:00.000Z'
  });

  assert.equal(lowBoundary.confidence, 0);
  assert.equal(highBoundary.confidence, 1);

  assert.throws(
    () => validateSignal({
      id: 'sig-2',
      executionId: 'exec-1',
      category: 'unit',
      status: 'unknown',
      name: 'unit-pass-rate',
      evidenceIds: [],
      createdAt: '2026-02-17T09:02:00.000Z'
    }),
    /signal.status must be one of/
  );

  assert.throws(
    () => validateSignal({
      id: 'sig-3',
      executionId: 'exec-1',
      category: 'unit',
      status: 'pass',
      name: 'unit-pass-rate',
      confidence: 2,
      evidenceIds: [],
      createdAt: '2026-02-17T09:02:00.000Z'
    }),
    /signal.confidence must be between 0 and 1/
  );
});
