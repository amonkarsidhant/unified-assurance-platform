# Chaos Experiment Contract (Agnostic)

Use this contract before running any experiment.

## 1) Hypothesis
- What should continue to work under fault?
- Example: "API p95 stays < 500ms during 200ms dependency latency."

## 2) Steady State
- Define baseline indicators (SLI/SLO, queue depth, error rate, throughput).
- Capture measurement source and threshold.

## 3) Blast Radius
- Scope by module, env, tenant, or traffic slice.
- Keep local/dev runs safe and reversible.

## 4) Abort Conditions
- Immediate stop triggers (error budget burn, saturation, data risk, user impact).
- Include timeout-based auto-abort.

## 5) Rollback Plan
- Exact reversal steps per injector/tool.
- Validate recovery signals before closing experiment.

## 6) Evidence
- Experiment definition used
- Run logs and timestamps
- Pass/fail/skipped with reason
- Follow-up actions and owner
