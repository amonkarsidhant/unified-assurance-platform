#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts" / "latest"

SEV_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}


def main():
    src = ART / "failure-explanations.json"
    if not src.exists():
        raise SystemExit("Run make explain-last-fail first (missing failure-explanations.json)")

    data = json.loads(src.read_text())
    failures = data.get("failures", [])
    failures.sort(key=lambda x: SEV_ORDER.get(x.get("severity", "medium"), 9))

    must_fix = [f for f in failures if f.get("severity") in {"critical", "high"}]
    can_defer = [f for f in failures if f.get("severity") not in {"critical", "high"}]

    lines = ["# Suggested Next Steps", "", "## Must-fix now", ""]
    if not must_fix:
        lines.append("- None")
    for f in must_fix:
        lines.append(f"- [{f['severity']}] {f['id']} → {f['fix_hint']} (owner: {f['owner_role']})")

    lines += ["", "## Can defer (time-boxed)", ""]
    if not can_defer:
        lines.append("- None")
    for f in can_defer:
        lines.append(f"- [{f['severity']}] {f['id']} → {f['fix_hint']} (SLA: {f['sla_target']})")

    lines += ["", "## Suggested commands", "", "- `make preflight MODULE=<name> TYPE=<api|frontend|worker|shared-lib>`", "- `make explain-last-fail`", "- `make request-exception CONTROL=<control> REASON='<reason>' EXPIRY_DAYS=7`"]

    (ART / "next-steps.md").write_text("\n".join(lines) + "\n")
    print("Wrote artifacts/latest/next-steps.md")


if __name__ == "__main__":
    main()
