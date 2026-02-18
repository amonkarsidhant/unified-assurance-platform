# UAP DevEx Playbook (Onboarding, CI Feedback, Parity, Cognitive Load)

## 1) Principles (what “good” looks like)

1. **Fast path first**: optimize for the first successful contribution in < 1 day.
2. **Feedback in layers**: fail fast in minutes, deepen confidence asynchronously.
3. **Single source of truth**: local and CI should run the same tasks with the same defaults.
4. **Evidence over opinion**: devex decisions should be metric-backed (TTFG, queue time, flaky rate, docs success).
5. **Cognitive load budget**: every added tool/check must remove more confusion than it adds.
6. **Docs as product**: docs are executable, task-based, versioned, and tested.
7. **PRs are for learning, not waiting**: prefer small PRs; use Ship/Show/Ask intentionally.
8. **Reliability of tooling is a feature**: flaky CI and unstable local setup are priority defects.

---

## 2) Friction-removal checklist (UAP practical)


### A) Onboarding speed
- [ ] One command from clone to green (`make bootstrap && make validate`) works on clean machine.
- [ ] “First PR in 60 minutes” path documented (happy path + 3 known pitfalls).
- [ ] Preflight script checks toolchain versions and missing deps before failure.
- [ ] Dev container / reproducible environment available for parity.
- [ ] Seed task list: 3 beginner-safe issues with exact run/test instructions.

### B) CI feedback quality
- [ ] PR workflow target feedback: **first signal <= 10 min** (lint/unit/smoke).
- [ ] Heavy checks moved to async/nightly unless high-risk paths changed.
- [ ] Every failed check has: probable cause, owner hint, and “how to reproduce locally”.
- [ ] Build logs are summarized; failure taxonomy labels (flake, env, test, policy, infra).
- [ ] Re-run policies avoid blind reruns (capture flaky fingerprint first).

### C) Local-to-CI parity
- [ ] CI steps map 1:1 to `make` targets (no hidden CI-only logic).
- [ ] Pinned versions for runtimes/tools; lockfiles enforced.
- [ ] Deterministic fixtures and seeded test data.
- [ ] Same policy engine/rules locally and in CI (no drift).
- [ ] “CI locally” target (`make ci-local`) is authoritative and documented.

### D) Cognitive load management
- [ ] Limit active quality gates per PR to essentials.
- [ ] Standardized PR template with concise intent/risk/test evidence sections.
- [ ] Golden paths for top 5 dev tasks (new feature, bugfix, policy update, release prep, docs-only).
- [ ] Consolidated dashboards (avoid context switching across many tools).
- [ ] Quarterly tool retirement review (remove low-value checks/docs).

### E) Documentation effectiveness
- [ ] Docs organized by tasks/questions, not by team ownership.
- [ ] “Last verified with commit SHA/date” on critical runbooks.
- [ ] Broken-link and stale-command checks in CI.
- [ ] Short troubleshooting decision trees for common failures.
- [ ] Measure docs success (see metrics): task success + time-to-answer.

---

## 3) Metric definitions (operational)

## Core North-Star Metrics

1. **TTFG (Time to First Green)**
   - **Definition**: Time from first commit on a PR to first full required-check green.
   - **Formula**: `first_required_green_ts - first_commit_ts`
   - **Target**: p50 < 30 min, p90 < 90 min.

2. **Onboarding TTFPR (Time to First Production-Ready PR)**
   - **Definition**: New contributor start to first PR merged with required checks.
   - **Target**: p50 < 1 day.

3. **First CI Signal Time**
   - **Definition**: PR open/sync to first actionable pass/fail signal.
   - **Target**: p50 < 8 min, p90 < 15 min.

4. **CI Failure Clarity Score**
   - **Definition**: % failed runs where developer can identify next action within 5 minutes.
   - **Measurement**: lightweight pulse survey + log taxonomy.
   - **Target**: > 85%.

5. **Local-CI Repro Rate**
   - **Definition**: % CI failures reproducible via documented local command.
   - **Target**: > 90%.

6. **Flaky Check Rate**
   - **Definition**: % job failures that pass without code change on rerun.
   - **Target**: < 2% for required checks.

7. **PR Flow Efficiency**
   - **Definition**: Active work time / total PR cycle time.
   - **Signal**: review wait and queue delays.

8. **Docs Task Success Rate**
   - **Definition**: % developers completing target task via docs without escalation.
   - **Target**: > 80% for top tasks.

