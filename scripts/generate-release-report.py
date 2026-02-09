#!/usr/bin/env python3
import argparse
import json
from pathlib import Path

MANDATORY = {
    "test_pass_rate": lambda v: v >= 0.95,
    "critical_test_failures": lambda v: v <= 0,
    "high_vulnerabilities": lambda v: v <= 0,
    "availability_slo": lambda v: v >= 99.9,
    "p95_latency_ms": lambda v: v <= 400,
}
SOFT = {
    "medium_vulnerabilities": lambda v: v <= 5,
    "flaky_tests": lambda v: v <= 3,
    "test_coverage": lambda v: v >= 0.75,
}


def evaluate(metrics, risk_context):
    mandatory_failed = [k for k, check in MANDATORY.items() if not check(metrics.get(k, float("inf")))]
    soft_failed = [k for k, check in SOFT.items() if not check(metrics.get(k, float("inf")))]

    if risk_context and risk_context.get("policy_validation_passed") is False:
        mandatory_failed.append("risk_policy_required_controls")

    if mandatory_failed:
        decision = "NO-GO"
    elif soft_failed:
        decision = "CONDITIONAL"
    else:
        decision = "GO"
    return decision, mandatory_failed, soft_failed


def render(data):
    metrics = data.get("metrics", {})
    risk_context = data.get("risk_context", {})
    decision, mandatory_failed, soft_failed = evaluate(metrics, risk_context)

    if decision == "GO":
        plain_summary = "Release is ready. Mandatory and soft gates passed for the current risk context."
    elif decision == "CONDITIONAL":
        plain_summary = "Release can proceed with caution. Mandatory gates passed, but follow-up is needed on soft signals."
    else:
        plain_summary = "Release is not ready. Mandatory quality or risk-policy controls failed."

    lines = [
        "# Release Assurance Report",
        "",
        f"- Service: **{data.get('service', 'unknown')}**",
        f"- Timestamp: **{data.get('timestamp', 'unknown')}**",
        f"- Recommendation: **{decision}**",
        "",
        "## Plain-Language Summary (Stakeholders)",
        "",
        f"- {plain_summary}",
        "",
        "## Risk Context",
        "",
        f"- Risk score: **{risk_context.get('risk_score', 'n/a')}**",
        f"- Risk tier: **{risk_context.get('risk_tier', 'n/a')}**",
        f"- Policy validation passed: **{risk_context.get('policy_validation_passed', 'n/a')}**",
    ]

    req_controls = risk_context.get("required_controls", [])
    if req_controls:
        lines.append(f"- Required controls: **{', '.join(req_controls)}**")
    missing = risk_context.get("missing_required_controls", [])
    lines.append(f"- Missing required controls: **{', '.join(missing) if missing else 'none'}**")

    lines += ["", "## Gate Evaluation", "", "### Mandatory Gates"]
    for k in MANDATORY:
        status = "PASS" if k not in mandatory_failed else "FAIL"
        lines.append(f"- {k}: {metrics.get(k)} ({status})")

    if "risk_policy_required_controls" in mandatory_failed:
        lines.append("- risk_policy_required_controls: policy validation failed (FAIL)")

    lines += ["", "### Soft Gates"]
    for k in SOFT:
        status = "PASS" if k not in soft_failed else "FAIL"
        lines.append(f"- {k}: {metrics.get(k)} ({status})")

    lines += ["", "## Notes"]
    if decision == "GO":
        lines.append("- All mandatory and soft gates passed for this risk context.")
    elif decision == "CONDITIONAL":
        lines.append("- Mandatory gates passed; soft signals need tracked follow-up.")
    else:
        lines.append("- Fix mandatory failures before release. Include risk-control remediation.")

    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(description="Generate markdown release report from JSON results")
    parser.add_argument("--input", required=True, help="Path to input JSON results")
    parser.add_argument("--output", required=True, help="Path to output markdown report")
    args = parser.parse_args()

    data = json.loads(Path(args.input).read_text())
    report = render(data)

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(report)
    print(f"Report written to {out_path}")


if __name__ == "__main__":
    main()
