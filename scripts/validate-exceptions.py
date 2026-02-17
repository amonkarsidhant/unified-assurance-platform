#!/usr/bin/env python3
import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path


def parse_scalar(raw: str):
    value = raw.strip()
    if value.startswith('"') and value.endswith('"'):
        return value[1:-1]
    if value.startswith("'") and value.endswith("'"):
        return value[1:-1]
    if value.startswith("[") and value.endswith("]"):
        parts = [p.strip().strip('"').strip("'") for p in value[1:-1].split(",") if p.strip()]
        return parts
    return value


def parse_exceptions_yaml(path: Path):
    lines = path.read_text().splitlines()
    items, current = [], None
    in_section = False
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if stripped == "exceptions:":
            in_section = True
            continue
        if not in_section:
            continue
        if re.match(r"^-\s+", stripped):
            if current:
                items.append(current)
            current = {}
            first = stripped[2:]
            if ":" in first:
                k, v = first.split(":", 1)
                current[k.strip()] = parse_scalar(v)
            continue
        if current is None:
            continue
        if ":" in stripped:
            k, v = stripped.split(":", 1)
            current[k.strip()] = parse_scalar(v)
    if current:
        items.append(current)
    return items


def parse_time(ts: str):
    return datetime.fromisoformat(ts.replace("Z", "+00:00"))


def main():
    parser = argparse.ArgumentParser(description="Validate policy exceptions (expiry, approver, audit metadata)")
    parser.add_argument("--exceptions-dir", default="config/exceptions")
    parser.add_argument("--service", default="sample-service")
    parser.add_argument("--environment", required=True, choices=["dev", "stage", "prod"])
    parser.add_argument("--tier", required=True, choices=["low", "medium", "high", "critical"])
    parser.add_argument("--output", default="artifacts/latest/exceptions-audit.json")
    args = parser.parse_args()

    exc_dir = Path(args.exceptions_dir)
    files = [f for f in sorted(exc_dir.glob("*.yaml")) if f.name != "template.yaml"]
    now = datetime.now(timezone.utc)
    violations = []
    active = []

    for file in files:
        for exc in parse_exceptions_yaml(file):
            required = ["id", "service", "environment", "tier", "control", "owner", "approver", "approved_at", "expires_at", "rationale"]
            missing = [k for k in required if not exc.get(k)]
            if missing:
                violations.append({"file": str(file), "id": exc.get("id", "unknown"), "reason": f"missing fields: {missing}"})
                continue

            if exc["service"] != args.service or exc["environment"] != args.environment:
                continue

            if exc["tier"] != args.tier:
                violations.append({"file": str(file), "id": exc["id"], "reason": f"tier mismatch ({exc['tier']} != {args.tier})"})
                continue

            try:
                expires_at = parse_time(exc["expires_at"])
                approved_at = parse_time(exc["approved_at"])
            except Exception:
                violations.append({"file": str(file), "id": exc["id"], "reason": "invalid ISO timestamp format"})
                continue

            if approved_at > now:
                violations.append({"file": str(file), "id": exc["id"], "reason": "approved_at is in the future"})
                continue

            if expires_at <= now:
                violations.append({"file": str(file), "id": exc["id"], "reason": "exception expired"})
                continue

            active.append({
                "id": exc["id"],
                "control": exc["control"],
                "approver": exc["approver"],
                "approved_at": exc["approved_at"],
                "expires_at": exc["expires_at"],
                "owner": exc["owner"],
                "rationale": exc["rationale"],
                "ticket": exc.get("ticket", "n/a"),
                "file": str(file),
            })

    out = {
        "service": args.service,
        "environment": args.environment,
        "tier": args.tier,
        "generated_at": now.isoformat(),
        "active_exceptions": active,
        "violations": violations,
        "valid": len(violations) == 0,
    }

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(out, indent=2))
    print(f"Wrote exception audit: {out_path}")

    if violations:
        first = violations[0]
        print("❌ Governance gate failed")
        print(f"reason: exception metadata validation failed ({len(violations)} violation(s)); first={first['id']}: {first['reason']}")
        print("fix_hint: add required exception metadata fields (owner, expires_at, rationale) and remove expired exceptions")
        print("reproduce: python3 scripts/validate-exceptions.py --exceptions-dir config/exceptions --service sample-service --environment stage --tier high")
        print("owner: @release-governance")
        print("evidence: <link-to-evidence>")
        for v in violations:
            print(f" - {v['id']}: {v['reason']}")
        sys.exit(1)

    print(f"✅ Exception validation passed ({len(active)} active exception(s))")


if __name__ == "__main__":
    main()
