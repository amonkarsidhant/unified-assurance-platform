#!/usr/bin/env python3
"""Compute onboarding readiness score for a service."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

WEIGHT = 20


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Compute onboarding readiness score")
    parser.add_argument("--service", required=True, help="Service name")
    parser.add_argument(
        "--repo-path",
        default="",
        help="Optional path override to the repository root (defaults to script parent repo)",
    )
    return parser.parse_args()


def criterion(value: bool, ok_text: str, fail_text: str) -> dict:
    return {"ok": bool(value), "detail": ok_text if value else fail_text}


def main() -> int:
    args = parse_args()
    repo_root = Path(args.repo_path).resolve() if args.repo_path else Path(__file__).resolve().parents[1]

    service_profile = repo_root / "config" / "services" / f"{args.service}.json"
    onboarding_doc = repo_root / "docs" / "generated" / f"onboarding-{args.service}.md"
    codeowners_snippet = (
        repo_root / "artifacts" / "latest" / "onboarding" / f"{args.service}-codeowners.txt"
    )
    preflight_summary = repo_root / "artifacts" / "latest" / "preflight-summary.json"
    dashboard_doc = repo_root / "observability" / "dashboards.md"
    exception_template = repo_root / "config" / "exceptions" / "template.yaml"

    profile_data = {}
    if service_profile.exists():
        profile_data = json.loads(service_profile.read_text(encoding="utf-8"))

    owners = profile_data.get("owners", []) if isinstance(profile_data, dict) else []
    service_type = profile_data.get("type") if isinstance(profile_data, dict) else None
    tier = profile_data.get("tier") if isinstance(profile_data, dict) else None

    checks_data = {}
    if preflight_summary.exists():
        checks_data = json.loads(preflight_summary.read_text(encoding="utf-8"))

    checks_for_service = checks_data.get("module") == args.service
    checks_pass = checks_data.get("overall_status") == "pass"

    categories = {
        "owners": criterion(
            bool(owners) and codeowners_snippet.exists(),
            "Owners declared and CODEOWNERS snippet generated.",
            "Missing owners or CODEOWNERS snippet.",
        ),
        "profile": criterion(
            service_profile.exists() and onboarding_doc.exists() and bool(service_type) and bool(tier),
            "Service profile and onboarding checklist are present.",
            "Missing service profile/checklist or profile fields.",
        ),
        "checks": criterion(
            checks_for_service and checks_pass,
            "Latest preflight passed for this service.",
            "Preflight missing/failing or last run was for a different service.",
        ),
        "dashboard": criterion(
            dashboard_doc.exists() and len(dashboard_doc.read_text(encoding="utf-8").strip()) > 0,
            "Dashboard documentation is available for onboarding.",
            "Dashboard documentation missing.",
        ),
        "exceptions": criterion(
            exception_template.exists(),
            "Exception template is available.",
            "Exception template missing.",
        ),
    }

    score = sum(WEIGHT for _, c in categories.items() if c["ok"])
    readiness = "ready" if score >= 80 else "in-progress" if score >= 60 else "not-ready"

    result = {
        "service": args.service,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "score": score,
        "max_score": 100,
        "readiness": readiness,
        "categories": categories,
    }

    out_dir = repo_root / "artifacts" / "latest" / "onboarding"
    out_dir.mkdir(parents=True, exist_ok=True)
    json_out = out_dir / f"{args.service}-score.json"
    md_out = out_dir / f"{args.service}-score.md"

    json_out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")

    lines = [
        f"# Onboarding Score: {args.service}",
        "",
        f"- **Score**: {score}/100",
        f"- **Readiness**: {readiness}",
        "",
        "## Categories",
        "",
    ]
    for name, c in categories.items():
        lines.append(f"- **{name}**: {'✅' if c['ok'] else '❌'} — {c['detail']}")

    lines.append("")
    lines.append("## Recommended next action")
    if readiness != "ready":
        lines.append("- Run `make onboard ...` then `make preflight ...` and re-score.")
    else:
        lines.append("- Proceed to staged onboarding plan (`make onboarding-plan SERVICE=<name>`).")

    md_out.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"Generated: {json_out}")
    print(f"Generated: {md_out}")
    print(f"Onboarding score for {args.service}: {score}/100 ({readiness})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
