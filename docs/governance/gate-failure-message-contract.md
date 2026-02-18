# Gate Failure Message Contract (Starter)

Use this contract for governance/enforcement failures so contributors get clear, actionable guidance.

```text
❌ Governance gate failed
check: <gate-or-check-name>
reason: <clear-failure-reason>
fix_hint: <what-to-change>
reproduce: <local-command>
owner: <team-or-role>
evidence: <link-to-evidence>
```

Minimum requirements:
- `check`: failing gate/check identifier
- `reason`: unambiguous rule or artifact that failed
- `fix_hint`: smallest next action to pass gate
- `reproduce`: exact local command
- `owner`: accountable team/role for the gate
- `evidence`: placeholder or link to proof artifact
- Include rollback-related reason wording when failure affects release safety (e.g., threshold breach, missing rollback evidence).

Compatibility note:
- Existing automation still keys on `fix_hint`.
- You may additionally mirror `fix_hint` as `fix` in step summaries for contributor readability.
