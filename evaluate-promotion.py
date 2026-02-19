#!/usr/bin/env python3
import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path


CONTROL_TO_TEST = {
    "sast": "security_scan",
    "sca": "dependency_scan",
    "dast": "dast_zap",
    "perf_smoke": "performance_smoke",
    "contract": "contract",
    "resilience": "resilience",
    "chaos_resilience": "chaos_resilience",
    "secret_scan": "secret_scan",
    "api_fuzz_contract": "api_fuzz_contract",
    "dockerfile_policy": "dockerfile_policy",
    "iac_policy": "iac_policy",
    "resilience_intelligence": "resilience_intelligence",
}


def fail(msg: str):
    print(f"❌ {msg}")
    sys.exit(1)


def load_json(path: Path):
    if not path.exists():
        fail(f"Missing file: {path}")
    return json.loads(path.read_text())


def parse_exceptions_yaml(path: Path):
    items, current, in_section = [], None, False
    for line in path.read_text().splitlines():
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        if s == "exceptions:":
            in_section = True
            continue
        if not in_section:
            continue
        if s.startswith("- "):
            if current:
                items.append(current)
            current = {}
            s = s[2:]
        if current is None or ":" not in s:
            continue
        k, v = s.split(":", 1)
        current[k.strip()] = v.strip().strip('"').strip("'")
    if current:
        items.append(current)
    return items


def load_active_exceptions(exceptions_dir: Path, service: str, environment: str, tier: str):
    now = datetime.now(timezone.utc)
    active, invalid = [], []
    for f in [x for x in sorted(exceptions_dir.glob("*.yaml")) if x.name != "template.yaml"]:
        for exc in parse_exceptions_yaml(f):
            required = ["id", "service", "environment", "tier", "control", "owner", "approver", "expires_at"]
            missing = [k for k in required if not exc.get(k)]
            if not exc.get("rationale") and not exc.get("reason"):
                missing.append("rationale|reason")
            if missing:
                invalid.append({"id": exc.get("id", "unknown"), "reason": f"missing fields {missing}", "file": str(f)})
                continue
            if exc["service"] != service or exc["environment"] != environment:
                continue
            if exc["tier"] != tier:
                invalid.append({"id": exc["id"], "reason": f"tier mismatch ({exc['tier']} != {tier})", "file": str(f)})
                continue
            try:
                expires_at = datetime.fromisoformat(exc["expires_at"].replace("Z", "+00:00"))
            except Exception:
                invalid.append({"id": exc["id"], "reason": "invalid expires_at", "file": str(f)})
                continue
            if expires_at <= now:
                invalid.append({"id": exc["id"], "reason": "expired", "file": str(f)})
                continue
            active.append({
                "id": exc["id"],
                "control": exc["control"],
                "owner": exc["owner"],
                "approver": exc["approver"],
                "expires_at": exc["expires_at"],
                "rationale": exc.get("rationale", exc.get("reason", "")),
                "ticket": exc.get("ticket", "n/a"),
                "file": str(f),
            })
    return active, invalid


def load_optional_json(path: Path):
    if not path.exists():
        return None
    return json.loads(path.read_text())


