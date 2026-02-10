#!/usr/bin/env python3
"""Scaffold UAP onboarding assets for a service."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

VALID_TYPES = ["api", "frontend", "worker", "shared-lib"]
VALID_TIERS = ["low", "medium", "high", "critical"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Scaffold onboarding assets for a service")
    parser.add_argument("--service", required=True, help="Service name, e.g. payments-api")
    parser.add_argument("--type", required=True, choices=VALID_TYPES, dest="service_type")
    parser.add_argument("--tier", required=True, choices=VALID_TIERS)
    parser.add_argument("--owners", required=True, help="Comma-separated owners")
    parser.add_argument(
        "--repo-path",
        default="",
        help="Optional path override to the repository root (defaults to script parent repo)",
    )
    return parser.parse_args()


def owners_from_csv(raw: str) -> list[str]:
    owners = [owner.strip() for owner in raw.split(",") if owner.strip()]
    if not owners:
        raise SystemExit("--owners must include at least one owner")
    return owners


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def preflight_block(service: str, service_type: str) -> str:
    return (
        "```bash\n"
        f"make preflight MODULE={service} TYPE={service_type}\n"
        "make explain-last-fail\n"
        "make suggest-next-steps\n"
        "```"
    )


def onboarding_markdown(service: str, service_type: str, tier: str, owners: list[str]) -> str:
    owners_md = "\n".join(f"- {owner}" for owner in owners)
    return (
        f"# UAP Onboarding Checklist: {service}\n\n"
        f"- **Service**: `{service}`\n"
        f"- **Type**: `{service_type}`\n"
        f"- **Risk tier**: `{tier}`\n\n"
        "## 30-minute onboarding checklist\n"
        "- [ ] Confirm service profile generated in `config/services/`\n"
        "- [ ] Add CODEOWNERS snippet from onboarding artifact\n"
        "- [ ] Run preflight and capture first output\n"
        "- [ ] Confirm dashboard visibility in Grafana\n"
        "- [ ] Agree exception owner and escalation path\n"
        "- [ ] Compute onboarding score\n\n"
        "## Owners\n"
        f"{owners_md}\n\n"
        "## Initial preflight command block\n"
        f"{preflight_block(service, service_type)}\n"
    )


def main() -> int:
    args = parse_args()
    repo_root = Path(args.repo_path).resolve() if args.repo_path else Path(__file__).resolve().parents[1]
    owners = owners_from_csv(args.owners)

    generated_at = datetime.now(timezone.utc).isoformat()
    profile = {
        "service": args.service,
        "type": args.service_type,
        "tier": args.tier,
        "owners": owners,
        "onboarding": {
            "mode": "developer-onboarding",
            "current_stage": "A",
            "target_stage": "C",
            "generated_at": generated_at,
        },
        "preflight": {
            "command": f"make preflight MODULE={args.service} TYPE={args.service_type}",
            "notes": "Run once in Stage A and then per release candidate.",
        },
    }

    service_profile_path = repo_root / "config" / "services" / f"{args.service}.json"
    onboarding_doc_path = repo_root / "docs" / "generated" / f"onboarding-{args.service}.md"
    codeowners_path = (
        repo_root / "artifacts" / "latest" / "onboarding" / f"{args.service}-codeowners.txt"
    )

    ensure_parent(service_profile_path)
    ensure_parent(onboarding_doc_path)
    ensure_parent(codeowners_path)

    service_profile_path.write_text(json.dumps(profile, indent=2) + "\n", encoding="utf-8")
    onboarding_doc_path.write_text(
        onboarding_markdown(args.service, args.service_type, args.tier, owners),
        encoding="utf-8",
    )
    codeowners_path.write_text(
        f"/{args.service}/ {' '.join(owners)}\n",
        encoding="utf-8",
    )

    print(f"Generated: {service_profile_path}")
    print(f"Generated: {onboarding_doc_path}")
    print(f"Generated: {codeowners_path}")
    print("\nInitial preflight block:")
    print(preflight_block(args.service, args.service_type))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
