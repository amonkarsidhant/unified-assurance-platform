#!/usr/bin/env python3
import argparse
import json
import os
import re
import sys
from pathlib import Path


OWNER = "@release-governance"
EVIDENCE_PLACEHOLDER = "<link-to-evidence>"


def gate_fail(reason: str, fix_hint: str, reproduce: str, check: str = "governance-guardrails"):
    print("❌ Governance gate failed")
    print(f"check: {check}")
    print(f"reason: {reason}")
    print(f"fix_hint: {fix_hint}")
    print(f"reproduce: {reproduce}")
    print(f"owner: {OWNER}")
    print(f"evidence: {EVIDENCE_PLACEHOLDER}")
    sys.exit(1)


def read_text(path: Path) -> str:
    if not path.exists():
        gate_fail(
            reason=f"required artifact missing: {path}",
            fix_hint=f"add {path} from repository governance baseline",
            reproduce="python3 scripts/validate-governance-artifacts.py",
        )
    return path.read_text(encoding="utf-8")


def assert_contains_all(path: Path, required_snippets: list[str], repro: str):
    text = read_text(path)
    missing = [s for s in required_snippets if s not in text]
    if missing:
        gate_fail(
            reason=f"{path} missing required governance sections: {missing}",
            fix_hint="update template to include required section heading/checklist text exactly",
            reproduce=repro,
        )


def parse_sections(markdown: str) -> dict[str, str]:
    sections: dict[str, str] = {}
    current = None
    buffer: list[str] = []
    for line in markdown.splitlines():
        m = re.match(r"^##\s+(.+?)\s*$", line)
        if m:
            if current is not None:
                sections[current.lower()] = "\n".join(buffer).strip()
            current = m.group(1).strip()
            buffer = []
            continue
        if current is not None:
            buffer.append(line)
    if current is not None:
        sections[current.lower()] = "\n".join(buffer).strip()
    return sections


def normalize_section_text(text: str) -> str:
    lines = [ln.rstrip() for ln in text.strip().splitlines()]
    return "\n".join(lines).strip()


def has_unanswered_field(section_text: str) -> bool:
    for raw in section_text.splitlines():
        line = raw.strip()
        if not line:
            continue
        if re.match(r"^[-*]?\s*[^:]+:\s*$", line):
            return True
        if re.match(r"^[-*]?\s*[^:]+:\s*<!--.*?-->\s*$", line):
            return True
    return False


def validate_pr_body(event_path: Path, template_path: Path):
    if event_path is None:
        gate_fail(
            reason="event path is required",
            fix_hint="pass --event-path from GITHUB_EVENT_PATH",
            reproduce="python3 scripts/validate-governance-artifacts.py --event-path <path-to-event-json>",
        )
    if not event_path.exists():
        gate_fail(
            reason=f"event file not found: {event_path}",
            fix_hint="ensure GITHUB_EVENT_PATH points to a valid JSON file",
            reproduce=f"python3 scripts/validate-governance-artifacts.py --event-path {event_path}",
        )
    try:
        payload = json.loads(event_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        gate_fail(
            reason=f"invalid JSON in event file: {e}",
            fix_hint="ensure the event file contains valid JSON",
            reproduce=f"python3 scripts/validate-governance-artifacts.py --event-path {event_path}",
        )
    pr = payload.get("pull_request")
    if not pr:
        return

    body = pr.get("body") or ""
    sections = parse_sections(body)
    template_sections = parse_sections(read_text(template_path))
    required = {
        "change type": "## Change type",
        "risk assessment": "## Risk assessment",
        "validation": "## Validation",
        "evidence": "## Evidence",
        "policy and controls impact": "## Policy and controls impact",
        "documentation impact": "## Documentation impact",
        "architecture guardrail compliance declaration": "## Architecture guardrail compliance declaration",
    }
    for section_key, section_name in required.items():
        if section_key not in sections:
            gate_fail(
                reason=f"pull request body section incomplete or missing: '{section_name}'",
                fix_hint="declare compliance status and any justified deviations",
                reproduce=f"python3 {__file__} --event-path {event_path}",
            )
        if section_key == "change type":
            section_text = normalize_section_text(sections[section_key])
            has_checked = bool(re.search(r"\[x\]\s+(feat|fix|docs|refactor|test|chore)", section_text, re.IGNORECASE))
            if not has_checked:
                gate_fail(
                    reason=f"'{section_name}' section missing checked change type",
                    fix_hint="check at least one change type (feat, fix, docs, etc.)",
                    reproduce=f"python3 {__file__} --event-path {event_path}",
                )
        if section_key == "architecture guardrail compliance declaration":
            section_text = normalize_section_text(sections[section_key])
            if "I confirm this change complies" not in section_text:
                gate_fail(
                    reason=f"'{section_name}' must contain compliance confirmation",
                    fix_hint="declare compliance or document any justified deviations",
                    reproduce=f"python3 {__file__} --event-path {event_path}",
                )
            if "architecture guardrails" not in section_text.lower():
                gate_fail(
                    reason=f"'{section_name}' must reference the architecture guardrails",
                    fix_hint="include reference to docs/architecture/guardrail-checklist.md or document deviations",
                    reproduce=f"python3 {__file__} --event-path {event_path}",
                )

    print("✅ PR body governance sections present")


def main():
    parser = argparse.ArgumentParser(description="Validate governance artifacts in repository.")
    parser.add_argument("--event-path", type=Path, required=True, help="Path to GitHub event JSON file")
    parser.add_argument("--template-path", type=Path, default=Path(".github/pull_request_template.md"), help="Path to PR template")
    args = parser.parse_args()

    validate_pr_body(args.event_path, args.template_path)
    print("✅ Governance artifact validation passed")


if __name__ == "__main__":
    main()
