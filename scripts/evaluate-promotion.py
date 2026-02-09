#!/usr/bin/env python3
import argparse
import json
import sys
from pathlib import Path


def fail(msg: str):
    print(f"❌ {msg}")
    sys.exit(1)


def load_json(path: Path):
    if not path.exists():
        fail(f"Missing file: {path}")
    return json.loads(path.read_text())


def main():
    parser = argparse.ArgumentParser(description="Evaluate promotion eligibility against environment policy")
    parser.add_argument("--environment", required=True, choices=["dev", "stage", "prod"])
    parser.add_argument("--results", required=True, help="Path to assurance results.json")
    parser.add_argument("--evidence-dir", default="artifacts/latest", help="Directory containing evidence files")
    parser.add_argument("--policy-dir", default="config/promotion", help="Directory containing promotion policy JSON files")
    args = parser.parse_args()

    policy = load_json(Path(args.policy_dir) / f"{args.environment}.json")
    results = load_json(Path(args.results))

    failures = []
    metrics = results.get("metrics", {})
    tests = results.get("tests", {})
    risk = results.get("risk_context", {})

    min_pass_rate = float(policy.get("minimum_test_pass_rate", 0))
    actual_pass_rate = float(metrics.get("test_pass_rate", 0))
    if actual_pass_rate < min_pass_rate:
        failures.append(f"test_pass_rate {actual_pass_rate} < required {min_pass_rate}")

    critical_failures = int(metrics.get("critical_test_failures", 1))
    if not policy.get("allow_critical_test_failures", False) and critical_failures > 0:
        failures.append(f"critical_test_failures={critical_failures} (must be 0)")

    if policy.get("require_policy_validation", False) and risk.get("policy_validation_passed") is not True:
        failures.append("risk_context.policy_validation_passed is not true")

    for test_name, allowed_states in policy.get("required_result_statuses", {}).items():
        state = tests.get(test_name, "missing")
        if state not in allowed_states:
            failures.append(f"{test_name}={state} not in allowed {allowed_states}")

    evidence_dir = Path(args.evidence_dir)
    for required_file in policy.get("required_evidence_files", []):
        if not (evidence_dir / required_file).exists():
            failures.append(f"required evidence file missing: {(evidence_dir / required_file)}")

    if policy.get("require_signed_bundle", False):
        bundle_dir = Path("evidence/bundles")
        has_signature = any(bundle_dir.glob("*.sig"))
        has_skip_reason = any(bundle_dir.glob("*.sig.skip.txt"))
        if not has_signature and not has_skip_reason:
            failures.append("no signature output found in evidence/bundles (*.sig or *.sig.skip.txt)")

    if failures:
        print(f"❌ Promotion gate failed for {args.environment}")
        for item in failures:
            print(f" - {item}")
        sys.exit(1)

    print(f"✅ Promotion gate passed for {args.environment}")
    print(f"   Required checks: {', '.join(policy.get('required_checks', []))}")


if __name__ == "__main__":
    main()
