#!/usr/bin/env python3
"""Generate module-specific golden path documentation from module config."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from textwrap import dedent


def load_module_config(repo_root: Path, module_type: str) -> dict:
    cfg = repo_root / "config" / "modules" / f"{module_type}.json"
    if not cfg.exists():
        supported = sorted(p.stem for p in (repo_root / "config" / "modules").glob("*.json"))
        raise SystemExit(
            f"Unsupported module type '{module_type}'. Supported: {', '.join(supported)}"
        )
    return json.loads(cfg.read_text(encoding="utf-8"))


def to_markdown(module_name: str, module_type: str, profile: dict) -> str:
    mandatory = "\n".join(f"- [ ] {check}" for check in profile.get("mandatoryTests", []))

    stage = profile.get("promotionCriteria", {}).get("stage", {})
    prod = profile.get("promotionCriteria", {}).get("prod", {})

    def dict_items(d: dict) -> str:
        if not d:
            return "- (none)"
        return "\n".join(f"- **{k}**: `{v}`" for k, v in d.items())

    return dedent(
        f"""
        # Module Golden Path: {module_name}

        - **Module name**: `{module_name}`
        - **Module type**: `{module_type}`
        - **Risk tier**: `{profile.get('riskTier', 'unspecified')}`
        - **Primary owners**: `@team/{module_name}-owners` (replace)
        - **Secondary owners**: `@team/platform-owners` (replace)

        ## Required checks (PR + stage + prod)
        {mandatory}

        ## Gate expectations

        ### Stage promotion
        {dict_items(stage)}

        ### Production promotion
        {dict_items(prod)}

        ## CODEOWNERS placeholder
        ```text
        /{module_name}/ @team/{module_name}-owners @team/platform-owners
        ```

        ## Rollout checklist
        - [ ] PR merged with all required checks green
        - [ ] Stage deploy completed
        - [ ] Evidence bundle generated and attached
        - [ ] Rollback plan verified in runbook
        - [ ] Owner approvals recorded
        - [ ] Release train slot confirmed (or approved exception)

        ## Exception workflow checklist
        - [ ] Incident/risk ticket linked
        - [ ] Minimum emergency gate set passed
        - [ ] Required exception approvers signed off
        - [ ] Post-release retro + test-gap follow-up ticket created
        """
    ).strip() + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate module-specific golden path doc")
    parser.add_argument("--module", required=True, help="Module name (e.g., checkout-api)")
    parser.add_argument(
        "--type",
        required=True,
        dest="module_type",
        help="Module type (frontend|api|worker|shared-lib)",
    )
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[1]
    profile = load_module_config(repo_root, args.module_type)
    content = to_markdown(args.module, args.module_type, profile)

    out_dir = repo_root / "docs" / "generated"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{args.module}.md"
    out_path.write_text(content, encoding="utf-8")

    print(f"Generated: {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
