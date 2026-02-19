# UAP Auto-Configuration System

> Proposal based on Agentic QE's aqe init --auto - Issue #88

## Background

Agentic QE has an excellent auto-configuration system:
- `aqe init --auto` detects tech stack automatically
- Enables relevant domains automatically
- Configures MCP in `.mcp.json`

UAP currently requires manual setup.

## Proposal

Add auto-configuration to UAP:

### Phase 1: Environment Detection

```bash
# Auto-detect what's available
make init-auto
```

Detects:
- Node.js version / package manager
- Python version
- Docker availability
- CI provider (GitHub Actions, GitLab CI, etc.)
- Available tools (checkov, gitleaks, etc.)

### Phase 2: Smart Enablement

Based on detected tools, enable appropriate checks:
- If Docker → enable Hadolint
- If Python → enable checkov, schemathesis
- If Node.js → enable npm audit, etc.

### Phase 3: Config Generation

Generate `.uap.yaml` with:
- Detected risk tier
- Enabled controls
- Tool paths

## CLI Experience

```bash
# Current (manual)
make init
# User must know what controls to enable

# Proposed (auto)
make init-auto
# → Detects environment
# → Enables appropriate controls
# → Creates .uap.yaml
```

## Implementation

1. Create `scripts/auto-detect.sh`
2. Add `make init-auto` target
3. Generate `.uap.yaml` template

## Reference

- Agentic QE: `aqe init --auto`
- UAP docs: `docs/getting-started/dev-experience-setup.md`

---

Ref: Issue #88
