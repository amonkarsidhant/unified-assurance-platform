#!/usr/bin/env python3
import argparse
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Tuple

TESTS = ["lint", "unit", "integration", "contract", "security", "performance", "dast_zap"]
RECOMMENDATIONS = ["GO", "CONDITIONAL", "NO-GO"]


def parse_iso_ts(value: str) -> int:
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return int(dt.timestamp())
    except Exception:
        return int(time.time())


def count_vulns(trivy_path: Path) -> Tuple[int, int]:
    if not trivy_path.exists():
        return 0, 0
    try:
        data = json.loads(trivy_path.read_text())
    except Exception:
        return 0, 0

    high = 0
    medium = 0
    for result in data.get("Results", []):
        for vuln in result.get("Vulnerabilities", []) or []:
            sev = (vuln.get("Severity") or "").upper()
            if sev == "HIGH":
                high += 1
            elif sev == "MEDIUM":
                medium += 1
    return high, medium


def recommendation_from_results(results: Dict) -> str:
    metrics = results.get("metrics", {})
    risk_context = results.get("risk_context", {})

    mandatory_fail = False
    if float(metrics.get("test_pass_rate", 0)) < 0.95:
        mandatory_fail = True
    if int(metrics.get("critical_test_failures", 1)) > 0:
        mandatory_fail = True
    if risk_context.get("policy_validation_passed") is False:
        mandatory_fail = True

    high_vulns = int(metrics.get("high_vulnerabilities", 0))
    if high_vulns > 0:
        mandatory_fail = True

    medium_vulns = int(metrics.get("medium_vulnerabilities", 0))
    if mandatory_fail:
        return "NO-GO"
    if medium_vulns > 5:
        return "CONDITIONAL"
    return "GO"


def status_value(status: str) -> int:
    normalized = (status or "").strip().lower()
    if normalized == "pass":
        return 1
    if normalized == "fail":
        return 0
    return -1


def main() -> None:
    parser = argparse.ArgumentParser(description="Export assurance metrics to Prometheus textfile format")
    parser.add_argument("--input", default="artifacts/latest/results.json", help="Path to assurance results.json")
    parser.add_argument("--output", default="artifacts/metrics/assurance.prom", help="Output .prom file path")
    parser.add_argument("--trivy", default="artifacts/latest/trivy.json", help="Path to trivy JSON report")
    args = parser.parse_args()

    results_path = Path(args.input)
    if not results_path.exists():
        raise SystemExit(f"Input file not found: {results_path}")

    results = json.loads(results_path.read_text())
    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    now = int(time.time())
    ts = parse_iso_ts(results.get("timestamp", ""))

    tests = results.get("tests", {})
    risk = results.get("risk_context", {})
    metrics = results.get("metrics", {})

    high_vulns, medium_vulns = count_vulns(Path(args.trivy))
    if "high_vulnerabilities" in metrics:
        high_vulns = int(metrics.get("high_vulnerabilities", high_vulns))
    if "medium_vulnerabilities" in metrics:
        medium_vulns = int(metrics.get("medium_vulnerabilities", medium_vulns))

    recommendation = recommendation_from_results(results)
    risk_tier = risk.get("risk_tier", "unknown")

    mapped_tests = {
        "lint": tests.get("lint"),
        "unit": tests.get("unit"),
        "integration": tests.get("integration"),
        "contract": tests.get("contract"),
        "security": tests.get("security_scan", tests.get("security")),
        "performance": tests.get("performance_smoke", tests.get("performance")),
        "dast_zap": tests.get("dast_zap"),
    }

    lines = [
        "# HELP assurance_release_recommendation Release recommendation per assurance run (one-hot by recommendation label).",
        "# TYPE assurance_release_recommendation gauge",
    ]
    for rec in RECOMMENDATIONS:
        value = 1 if recommendation == rec else 0
        lines.append(f'assurance_release_recommendation{{recommendation="{rec}"}} {value}')

    lines += [
        "# HELP assurance_test_status Assurance test status by test name (pass=1, fail=0, skipped/unknown=-1).",
        "# TYPE assurance_test_status gauge",
    ]
    for test in TESTS:
        raw = mapped_tests.get(test, "unknown")
        val = status_value(raw)
        lines.append(f'assurance_test_status{{test="{test}",status="{raw or "unknown"}"}} {val}')

    lines += [
        "# HELP assurance_pass_rate Assurance pass rate (0-1).",
        "# TYPE assurance_pass_rate gauge",
        f'assurance_pass_rate {float(metrics.get("test_pass_rate", 0.0))}',
        "# HELP assurance_policy_validation_passed Whether policy validation passed (1=true, 0=false).",
        "# TYPE assurance_policy_validation_passed gauge",
        f'assurance_policy_validation_passed {1 if risk.get("policy_validation_passed") else 0}',
        "# HELP assurance_risk_score Assurance risk score.",
        "# TYPE assurance_risk_score gauge",
        f'assurance_risk_score{{risk_tier="{risk_tier}"}} {float(risk.get("risk_score", 0))}',
        "# HELP assurance_critical_failures Critical test failures count.",
        "# TYPE assurance_critical_failures gauge",
        f'assurance_critical_failures {int(metrics.get("critical_test_failures", 0))}',
        "# HELP assurance_security_vulnerabilities Security vulnerabilities by severity.",
        "# TYPE assurance_security_vulnerabilities gauge",
        f'assurance_security_vulnerabilities{{severity="high"}} {high_vulns}',
        f'assurance_security_vulnerabilities{{severity="medium"}} {medium_vulns}',
        "# HELP assurance_run_timestamp_seconds Unix timestamp of results.json timestamp.",
        "# TYPE assurance_run_timestamp_seconds gauge",
        f'assurance_run_timestamp_seconds {ts}',
        "# HELP assurance_run_age_seconds Age of the assurance run in seconds.",
        "# TYPE assurance_run_age_seconds gauge",
        f'assurance_run_age_seconds {max(0, now - ts)}',
    ]

    tmp = out_path.with_suffix(".prom.tmp")
    tmp.write_text("\n".join(lines) + "\n")
    tmp.replace(out_path)
    print(f"Exported assurance metrics to {out_path}")


if __name__ == "__main__":
    main()
