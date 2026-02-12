#!/usr/bin/env python3
import argparse
import json
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate resilience intelligence markdown report")
    parser.add_argument("--input", default="artifacts/latest/resilience-intelligence.json")
    parser.add_argument("--output", default="artifacts/latest/resilience-intelligence-report.md")
    args = parser.parse_args()

    src = Path(args.input)
    if not src.exists():
        raise SystemExit(f"missing input: {src}")

    data = json.loads(src.read_text())
    corr = data.get("correlation", {})
    adapters = data.get("adapters", {})

    lines = [
        "# Resilience Intelligence Report",
        "",
        f"- Timestamp: **{data.get('timestamp', 'unknown')}**",
        f"- Mode: **{data.get('mode', 'unknown')}**",
        f"- Selected scenario: **{data.get('scenario', 'unknown')}**",
        f"- Overall status: **{data.get('status', 'unknown')}**",
        f"- Score: **{data.get('score', 'n/a')}**",
        "",
        "## Correlation",
        "",
        f"- Correlation status: **{corr.get('status', 'unknown')}**",
        f"- Correlation score: **{corr.get('score', 'n/a')}**",
        f"- Load degradation: **{corr.get('load_degradation', 'n/a')}**",
        f"- Notes: {corr.get('explanation', 'n/a')}",
        "",
        "## Signal Outcomes",
        "",
        f"- Load: **{data.get('load', {}).get('status', 'unknown')}** ({data.get('load', {}).get('reason', 'n/a')})",
        f"- Chaos: **{data.get('chaos', {}).get('status', 'unknown')}** ({data.get('chaos', {}).get('reason', 'n/a')})",
        "",
        "## Adapter Inputs",
        "",
        f"- Adapter count: **{adapters.get('count', 0)}**",
    ]

    for item in adapters.get("items", []) or []:
        lines.append(
            f"- {item.get('adapter', 'unknown')}: status={item.get('status', 'unknown')}, signal={item.get('signal', 'unknown')}, reason={item.get('reason', 'n/a')}"
        )

    fail_reasons = []
    if data.get("load", {}).get("status") == "fail":
        fail_reasons.append(f"load: {data.get('load', {}).get('reason', 'unknown')}")
    if data.get("chaos", {}).get("status") == "fail":
        fail_reasons.append(f"chaos: {data.get('chaos', {}).get('reason', 'unknown')}")

    lines += ["", "## Pass/Fail Reasons", ""]
    if fail_reasons:
        for reason in fail_reasons:
            lines.append(f"- {reason}")
    else:
        lines.append("- No hard failures recorded.")

    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(lines) + "\n")
    print(f"Resilience report written to {out}")


if __name__ == "__main__":
    main()
