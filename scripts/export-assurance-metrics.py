#!/usr/bin/env python3
import argparse
import json
import re
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

TESTS = ["lint", "unit", "integration", "contract", "security", "performance", "dast_zap"]
RECOMMENDATIONS = ["GO", "CONDITIONAL", "NO-GO"]


def parse_iso_ts(value: str) -> int:
    try:
        dt = datetime.fromisoformat((value or "").replace("Z", "+00:00"))
        return int(dt.timestamp())
    except Exception:
        return int(time.time())


def read_json(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text())
    except Exception:
        return {}


def count_vulns(trivy_path: Path) -> Tuple[int, int]:
    data = read_json(trivy_path)
    if not data:
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


def recommendation_from_results(results: Dict[str, Any]) -> str:
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


def prom_escape(value: str) -> str:
    return (value or "").replace('\\', '\\\\').replace('"', '\\"').replace("\n", " ")


def add_gauge(lines: List[str], name: str, help_text: str, value: float, labels: Optional[Dict[str, str]] = None) -> None:
    lines.append(f"# HELP {name} {help_text}")
    lines.append(f"# TYPE {name} gauge")
    if labels:
        rendered = ",".join([f'{k}="{prom_escape(v)}"' for k, v in labels.items()])
        lines.append(f"{name}{{{rendered}}} {value}")
    else:
        lines.append(f"{name} {value}")


def parse_pr_severity_counts(pr_comment_path: Path) -> Dict[str, int]:
    text = pr_comment_path.read_text() if pr_comment_path.exists() else ""
    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    if not text:
        return counts

    patterns = {
        "critical": re.compile(r"critical", re.IGNORECASE),
        "high": re.compile(r"\bhigh\b", re.IGNORECASE),
        "medium": re.compile(r"\bmedium\b", re.IGNORECASE),
        "low": re.compile(r"\blow\b", re.IGNORECASE),
    }
    for line in text.splitlines():
        for sev, pat in patterns.items():
            if pat.search(line):
                m = re.search(r"(\d+)", line)
                if m:
                    counts[sev] = max(counts[sev], int(m.group(1)))
    return counts


