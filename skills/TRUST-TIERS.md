# UAP Skill Trust Tiers

> Adopted from Agentic QE Fleet - Rating: 5/5

## Overview

Skills and agents in UAP are rated on a trust tier system to indicate their maturity and reliability.

## Tier Definitions

| Tier | Name | Badge | Count | Description |
|------|------|-------|-------|-------------|
| **T3** | Verified | 🟢 | Full evaluation test suite - **PRODUCTION READY** |
| **T2** | Validated | 🟡 | Has executable validator |
| **T1** | Structured | 🔵 | Has JSON output schema |
| **T0** | Advisory | ⚪ | SKILL.md guidance only |

## Validation Layers

Each tier requires progressive validation:

```
Layer 0: SKILL.md (intent + usage)
    ↓
Layer 1: schemas/output.json (structure definition)
    ↓
Layer 2: scripts/validate-skill.cjs (correctness)
    ↓
Layer 3: evals/*.yaml (behavior verification)
```

## Current UAP Skills

| Skill | Domain | Tier | Status |
|-------|--------|------|--------|
| assurance-schema | Validation | T3 | ✅ Production Ready |
| policy-engine | Governance | T3 | ✅ Production Ready |
| resilience-intelligence | Chaos | T2 | Validated |
| promotion-gate | Assurance | T2 | Validated |
| gitleaks | Security | T1 | Structured |
| schemathesis | Contract | T1 | Structured |
| checkov | Security | T0 | Advisory |
| hadolint | Security | T0 | Advisory |
| zap | Security | T0 | Advisory |

## CLI Commands

```bash
# Check skill tier
make skill-status SKILL=assurance-schema

# Run skill evaluation
make skill-eval SKILL=assurance-schema

# Compare results
make skill-compare --current results/ --baseline .baseline/
```

## Upgrading Skills

To move a skill from T0 → T3:

1. **T0 → T1**: Add `schemas/output.json` with output schema
2. **T1 → T2**: Add `scripts/validate-skill.cjs` for correctness checks
3. **T2 → T3**: Add `evals/*.yaml` with behavior tests

## References

- Agentic QE Fleet: https://github.com/amonkarsidhant/agentic-qe
- Original review: Issue #87
- Integration issue: Issue #88
