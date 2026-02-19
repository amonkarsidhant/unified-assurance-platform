#!/usr/bin/env python3
import json
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts" / "latest"


def parse_simple_yaml(path: Path):
    data = {"remediations": {}}
    current = None
    for raw in path.read_text().splitlines():
        line = raw.rstrip()
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        if s == "remediations:":
            continue
        if line.startswith("  ") and s.endswith(":") and not s.startswith(("severity", "owner_role", "fix_hint", "playbook", "sla_target")):
            current = s[:-1]
            data["remediations"][current] = {}
            continue
        if current and ":" in s:
            k, v = s.split(":", 1)
            data["remediations"][current][k.strip()] = v.strip().strip('"').strip("'")
    return data


def main():
    results = json.loads((ART / "results.json").read_text()) if (ART / "results.json").exists() else {}
    promotion = json.loads((ART / "promotion-decision.json").read_text()) if (ART / "promotion-decision.json").exists() else {}
    remap = parse_simple_yaml(ROOT / "config" / "remediation-map.yaml").get("remediations", {})

    failures = []
    for test, status in (results.get("tests") or {}).items():
        if status == "fail":
            meta = remap.get(test, {})
            failures.append({
                "id": test,
                "source": "test",
                "severity": meta.get("severity", "medium"),
                "owner_role": meta.get("owner_role", "developer"),
                "fix_hint": meta.get("fix_hint", "Inspect the failing logs and rerun targeted checks."),
                "playbook": meta.get("playbook", "docs/playbooks/tbd.md"),
                "sla_target": meta.get("sla_target", "2d"),
            })

    for item in promotion.get("failures", []):
        meta = remap.get("promotion_gate", {})
        failures.append({
            "id": "promotion_gate",
            "source": "promotion",
            "detail": item,
            "severity": meta.get("severity", "critical"),
            "owner_role": meta.get("owner_role", "release-manager"),
            "fix_hint": meta.get("fix_hint", "Resolve mandatory gate failures."),
            "playbook": meta.get("playbook", "docs/playbooks/promotion.md"),
            "sla_target": meta.get("sla_target", "same-day"),
        })

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "failure_count": len(failures),
        "failures": failures,
    }
    (ART / "failure-explanations.json").write_text(json.dumps(payload, indent=2))

    lines = ["# Failure Explanations", ""]
    if not failures:
        lines.append("No active failures found in latest artifacts.")
    else:
        for f in failures:
            lines += [
                f"## {f['id']}",
                f"- Source: **{f['source']}**",
                f"- Severity: **{f['severity']}**",
                f"- Owner role: **{f['owner_role']}**",
                f"- SLA target: **{f['sla_target']}**",
                f"- Fix hint: {f['fix_hint']}",
                f"- Playbook: `{f['playbook']}`",
            ]
            if f.get("detail"):
                lines.append(f"- Context: `{f['detail']}`")
            lines.append("")
    (ART / "failure-explanations.md").write_text("\n".join(lines) + "\n")
    print("Wrote artifacts/latest/failure-explanations.md")
    print("Wrote artifacts/latest/failure-explanations.json")


if __name__ == "__main__":
    main()
