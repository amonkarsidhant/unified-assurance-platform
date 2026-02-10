#!/usr/bin/env python3
"""Print staged onboarding plan for a service."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Print onboarding stage plan for a service")
    parser.add_argument("--service", required=True)
    parser.add_argument("--repo-path", default="")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = Path(args.repo_path).resolve() if args.repo_path else Path(__file__).resolve().parents[1]
    profile_path = root / "config" / "services" / f"{args.service}.json"
    stages_path = root / "config" / "onboarding-stages.json"

    if not profile_path.exists():
        raise SystemExit(f"Missing service profile: {profile_path}")
    if not stages_path.exists():
        raise SystemExit(f"Missing onboarding stages: {stages_path}")

    profile = json.loads(profile_path.read_text(encoding="utf-8"))
    stages = json.loads(stages_path.read_text(encoding="utf-8")).get("stages", {})

    print(f"Onboarding plan for {args.service} (tier: {profile.get('tier', 'unknown')})")
    for stage in ["A", "B", "C"]:
        data = stages.get(stage, {})
        print(
            f"\nStage {stage}: {data.get('name', 'n/a')} "
            f"({data.get('default_duration_days', 0)} days)"
        )
        print(f"- Description: {data.get('description', '')}")
        print("- Entry criteria:")
        for item in data.get("entry_criteria", []):
            print(f"  - {item}")
        print("- Exit criteria:")
        for item in data.get("exit_criteria", []):
            print(f"  - {item}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
