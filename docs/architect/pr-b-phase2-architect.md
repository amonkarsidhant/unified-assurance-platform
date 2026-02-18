# Architect PR-B Phase-2: Guardrail Enforcement Deltas

**Source:** Issue #42  
**Parent:** Issue #41 (Sequencing)

---

## Objective

Implement architecture-safe deltas for PR-B phase-2 without changing core gate semantics.

---

## Deliverables

### 1. Guardrail Checks/Constraints for Phase-2 Items

**Core Principles:**
- No changes to core gate validation logic
- New documentation only, no runtime code changes
- Backward compatible with existing PR-B contracts

**Phase-2 Documentation Requirements:**

| Phase-2 Workstream | Guardrail Constraint | Validation |
|-------------------|---------------------|------------|
| DevEx (#45) | Metrics must be trend-based, not absolute | Manual review |
| QA (#44) | Evidence matrix must link to requirements | PR template |
| SRE (#43) | Rollback triggers must be objective | Runbook link |

### 2. Approved Deviation Handling

**Process for Deviations:**
1. Document deviation in PR with rationale
2. Link to architecture decision record (ADR) if exists
3. Get sign-off from Architect role
4. Update guardrail documentation

**Deviation Template:**
```markdown
## Deviation Request
- **Component:** [what is being changed]
- **Current constraint:** [what the guardrail says]
- **Proposed change:** [what you want to do]
- **Risk:** [what could go wrong]
- **Mitigation:** [how you reduce risk]
- **Approval:** [Architect sign-off]
```

### 3. Architecture Risk Notes + Mitigations

**Risk Categories:**

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Gate semantics drift | Low | High | Lock gate validation scripts |
| Documentation rot | Medium | Medium | Link to issues/PRs |
| Metric gaming | Low | Medium | Use relative, not absolute |

---

## Definition of Done

- [ ] Guardrail constraints documented for each phase-2 workstream
- [ ] Deviation handling process defined
- [ ] Risk register updated with phase-2 risks
- [ ] Cross-linked to Issues #43, #44, #45
