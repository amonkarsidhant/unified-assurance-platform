# UAP Design Language (Compact)

Use these rules for docs, UI copy, reports, and automation-facing summaries.

## Naming conventions

- Product name: **Unified Assurance Platform (UAP)** on first mention, then **UAP**.
- Capability names: use **Title Case** in headings (for example, `Promotion Gate`, `Resilience Intelligence`).
- File and artifact names: use **kebab-case** and keep prefixes explicit (`promotion-decision.json`, `release-report.md`).
- Workflow names: keep GitHub workflow IDs stable and machine-readable (`ci-pr-quality`, `ci-release-gate`).
- Status values: use canonical uppercase labels only: `GO`, `CONDITIONAL`, `NO-GO`.

## Tone guidelines

- Audience: operators, release managers, platform engineers.
- Default tone: **direct, factual, and action-oriented**.
- Prefer short sentences and concrete outcomes over abstract language.
- Always state impact + next step for failures (what failed, what to do now).
- Avoid hype words and avoid blame language.

## Emoji policy

- Default for formal docs and reports: **no emoji**.
- Allowed in lightweight summaries/dashboards only when they improve scan speed:
  - ✅ success / GO
  - ⚠️ conditional / follow-up required
  - ❌ failure / NO-GO
- Maximum: one emoji at the start of a line or label; never stack emoji.

## Color palette

Use semantic colors consistently across diagrams, dashboards, and UI accents.

| Token | Hex | Usage |
| --- | --- | --- |
| `uap-blue-700` | `#1D4ED8` | Primary actions, links, key flows |
| `uap-slate-900` | `#0F172A` | Primary text and headers |
| `uap-slate-600` | `#475569` | Supporting text, secondary metadata |
| `uap-green-600` | `#16A34A` | GO / pass outcomes |
| `uap-amber-500` | `#F59E0B` | CONDITIONAL / warning outcomes |
| `uap-red-600` | `#DC2626` | NO-GO / fail outcomes |
| `uap-slate-200` | `#E2E8F0` | Dividers, neutral surfaces |
| `uap-white` | `#FFFFFF` | Canvas background |

## Status semantics

| Status | Meaning | Operator action |
| --- | --- | --- |
| `GO` | Required controls passed and evidence is sufficient. | Proceed with promotion. |
| `CONDITIONAL` | Promotion is possible only with explicit, time-bound exceptions. | Review conditions, approve or reject with owner sign-off. |
| `NO-GO` | One or more required controls failed or evidence is missing/invalid. | Block promotion, remediate, and re-run assurance. |

## Consistency checklist

Before merging docs/UI updates, confirm:

- Canonical names and status labels are used exactly.
- Copy stays concise and operator-friendly.
- Colors and status mappings remain semantically aligned.
- Emoji usage follows the policy above.
