#!/usr/bin/env python3
import argparse
import json
from pathlib import Path


def recommendation(metrics: dict, risk_context: dict) -> str:
    if metrics.get("critical_test_failures", 0) > 0:
        return "NO-GO"
    if risk_context.get("policy_validation_passed") is False:
        return "NO-GO"
    if float(metrics.get("test_pass_rate", 0)) < 0.95:
        return "CONDITIONAL"
    return "GO"


def normalize(data: dict, exceptions: dict | None, promotion: dict | None, flaky: dict | None) -> dict:
    risk = data.get("risk_context", {})
    metrics = data.get("metrics", {})
    tests = data.get("tests", {})
    evidence = data.get("evidence", {})

    security_tests = {k: tests.get(k, "missing") for k in ["security_scan", "dependency_scan", "dast_zap", "secret_scan", "api_fuzz_contract", "dockerfile_policy", "iac_policy"]}
    performance_tests = {k: tests.get(k, "missing") for k in ["performance_smoke", "resilience"]}

    return {
        "contract_version": "results.v2",
        "service": data.get("service", "unknown"),
        "timestamp": data.get("timestamp"),
        "summary": {
            "recommendation": recommendation(metrics, risk),
            "risk_tier": risk.get("risk_tier", "low"),
            "risk_score": risk.get("risk_score"),
            "policy_validation_passed": bool(risk.get("policy_validation_passed", False)),
        },
        "sections": {
            "tests": {
                "status": tests,
                "metrics": {
                    "test_pass_rate": metrics.get("test_pass_rate"),
                    "critical_test_failures": metrics.get("critical_test_failures"),
                },
                "flaky": flaky or {"evaluated": False},
            },
            "security": {
                "findings": {
                    "high_vulnerabilities": metrics.get("high_vulnerabilities", 0),
                    "medium_vulnerabilities": metrics.get("medium_vulnerabilities", 0),
                },
                "controls": security_tests,
                "artifacts": {
                    "semgrep_json": evidence.get("tool_outputs", {}).get("semgrep_json"),
                    "trivy_json": evidence.get("tool_outputs", {}).get("trivy_json"),
                    "dast_log": evidence.get("tool_logs", {}).get("dast_zap"),
                    "gitleaks_log": evidence.get("tool_logs", {}).get("secret_scan"),
                    "schemathesis_log": evidence.get("tool_logs", {}).get("api_fuzz_contract"),
                    "hadolint_log": evidence.get("tool_logs", {}).get("dockerfile_policy"),
                    "checkov_log": evidence.get("tool_logs", {}).get("iac_policy"),
                },
            },
            "performance": {
                "metrics": {
                    "availability_slo": metrics.get("availability_slo"),
                    "p95_latency_ms": metrics.get("p95_latency_ms"),
                },
                "controls": performance_tests,
                "artifacts": {
                    "k6_summary_json": evidence.get("tool_outputs", {}).get("k6_summary_json"),
                    "perf_log": evidence.get("tool_logs", {}).get("performance_smoke"),
                },
            },
            "policy": {
                "required_controls": risk.get("required_controls", []),
                "control_status": risk.get("control_status", {}),
                "missing_required_controls": risk.get("missing_required_controls", []),
                "promotion": promotion or {},
            },
            "exceptions": exceptions or {"active_exceptions": [], "violations": []},
            "evidence": {
                "tool_logs": evidence.get("tool_logs", {}),
                "tool_outputs": evidence.get("tool_outputs", {}),
                "pointers": [
                    "artifacts/latest/results.json",
                    "artifacts/latest/release-report.md",
                    "artifacts/latest/promotion-decision.json",
                ],
            },
        },
        "legacy_results_path": "artifacts/latest/results.json",
    }


def load_optional(path: str | None):
    if not path:
        return None
    p = Path(path)
    if not p.exists():
        return None
    return json.loads(p.read_text())


def main():
    parser = argparse.ArgumentParser(description="Normalize legacy results.json into results.v2 contract")
    parser.add_argument("--input", default="artifacts/latest/results.json")
    parser.add_argument("--output", default="artifacts/latest/results.v2.json")
    parser.add_argument("--exceptions", default="artifacts/latest/exceptions-audit.json")
    parser.add_argument("--promotion", default="artifacts/latest/promotion-decision.json")
    parser.add_argument("--flaky", default="artifacts/latest/flaky-policy.json")
    args = parser.parse_args()

    data = json.loads(Path(args.input).read_text())
    payload = normalize(
        data,
        load_optional(args.exceptions),
        load_optional(args.promotion),
        load_optional(args.flaky),
    )

    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2))
    print(f"Wrote normalized results.v2: {out}")


if __name__ == "__main__":
    main()
