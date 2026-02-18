# QE Primer (Plain English)

## What is Quality Engineering (QE)?
Quality Engineering is the practice of building quality into software from the start, not just testing at the end.

Think of it this way:
- **Testing** asks: “Did we find bugs?”
- **QE** asks: “How do we prevent important bugs and release safely every time?”

QE combines product risk thinking, test strategy, automation, observability, and release governance.

## Why this matters
Good QE helps teams:
- Ship faster with fewer incidents
- Catch expensive issues earlier (before production)
- Make release decisions with evidence, not guesswork
- Align product, engineering, security, and operations on release readiness

## Core test types (and when to use them)

### 1) Unit tests
- **What:** Validate small pieces of code in isolation
- **Best for:** Fast feedback on logic and edge cases
- **Run:** On every commit

### 2) Integration tests
- **What:** Validate interactions between modules/services (API + DB, service + queue)
- **Best for:** Catching contract and data-flow breaks
- **Run:** PR and main branch pipelines

### 3) Contract tests
- **What:** Validate service-to-service API expectations
- **Best for:** Preventing breaking changes between producers/consumers
- **Run:** PR for affected services + nightly

### 4) End-to-end (E2E) tests
- **What:** Validate critical user journeys across systems
- **Best for:** Business-critical flows only (checkout, login, payment)
- **Run:** Lean suite on PR, broader suite nightly

### 5) Security tests
- **What:** SAST/DAST/dependency and configuration checks
- **Best for:** Reducing exploitable vulnerabilities
- **Run:** Every PR for fast checks, deep scans scheduled

### 6) Performance and resilience checks
- **What:** Latency, throughput, error handling, degradation behavior
- **Best for:** Ensuring SLOs and graceful failure
- **Run:** Smoke in CI, deeper tests pre-release/nightly

## Simple rule of thumb
- Put most checks **early and fast** (unit/integration/contracts)
- Keep **few but meaningful** E2E tests
- Use release gates tied to **risk + business impact**

## Common anti-patterns to avoid
- **“Test at the end”** mindset
- **Too many brittle E2E tests** and too few lower-level tests
- **Pass/fail theater**: green pipelines that do not reflect real risk
- **No ownership**: unclear who triages flaky tests or failing gates
- **Ignoring observability**: no feedback from production incidents to test strategy
- **One-size-fits-all gates** for low-risk and high-risk releases

## What “good” looks like
- Risks are explicit and mapped to tests
- Gates are clear and visible in CI/CD
- Failures are actionable with owners
- Release decisions are documented (GO/CONDITIONAL/NO-GO + reason)
- Production learnings feed back into tests and policies

## PR-B / Sprint-02 minimum gate profile

Decision outputs:
- **GO**: all required evidence + checks complete
- **CONDITIONAL GO**: non-critical gaps accepted with explicit owner + due date
- **NO-GO**: missing critical evidence, failed mandatory controls, or unresolved P0/P1 defects

Hard-stop overrides:
- Missing rollback path for high-risk changes
- Failed mandatory security or contract control
- Missing negative-path evidence for touched guardrails/policies
