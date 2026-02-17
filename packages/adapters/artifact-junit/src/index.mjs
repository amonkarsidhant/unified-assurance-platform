import { randomUUID } from 'node:crypto';
import { AdapterError, assertAdapterInput, createAdapterResult } from '../../../adapter-sdk/src/index.mjs';

export const junitAdapter = {
  id: 'artifact-junit',
  version: '1.0.0',
  supports: ['xml', 'junit'],
  transform(input) {
    const validated = assertAdapterInput(input);
    const payload = validated.payload;
    const xml = typeof payload.xml === 'string' ? payload.xml : null;
    const executionId = payload.executionId;
    if (!xml) throw new AdapterError('junit adapter requires payload.xml');
    if (!executionId) throw new AdapterError('junit adapter requires payload.executionId');

    const testcases = parseTestCases(xml);
    if (testcases.length === 0) {
      return createAdapterResult({ noData: true, warnings: ['no junit testcases found'] });
    }

    const evidenceId = `ev-junit-${randomUUID()}`;
    const evidence = [{
      id: evidenceId,
      executionId,
      category: 'unit',
      kind: 'artifact',
      summary: `JUnit testcases: ${testcases.length}`,
      raw: { testcaseCount: testcases.length },
      source: { tool: payload.tool || 'junit', adapter: 'artifact-junit' },
      createdAt: new Date().toISOString()
    }];

    const signals = testcases.map((tc) => ({
      id: `sig-test-${randomUUID()}`,
      executionId,
      category: 'unit',
      status: tc.skipped ? 'skip' : tc.failed ? 'fail' : 'pass',
      name: 'test-case-result',
      message: tc.skipped ? 'test skipped' : tc.failed ? tc.failureMessage || 'test failed' : 'test passed',
      evidenceIds: [evidenceId],
      tags: {
        testCase: tc.name,
        className: tc.className || 'unknown'
      },
      createdAt: new Date().toISOString()
    }));

    return createAdapterResult({ evidence, signals });
  }
};

function parseTestCases(xml) {
  const cases = [];
  const testCaseRegex = /<testcase\b([^>]*)>([\s\S]*?)<\/testcase>|<testcase\b([^>]*)\/>/g;
  let match;
  while ((match = testCaseRegex.exec(xml)) !== null) {
    const attrs = parseAttrs(match[1] || match[3] || '');
    const body = match[2] || '';
    const failureWithBody = /<failure\b[^>]*>([\s\S]*?)<\/failure>/.exec(body);
    const failureSelfClosing = /<failure\b[^>]*\/\s*>/.test(body);
    const errorWithBody = /<error\b[^>]*>([\s\S]*?)<\/error>/.exec(body);
    const errorSelfClosing = /<error\b[^>]*\/\s*>/.test(body);
    const skipped = /<skipped\b[^>]*\/?\s*>/.test(body);
    const failureMessage = failureWithBody
      ? failureWithBody[1].trim().slice(0, 300)
      : errorWithBody
        ? errorWithBody[1].trim().slice(0, 300)
        : null;
    cases.push({
      name: attrs.name || 'unknown',
      className: attrs.classname || attrs.className || null,
      failed: Boolean(failureWithBody) || failureSelfClosing || Boolean(errorWithBody) || errorSelfClosing,
      skipped,
      failureMessage
    });
  }
  return cases;
}

function parseAttrs(raw) {
  const attrs = {};
  const attrRegex = /(\w+)=(?:"([^"]*)"|'([^']*)')/g;
  let match;
  while ((match = attrRegex.exec(raw)) !== null) {
    attrs[match[1]] = match[2] ?? match[3];
  }
  return attrs;
}