def main():
    parser = argparse.ArgumentParser(description="Evaluate promotion eligibility against environment policy")
    parser.add_argument("--environment", required=True, choices=["dev", "stage", "prod"])
    parser.add_argument("--results", required=True, help="Path to assurance results.json")
    parser.add_argument("--evidence-dir", default="artifacts/latest", help="Directory containing evidence files")
    parser.add_argument("--policy-dir", default="config/promotion", help="Directory containing promotion policy JSON files")
    parser.add_argument("--tier-policy-dir", default="policies/tiers", help="Directory containing risk-tier control policies")
    parser.add_argument("--exceptions-dir", default="config/exceptions", help="Directory containing exception YAML files")
    parser.add_argument("--flaky-result", default="artifacts/latest/flaky-policy.json", help="Flaky policy result JSON")
    parser.add_argument("--evidence-bundle-dir", default="evidence/bundles", help="Signed evidence bundle location")
    parser.add_argument("--output", default="artifacts/latest/promotion-decision.json")
    args = parser.parse_args()

    policy = load_json(Path(args.policy_dir) / f"{args.environment}.json")
    results = load_json(Path(args.results))
    risk = results.get("risk_context", {})
    metrics = results.get("metrics", {})
    tests = results.get("tests", {})
    service = results.get("service", "sample-service")
    tier = risk.get("risk_tier", "low")

    tier_policy = load_json(Path(args.tier_policy_dir) / f"{tier}.json")
    required_controls = tier_policy.get("mandatory_controls", [])
    if tier in {"high", "critical"} and "chaos_resilience" not in required_controls:
        required_controls.append("chaos_resilience")

    failures = []
    control_matrix = []
    audit_reasons = []

    min_pass_rate = float(policy.get("minimum_test_pass_rate", 0))
    actual_pass_rate = float(metrics.get("test_pass_rate", 0))
    if actual_pass_rate < min_pass_rate:
        failures.append(f"test_pass_rate {actual_pass_rate} < required {min_pass_rate}")

    critical_failures = int(metrics.get("critical_test_failures", 1))
    if not policy.get("allow_critical_test_failures", False) and critical_failures > 0:
        failures.append(f"critical_test_failures={critical_failures} (must be 0)")

    active_exceptions, invalid_exceptions = load_active_exceptions(Path(args.exceptions_dir), service, args.environment, tier)
    for invalid in invalid_exceptions:
        failures.append(f"invalid exception {invalid['id']}: {invalid['reason']}")

    exception_by_control = {e["control"]: e for e in active_exceptions}

    for control in required_controls:
        test_key = CONTROL_TO_TEST.get(control)
        status = tests.get(test_key, "missing") if test_key else "missing"
        exception = exception_by_control.get(control)
        passed = status == "pass"
        waived = False
        if not passed and exception:
            waived = True
            passed = True
            audit_reasons.append(f"control {control} waived by exception {exception['id']}")
        if not passed:
            failures.append(f"mandatory control failed: {control} -> {test_key}={status}")
        control_matrix.append({
            "control": control,
            "test_key": test_key,
            "status": status,
            "required": True,
            "passed": passed,
            "exception_used": bool(exception),
            "exception": exception,
            "waived": waived,
        })

    if tier in {"high", "critical"}:
        ri_status = tests.get("resilience_intelligence", "missing")
        audit_reasons.append(f"resilience intelligence observed: status={ri_status}")
        control_matrix.append({
            "control": "resilience_intelligence",
            "test_key": "resilience_intelligence",
            "status": ri_status,
            "required": False,
            "passed": ri_status in {"pass", "skipped"},
            "exception_used": False,
            "exception": None,
            "waived": False,
            "note": "phase2-observe-only"
        })

    if tier == "critical" and active_exceptions:
        failures.append("exceptions are not permitted for critical tier")

    if policy.get("require_policy_validation", False) and risk.get("policy_validation_passed") is not True and not active_exceptions:
        failures.append("risk_context.policy_validation_passed is not true")

    test_to_control = {v: k for k, v in CONTROL_TO_TEST.items()}
    for test_name, allowed_states in policy.get("required_result_statuses", {}).items():
        state = tests.get(test_name, "missing")
        waived = False
        mapped_control = test_to_control.get(test_name)
        if mapped_control and mapped_control in exception_by_control and state not in allowed_states:
            waived = True
        if state not in allowed_states and not waived:
            failures.append(f"{test_name}={state} not in allowed {allowed_states}")

    evidence_dir = Path(args.evidence_dir)
    for required_file in policy.get("required_evidence_files", []):
        if not (evidence_dir / required_file).exists():
            failures.append(f"required evidence file missing: {(evidence_dir / required_file)}")

    flaky = load_optional_json(Path(args.flaky_result))
    if flaky and flaky.get("evaluated"):
        if not flaky.get("allowed", True):
            failures.append(f"flaky policy failed: {'; '.join(flaky.get('reasons', [])) or 'unknown reason'}")

    signature_required_tiers = set(policy.get("signature_required_tiers", ["high", "critical"]))
    fail_closed = bool(policy.get("signature_fail_closed", True))
    bundle_dir = Path(args.evidence_bundle_dir)
    has_signature = any(bundle_dir.glob("*.sig"))
    has_attestation = any(bundle_dir.glob("*.cert"))
    has_skip_reason = any(bundle_dir.glob("*.sig.skip.txt"))

    evidence_integrity = {
        "tier": tier,
        "signature_required": tier in signature_required_tiers,
        "signature_fail_closed": fail_closed,
        "bundle_dir": str(bundle_dir),
        "has_signature": has_signature,
        "has_attestation": has_attestation,
        "has_skip_reason": has_skip_reason,
    }

    if evidence_integrity["signature_required"]:
        if not (has_signature and has_attestation):
            reason = "signature/attestation missing for required tier"
            audit_reasons.append(reason)
            if has_skip_reason:
                audit_reasons.append("explicit skip reason present (*.sig.skip.txt)")
            if fail_closed:
                failures.append(reason)
    elif policy.get("require_signed_bundle", False):
        if not has_signature and not has_skip_reason:
            failures.append("no signature output found in evidence/bundles (*.sig or *.sig.skip.txt)")

    decision = {
        "environment": args.environment,
        "service": service,
        "risk_tier": tier,
        "required_controls": required_controls,
        "control_matrix": control_matrix,
        "exceptions_used": active_exceptions,
        "flaky_policy": flaky or {"evaluated": False},
        "evidence_integrity": evidence_integrity,
        "audit_reasons": audit_reasons,
        "failures": failures,
        "passed": len(failures) == 0,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "compliance_trace": "docs/compliance/control-traceability.md",
    }

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(decision, indent=2))

    if failures:
        print(f"❌ Promotion gate failed for {args.environment}")
        for item in failures:
            print(f" - {item}")
        sys.exit(1)

    print(f"✅ Promotion gate passed for {args.environment}")
    print(f"   Required controls: {', '.join(required_controls)}")
    if active_exceptions:
        print(f"   Exceptions used: {', '.join([e['id'] for e in active_exceptions])}")


if __name__ == "__main__":
    main()
