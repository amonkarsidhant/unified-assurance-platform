import { AdapterError, assertAdapterInput, createAdapterResult } from '../../../adapter-sdk/src/index.mjs';

export const githubActionsAdapter = {
  id: 'ci-github-actions',
  version: '1.0.0',
  supports: ['github-actions-workflow-run'],
  transform(input) {
    const validated = assertAdapterInput(input);
    const payload = validated.payload;
    const run = payload.workflow_run || payload;

    if (!run?.id || !run?.head_sha || !run?.repository?.full_name) {
      throw new AdapterError('github actions payload missing workflow_run.id/head_sha/repository.full_name');
    }

    const startedAt = run.run_started_at || run.created_at || null;
    const warnings = [];
    if (!startedAt) {
      warnings.push('workflow_run missing run_started_at and created_at');
    }

    const execution = {
      id: `gha-${run.id}`,
      service: payload.service || run.repository.name,
      repo: run.repository.full_name,
      commitSha: run.head_sha,
      branch: run.head_branch || null,
      environment: payload.environment || 'ci',
      pipelineId: String(run.id),
      jobId: null,
      startedAt,
      finishedAt: run.updated_at || null,
      source: {
        provider: 'github-actions',
        version: '1'
      }
    };

    return createAdapterResult({ execution, evidence: [], signals: [], warnings });
  }
};
