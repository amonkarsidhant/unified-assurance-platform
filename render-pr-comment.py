#!/usr/bin/env python3
import argparse
import json
from pathlib import Path


def load(path: str):
    p = Path(path)
    return json.loads(p.read_text()) if p.exists() else {}


def main():
    parser = argparse.ArgumentParser(description="Render PR assurance markdown summary")
    parser.add_argument("--results", default="artifacts/latest/results.json")
    parser.add_argument("--promotion", default="artifacts/latest/promotion-decision.json")
    parser.add_argument("--flaky", default="artifacts/latest/flaky-policy.json")
    parser.add_argument("--output", default="artifacts/latest/pr-comment.md")
    parser.add_argument("--artifact-base-url", default="")
    args = parser.parse_args()

    results = load(args.results)
    promotion = load(args.promotion)
    flaky = load(args.flaky)

    risk = results.get("risk_context", {})
    tests = results.get("tests", {})
    failed_tests = [k for k, v in tests.items() if v == "fail"]
    failed_controls = [c for c, s in risk.get("control_status", {}).items() if s != "pass"]

    artifact_prefix = args.artifact_base_url.rstrip("/")
    def link(path: str):
        if not artifact_prefix:
            return f"`{path}`"
        return f"[{path}]({artifact_prefix}/{path})"

    lines = [
        "## 🛡️ UAP Assurance Summary",
        "",
        f"- Service: **{results.get('service', 'unknown')}**",
        f"- Recommendation: **{'GO' if promotion.get('passed') else 'NO-GO'}**",
        f"- Risk tier: **{risk.get('risk_tier', 'n/a')}**",
        f"- Test pass rate: **{results.get('metrics', {}).get('test_pass_rate', 'n/a')}**",
        "",
        "### Failed controls",
    ]
    if failed_controls:
        lines.extend([f"- `{c}`" for c in failed_controls])
    else:
        lines.append("- None")

    lines += ["", "### Failed test checks"]
    if failed_tests:
        lines.extend([f"- `{t}`" for t in failed_tests])
    else:
        lines.append("- None")

    lines += ["", "### Promotion gate failures"]
    for f in promotion.get("failures", []) or ["None"]:
        lines.append(f"- {f}")

    lines += ["", "### Flaky policy"]
    if flaky:
        lines.append(f"- Allowed: **{flaky.get('allowed')}** (flaky_count={flaky.get('flaky_count', 0)})")
        for reason in flaky.get("reasons", []):
            lines.append(f"- {reason}")
    else:
        lines.append("- Not evaluated")

    lines += [
        "",
        "### Artifacts",
        f"- Results: {link('artifacts/latest/results.json')}",
        f"- Results v2: {link('artifacts/latest/results.v2.json')}",
        f"- Promotion decision: {link('artifacts/latest/promotion-decision.json')}",
        f"- Release report: {link('artifacts/latest/release-report.md')}",
    ]

    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(lines) + "\n")
    print(f"Wrote PR comment preview: {out}")


if __name__ == "__main__":
    main()
