import { randomUUID } from 'node:crypto';

const OPERATORS = {
  eq: (actual, expected) => actual === expected,
  ne: (actual, expected) => actual !== expected,
  gt: (actual, expected) => Number(actual) > Number(expected),
  gte: (actual, expected) => Number(actual) >= Number(expected),
  lt: (actual, expected) => Number(actual) < Number(expected),
  lte: (actual, expected) => Number(actual) <= Number(expected),
  in: (actual, expected) => Array.isArray(expected) && expected.includes(actual),
  exists: (actual) => actual != null
};

export function evaluatePolicies({ execution, signals, rules }) {
  const evaluations = [];

  for (const rule of rules || []) {
    const scopeMatchesExecution = matchesExecutionScope(execution, rule.scope || {});
    if (!scopeMatchesExecution) {
      evaluations.push({
        ruleId: rule.id,
        passed: true,
        mode: rule.mode || 'advisory',
        skipped: true,
        reason: `Rule skipped: ${rule.name} (scope mismatch)`,
        evidenceIds: []
      });
      continue;
    }

    const scopedSignals = (signals || []).filter((signal) => matchesScope(signal, execution, rule.scope || {}));
    const target = scopedSignals.find((signal) => {
      if (rule.condition?.signalName && signal.name !== rule.condition.signalName) return false;
      if (rule.condition?.metric && signal.metric !== rule.condition.metric) return false;
      return true;
    });

    const operatorName = rule.condition?.operator || 'exists';
    const op = OPERATORS[operatorName];
    if (!op) {
      throw new Error(`Unsupported operator: ${operatorName}`);
    }
    const passed = target ? op(target.value ?? target.status, rule.condition?.threshold) : false;

    evaluations.push({
      ruleId: rule.id,
      passed,
      mode: rule.mode || 'advisory',
      reason: passed ? `Rule passed: ${rule.name}` : (rule.failMessage || `Rule failed: ${rule.name}`),
      evidenceIds: target?.evidenceIds || []
    });
  }

  const hasHardFailure = evaluations.some((r) => r.mode === 'hard' && !r.passed);
  const hasAdvisoryFailure = evaluations.some((r) => r.mode === 'advisory' && !r.passed);

  const outcome = hasHardFailure ? 'block' : (hasAdvisoryFailure ? 'advisory' : 'allow');

  return {
    id: randomUUID(),
    executionId: execution.id,
    outcome,
    summary: buildSummary(outcome, evaluations),
    evaluations,
    createdAt: new Date().toISOString()
  };
}

function matchesExecutionScope(execution, scope) {
  if (scope.services?.length && !scope.services.includes(execution.service)) return false;
  if (scope.environments?.length && !scope.environments.includes(execution.environment)) return false;
  if (scope.branches?.length && !scope.branches.includes(execution.branch)) return false;
  return true;
}

function matchesScope(signal, execution, scope) {
  if (!matchesExecutionScope(execution, scope)) return false;
  if (scope.categories?.length && !scope.categories.includes(signal.category)) return false;
  return true;
}

function buildSummary(outcome, evaluations) {
  const failed = evaluations.filter((e) => !e.passed).length;
  if (outcome === 'allow') return 'All policy rules passed';
  if (outcome === 'advisory') return `${failed} advisory rule(s) failed`;
  return `${failed} rule(s) failed including hard-gate policies`;
}
