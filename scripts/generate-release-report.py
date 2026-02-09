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


def evaluate(metrics):
    mandatory_failed = [k for k, check in MANDATORY.items() if not check(metrics.get(k, float("inf")))]
    soft_failed = [k for k, check in SOFT.items() if not check(metrics.get(k, float("inf")))]
    if mandatory_failed:
        decision = "NO-GO"
    elif soft_failed:
        decision = "CONDITIONAL"
    else:
        decision = "GO"
    return decision, mandatory_failed, soft_failed


def render(data):
    metrics = data.get("metrics", {})
    decision, mandatory_failed, soft_failed = evaluate(metrics)

    if decision == "GO":
        plain_summary = (
            "Release is ready. All mandatory and soft quality gates passed, "
            "so risk is currently within acceptable policy thresholds."
        )
    elif decision == "CONDITIONAL":
        plain_summary = (
            "Release can proceed with caution. Mandatory gates passed, but some "
            "non-blocking quality signals need follow-up and documented ownership."
        )
    else:
        plain_summary = (
            "Release is not ready. One or more mandatory gates failed, which means "
            "there is elevated customer or operational risk if shipped now."
        )

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
        "## Gate Evaluation",
        "",
        "### Mandatory Gates",
    ]
    for k in MANDATORY:
        status = "PASS" if k not in mandatory_failed else "FAIL"
        lines.append(f"- {k}: {metrics.get(k)} ({status})")
    lines += ["", "### Soft Gates"]
    for k in SOFT:
        status = "PASS" if k not in soft_failed else "FAIL"
        lines.append(f"- {k}: {metrics.get(k)} ({status})")

    lines += ["", "## Notes"]
    if decision == "GO":
        lines.append("- All mandatory and soft gates passed.")
    elif decision == "CONDITIONAL":
        lines.append("- Mandatory gates passed; some soft gates failed. Proceed with documented exceptions.")
    else:
        lines.append("- One or more mandatory gates failed. Fix before release.")

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
