# Gate Failure Message Contract (Starter)

Use this contract for governance/enforcement failures so contributors get clear, actionable guidance.

```text
❌ Governance gate failed
reason: <clear-failure-reason>
fix_hint: <what-to-change>
reproduce: <local-command>
owner: <team-or-role>
evidence: <link-to-evidence>
```

Minimum requirements:
- `reason`: unambiguous rule or artifact that failed
- `fix_hint`: smallest next action to pass gate
- `reproduce`: exact local command
- `owner`: accountable team/role for the gate
- `evidence`: placeholder or link to proof artifact
