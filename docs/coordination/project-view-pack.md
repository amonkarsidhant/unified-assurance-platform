# Project View Pack Standard (UAP Agent Ops Board)

Use these exact view names in GitHub Projects:

1. **Kanban**
   - Group by: `Status`
   - Sort: `Priority` desc
2. **By Role**
   - Group by: `Role`
   - Filter: `is:open`
3. **By Sprint**
   - Group by: `Sprint`
   - Sort: `Priority` desc
4. **Risk Radar**
   - Group by: `Risk`
   - Filter: `Status != Done`
5. **Authority Review Queue**
   - Filter: `label:status:authority-review`
   - Sort: newest first
6. **Blocked**
   - Filter: `label:status:blocked`

## Field conventions

- `Role`: PO/PM | Architect | SRE | QA | DevEx
- `Sprint`: Sprint-01 | Sprint-02 | Backlog
- `Risk`: High | Medium | Low
- `Priority`: P0 | P1 | P2 | P3

## Naming rule

Do not invent ad-hoc view names. Reuse these names exactly for consistency across weekly updates.
