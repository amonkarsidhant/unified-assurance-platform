import test from 'node:test';
import assert from 'node:assert/strict';
import { validateExecutionRef, validateEvidenceRef, validateSignal } from '../../packages/assurance-schema/src/index.mjs';

test('validateExecutionRef accepts valid execution payload', () => {
  const execution = validateExecutionRef({
    id: 'exec-1',
    service: 'payments-api',
    repo: 'amonkarsidhant/unified-assurance-platform',
    commitSha: 'abc123',
    startedAt: '2026-02-17T09:00:00.000Z',
    source: { provider: 'github-actions' }
  });

  assert.equal(execution.id, 'exec-1');
  assert.equal(execution.source.provider, 'github-actions');
});

test('validateEvidenceRef rejects unknown category', () => {
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

test('validateSignal enforces confidence range', () => {
  assert.throws(
    () => validateSignal({
      id: 'sig-1',
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
