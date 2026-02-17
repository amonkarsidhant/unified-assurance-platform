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
        # Matches field lines ending with ':' and no value (e.g., '- Field:' or 'Field:')
        if re.match(r"^[-*]?\s*[^:]+:\s*$", line):
            return True
        # Treat comment-only values as unanswered (e.g., '- Field: <!-- example -->').
        if re.match(r"^[-*]?\s*[^:]+:\s*<!--.*?-->\s*$", line):
            return True
    return False


def validate_pr_body(event_path: Path, template_path: Path):
    if not event_path.exists():
        return
    payload = json.loads(event_path.read_text(encoding="utf-8"))
    pr = payload.get("pull_request")
    if not pr:
        return

    body = pr.get("body") or ""
    sections = parse_sections(body)
    template_sections = parse_sections(read_text(template_path))
    required = {
        "architecture guardrail compliance declaration": "declare compliance status and any justified deviations",
        "reliability impact + rollback criteria": "include blast radius and explicit rollback trigger",
        "qa evidence completeness declaration": "state completeness and attach evidence links",
        "devex impact + local reproduce command": "describe devex impact and exact local reproduce command",
    }

    for section, hint in required.items():
        value = sections.get(section)
        if not value or re.search(r"\bTODO\b|<fill|TBD", value, flags=re.IGNORECASE):
            gate_fail(
                reason=f"pull request body section incomplete or missing: '{section}'",
                fix_hint=hint,
                reproduce=f"python3 scripts/validate-governance-artifacts.py --event-path {event_path}",
            )

        if normalize_section_text(value) == normalize_section_text(template_sections.get(section, "")):
            gate_fail(
                reason=f"pull request body section left unchanged from template: '{section}'",
                fix_hint=hint,
                reproduce=f"python3 scripts/validate-governance-artifacts.py --event-path {event_path}",
            )

        if re.search(r"\[\s*\]", value):
            gate_fail(
                reason=f"pull request body section still contains unchecked checkboxes: '{section}'",
                fix_hint=hint,
                reproduce=f"python3 scripts/validate-governance-artifacts.py --event-path {event_path}",
            )

        if has_unanswered_field(value):
            gate_fail(
                reason=f"pull request body section has blank answer fields: '{section}'",
                fix_hint=hint,
                reproduce=f"python3 scripts/validate-governance-artifacts.py --event-path {event_path}",
            )


def validate_exception_template(path: Path):
    text = read_text(path)
    for key in ["owner:", "expires_at:", "rationale:"]:
        if key not in text:
            gate_fail(
                reason=f"{path} missing required exception metadata key: {key}",
                fix_hint="add owner/expires_at/rationale fields to exception schema template",
                reproduce="python3 scripts/validate-governance-artifacts.py",
            )


def main():
    parser = argparse.ArgumentParser(description="Validate governance templates and CI gate contract")
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--event-path", default=os.environ.get("GITHUB_EVENT_PATH", ""))
    args = parser.parse_args()

    root = Path(args.repo_root)

    assert_contains_all(
        root / ".github/pull_request_template.md",
        [
            "## Architecture guardrail compliance declaration",
            "## Reliability impact + rollback criteria",
            "## QA evidence completeness declaration",
            "## DevEx impact + local reproduce command",
        ],
        "python3 scripts/validate-governance-artifacts.py",
    )

    assert_contains_all(
        root / ".github/ISSUE_TEMPLATE/bug_report.md",
        [
            "## Architecture guardrail compliance declaration",
            "## Reliability impact + rollback criteria",
            "## QA evidence completeness declaration",
            "## DevEx impact + local reproduce command",
        ],
        "python3 scripts/validate-governance-artifacts.py",
    )

    assert_contains_all(
        root / ".github/ISSUE_TEMPLATE/feature_request.md",
        [
            "## Architecture guardrail compliance declaration",
            "## Reliability impact + rollback criteria",
            "## QA evidence completeness declaration",
            "## DevEx impact + local reproduce command",
        ],
        "python3 scripts/validate-governance-artifacts.py",
    )

    assert_contains_all(
        root / "docs/governance/gate-failure-message-contract.md",
        ["check:", "reason:", "fix_hint:", "reproduce:", "owner:", "evidence:"],
        "python3 scripts/validate-governance-artifacts.py",
    )

    validate_exception_template(root / "config/exceptions/template.yaml")

    if args.event_path:
        validate_pr_body(Path(args.event_path), root / ".github/pull_request_template.md")

    print("✅ Governance artifact checks passed")


if __name__ == "__main__":
    main()
