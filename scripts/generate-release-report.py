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


def render(data, promotion):
    metrics = data.get("metrics", {})
    risk_context = data.get("risk_context", {})
    decision, mandatory_failed, soft_failed = evaluate(metrics, risk_context)

    lines = [
        "# Release Assurance Report",
        "",
        f"- Service: **{data.get('service', 'unknown')}**",
        f"- Timestamp: **{data.get('timestamp', 'unknown')}**",
        f"- Recommendation: **{decision}**",
        "",
        "## Risk Context",
        "",
        f"- Risk score: **{risk_context.get('risk_score', 'n/a')}**",
        f"- Risk tier: **{risk_context.get('risk_tier', 'n/a')}**",
        f"- Policy validation passed: **{risk_context.get('policy_validation_passed', 'n/a')}**",
        f"- Required controls by tier: **{', '.join(risk_context.get('required_controls', [])) or 'n/a'}**",
        "",
        "## Control Pass/Fail Matrix",
        "",
    ]

    control_status = risk_context.get("control_status", {})
    for control in risk_context.get("required_controls", []):
        lines.append(f"- {control}: **{control_status.get(control, 'missing')}**")

    lines += ["", "## Gate Evaluation", "", "### Mandatory Gates"]
    for k in MANDATORY:
        status = "PASS" if k not in mandatory_failed else "FAIL"
        lines.append(f"- {k}: {metrics.get(k)} ({status})")

    lines += ["", "### Soft Gates"]
    for k in SOFT:
        status = "PASS" if k not in soft_failed else "FAIL"
        lines.append(f"- {k}: {metrics.get(k)} ({status})")

    lines += ["", "## Promotion & Exceptions", ""]
    if promotion:
        lines.append(f"- Promotion passed: **{promotion.get('passed')}**")
        lines.append(f"- Compliance trace summary: **{promotion.get('compliance_trace', 'docs/compliance/control-traceability.md')}**")
        if promotion.get("exceptions_used"):
            lines.append("- Exceptions used:")
            for exc in promotion.get("exceptions_used", []):
                lines.append(
                    f"  - {exc.get('id')}: control={exc.get('control')}, approver={exc.get('approver')}, expires={exc.get('expires_at')}"
                )
        else:
            lines.append("- Exceptions used: none")
        if promotion.get("failures"):
            lines.append("- Promotion failures:")
            for f in promotion.get("failures", []):
                lines.append(f"  - {f}")
    else:
        lines.append("- Promotion decision file not provided.")

    lines += ["", "## Compliance Traceability", "", "- Mapping file: `docs/compliance/control-traceability.md`", "- Ownership file: `config/control-ownership.json`"]
    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(description="Generate markdown release report from JSON results")
    parser.add_argument("--input", required=True, help="Path to input JSON results")
    parser.add_argument("--output", required=True, help="Path to output markdown report")
    parser.add_argument("--promotion", default="artifacts/latest/promotion-decision.json", help="Optional promotion decision JSON")
    args = parser.parse_args()

    data = json.loads(Path(args.input).read_text())
    promotion = None
    p = Path(args.promotion)
    if p.exists():
        promotion = json.loads(p.read_text())

    report = render(data, promotion)
    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(report)
    print(f"Report written to {out_path}")


if __name__ == "__main__":
    main()