def main() -> None:
    parser = argparse.ArgumentParser(description="Export assurance metrics to Prometheus textfile format")
    parser.add_argument("--input", default="artifacts/latest/results.json", help="Path to assurance results.json")
    parser.add_argument("--output", default="artifacts/metrics/assurance.prom", help="Output .prom file path")
    parser.add_argument("--trivy", default="artifacts/latest/trivy.json", help="Path to trivy JSON report")
    parser.add_argument("--promotion", default="artifacts/latest/promotion-decision.json", help="Path to promotion decision JSON")
    parser.add_argument("--flaky", default="artifacts/latest/flaky-policy.json", help="Path to flaky policy result JSON")
    parser.add_argument("--results-v2", default="artifacts/latest/results.v2.json", help="Path to results.v2 JSON")
    parser.add_argument("--exceptions-audit", default="artifacts/latest/exceptions-audit.json", help="Path to exceptions audit JSON")
    parser.add_argument("--pr-comment", default="artifacts/latest/pr-comment.md", help="Path to rendered PR comment markdown")
    args = parser.parse_args()

    results_path = Path(args.input)
    if not results_path.exists():
        raise SystemExit(f"Input file not found: {results_path}")

    results = read_json(results_path)
    promotion = read_json(Path(args.promotion))
    flaky = read_json(Path(args.flaky))
    results_v2 = read_json(Path(args.results_v2))
    exceptions_audit = read_json(Path(args.exceptions_audit))

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

    # Governance / promotion metrics
    promotion_allowed = 1 if promotion.get("passed") is True else 0
    add_gauge(lines, "assurance_promotion_allowed", "Promotion decision allowed (1=yes, 0=no).", promotion_allowed)

    failures = promotion.get("failures") or []
    add_gauge(lines, "assurance_promotion_failed_gates_total", "Number of failed promotion gates.", int(len(failures)))

    lines.append("# HELP assurance_promotion_failed_gate Failed gate one-hot series (1=failed gate present).")
    lines.append("# TYPE assurance_promotion_failed_gate gauge")
    if failures:
        for gate in failures:
            lines.append(f'assurance_promotion_failed_gate{{gate="{prom_escape(str(gate))}"}} 1')
    else:
        lines.append('assurance_promotion_failed_gate{gate="none"} 0')

    evidence = promotion.get("evidence_integrity", {})
    add_gauge(lines, "assurance_evidence_signature_required", "Evidence signature required for this tier.", 1 if evidence.get("signature_required") else 0)
    add_gauge(lines, "assurance_evidence_signature_present", "Evidence signature present.", 1 if evidence.get("has_signature") else 0)
    add_gauge(lines, "assurance_evidence_attestation_present", "Evidence attestation/cert present.", 1 if evidence.get("has_attestation") else 0)
    add_gauge(lines, "assurance_evidence_fail_closed", "Evidence integrity fail-closed policy enabled.", 1 if evidence.get("signature_fail_closed") else 0)

    active_exceptions = exceptions_audit.get("active_exceptions") or promotion.get("exceptions_used") or []
    violations = exceptions_audit.get("violations") or []
    expired_count = 0
    for v in violations:
        txt = json.dumps(v).lower()
        if "expired" in txt or "expiry" in txt:
            expired_count += 1

    add_gauge(lines, "assurance_exceptions_active_total", "Total active exceptions.", len(active_exceptions))
    add_gauge(lines, "assurance_exceptions_expired_total", "Total expired exceptions detected.", expired_count)
    add_gauge(lines, "assurance_exceptions_violations_total", "Total exception governance violations.", len(violations))

    flaky_policy = flaky or promotion.get("flaky_policy") or {}
    add_gauge(lines, "assurance_flaky_violations_total", "Flaky policy violations total.", len(flaky_policy.get("reasons") or []))
    add_gauge(lines, "assurance_flaky_count", "Number of flaky tests identified.", int(flaky_policy.get("flaky_count", 0) or 0))
    add_gauge(lines, "assurance_flaky_allowed", "Flaky policy allows promotion.", 1 if flaky_policy.get("allowed") else 0)

    # Control matrix approximation for dashboard table
    control_matrix = promotion.get("control_matrix")
    if not control_matrix:
        control_matrix = ((results_v2.get("sections") or {}).get("policy") or {}).get("promotion", {}).get("control_matrix", [])

    lines.append("# HELP assurance_control_required Required control by control name (1=yes).")
    lines.append("# TYPE assurance_control_required gauge")
    lines.append("# HELP assurance_control_pass Tier-required control pass status (1=pass,0=fail).")
    lines.append("# TYPE assurance_control_pass gauge")
    if control_matrix:
        for item in control_matrix:
            control = str(item.get("control", "unknown"))
            required = 1 if item.get("required") else 0
            passed = 1 if item.get("passed") else 0
            status = str(item.get("status", "unknown"))
            lines.append(f'assurance_control_required{{control="{prom_escape(control)}"}} {required}')
            lines.append(f'assurance_control_pass{{control="{prom_escape(control)}",status="{prom_escape(status)}"}} {passed}')
    else:
        lines.append('assurance_control_required{control="none"} 0')
        lines.append('assurance_control_pass{control="none",status="unknown"} 0')

    # PR-summary style severities (prefer pr-comment parse, fallback to results-derived)
    severity_counts = parse_pr_severity_counts(Path(args.pr_comment))
    if sum(severity_counts.values()) == 0:
        severity_counts = {
            "critical": int(metrics.get("critical_test_failures", 0) or 0),
            "high": int(high_vulns),
            "medium": int(medium_vulns),
            "low": int(len(failures)),
        }

    lines.append("# HELP assurance_pr_summary_severity_total PR summary style severity counts.")
    lines.append("# TYPE assurance_pr_summary_severity_total gauge")
    for sev, count in severity_counts.items():
        lines.append(f'assurance_pr_summary_severity_total{{severity="{sev}"}} {int(count)}')

    tmp = out_path.with_suffix(".prom.tmp")
    tmp.write_text("\n".join(lines) + "\n")
    tmp.replace(out_path)
    print(f"Exported assurance metrics to {out_path}")


if __name__ == "__main__":
    main()