## Supporting Metrics
- Queue time before runner start
- Cache hit ratio for dependency/build caches
- Median PR size (files/LOC) and review turnaround
- % PRs with “how tested” filled correctly
- Cognitive Load Pulse (monthly, 1–5): “I can ship changes without excessive friction”

---

## 4) Improvement prioritization framework

Use **ICE-R** (Impact, Confidence, Effort, Risk)

- **Impact (1–5)**: expected metric movement (TTFG, CI signal, onboarding).
- **Confidence (1–5)**: certainty based on evidence.
- **Effort (1–5)**: engineering + change management effort (lower is better).
- **Risk (1–5)**: delivery/stability risk introduced (lower is better).

**Score**: `(Impact * Confidence) / (Effort + Risk)`

Prioritize items with high score and direct North-Star impact.

### Suggested UAP Top 10 backlog (ranked by likely ROI)
1. **PR fast-lane split**: keep required PR checks to <=10 min; move deep checks async/nightly.
2. **Failure-message standardization** across workflows with local repro command.
3. **Deterministic `make ci-local` parity audit** against all required CI checks.
4. **Flake quarantine lane** + automatic flaky test tagging.
5. **Onboarding preflight command** (`make doctor`) for env/tool validation.
6. **First-contribution path doc** (“clone to merged PR in 60m”).
7. **PR size guardrails** (warn above threshold; encourage smaller batches).
8. **Docs verification job** (commands + links + stale ownership metadata).
9. **CI observability dashboard** (TTFG, first signal, queue, flakes, rerun causes).
10. **Weekly DevEx review loop** with issue triage and measured outcomes.

---

## 5) PR DX Rubric (for reviewers + authors)

Score each PR 0/1/2 (Poor/Acceptable/Excellent). Max 20.

1. **Clarity of intent**: problem + expected outcome clear.
2. **Change scope**: small, coherent, reviewable.
3. **Reproducibility**: exact local validation commands included.
4. **CI quality**: checks meaningful, fast, non-flaky.
5. **Risk communication**: blast radius + rollback noted.
6. **Evidence quality**: logs/screenshots/report artifacts linked.
7. **Docs impact**: docs/runbook updated if behavior changed.
8. **Policy alignment**: controls/exceptions explicit.
9. **Reviewability**: commit hygiene and PR description quality.
10. **Learning value**: useful context for future maintainers.

### Rubric Interpretation
- **17–20**: Excellent DX (merge-ready)
- **13–16**: Good, minor improvements
- **9–12**: Friction likely; needs refinement
- **<9**: Rework before merge

---

## 6) 30/60/90-day execution plan

### 0–30 days (stabilize)
- Baseline metrics: TTFG, first signal, flaky rate, local-CI repro.
- Implement failure message template and local repro hints.
- Introduce `make doctor` and onboarding fast path doc.
- Set PR check SLA: first signal <=10 minutes.

### 31–60 days (optimize)
- Split pipelines: mandatory fast lane vs deep assurance lane.
- Add flake detection/quarantine + ownership.
- Add docs validation automation and stale-content checks.
- Launch CI observability dashboard.

### 61–90 days (scale)
- Enforce PR DX rubric in template/review workflow.
- Tune gate strictness by risk tier (high-risk strict, low-risk lightweight).
- Monthly DevEx report to engineering leadership with trendlines and ROI.

---

## 7) Governance cadence

- **Weekly (30 min)**: DevEx triage of top friction tickets.
- **Bi-weekly**: metric review + backlog reprioritization via ICE-R.
- **Monthly**: publish DevEx scorecard + top wins/regressions.
- **Quarterly**: cognitive load audit (retire low-value tools/processes).

---

## 8) Immediate actions for issue #36 acceptance

1. Capture baseline for: TTFG, first CI signal, flaky rate, local-CI repro rate, onboarding TTFPR.
2. Open 5 implementation tickets from top backlog items (#1–#5 above).
3. Add PR template fields to support PR DX rubric scoring.
4. Add CI summary section: “Fail reason + local reproduce command”.
5. Review improvement impact after 2 weeks and adjust.

---

## Notes on source models used

This playbook aligns with established DevEx and delivery research patterns:
- DORA delivery performance framing (flow + reliability outcomes)
- SPACE-style multidimensional productivity thinking
- Team Topologies cognitive-load and flow principles
- Modern PR flow practices (small batches, Ship/Show/Ask mindset)
