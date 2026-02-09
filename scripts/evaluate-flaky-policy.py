#!/usr/bin/env python3
import argparse
import json
from pathlib import Path


def classify(history: list, policy: dict):
    window = int(policy.get("window_runs", 10))
    min_obs = int(policy.get("min_observations", 3))
    threshold = float(policy.get("flaky_rate_threshold", 0.2))

    history = history[-window:]
    per_test = {}
    for run in history:
        for test_name, status in run.get("tests", {}).items():
            per_test.setdefault(test_name, []).append(status)

    flaky = []
    for test_name, statuses in sorted(per_test.items()):
        if len(statuses) < min_obs:
            continue
        pass_count = sum(1 for s in statuses if s == "pass")
        fail_count = sum(1 for s in statuses if s == "fail")
        if pass_count == 0 or fail_count == 0:
            continue
        flaky_rate = fail_count / len(statuses)
        if flaky_rate >= threshold:
            flaky.append({
                "test": test_name,
                "observations": len(statuses),
                "pass_count": pass_count,
                "fail_count": fail_count,
                "flaky_rate": round(flaky_rate, 4),
            })

    return history, flaky


def main():
    parser = argparse.ArgumentParser(description="Evaluate flaky test policy from historical run artifacts")
    parser.add_argument("--policy", default="config/flaky-policy.json")
    parser.add_argument("--history")
    parser.add_argument("--results", default="artifacts/latest/results.json")
    parser.add_argument("--output", default="artifacts/latest/flaky-policy.json")
    parser.add_argument("--strict", action="store_true", help="Fail when policy is violated")
    args = parser.parse_args()

    policy = json.loads(Path(args.policy).read_text())
    history_path = Path(args.history or policy.get("history_file", "artifacts/history/test-history.json"))

    history = []
    if history_path.exists():
        history = json.loads(history_path.read_text())

    if Path(args.results).exists():
        current = json.loads(Path(args.results).read_text())
        history.append({"timestamp": current.get("timestamp"), "tests": current.get("tests", {})})

    sampled, flaky = classify(history, policy)
    max_flaky = int(policy.get("max_flaky_tests", 3))
    missing_history = len(sampled) == 0
    fail_closed_missing = bool(policy.get("fail_closed_if_missing_history", False))

    allowed = (len(flaky) <= max_flaky) and not (missing_history and fail_closed_missing)
    result = {
        "evaluated": True,
        "policy": policy,
        "history_path": str(history_path),
        "sampled_runs": len(sampled),
        "flaky_tests": flaky,
        "flaky_count": len(flaky),
        "max_flaky_tests": max_flaky,
        "missing_history": missing_history,
        "allowed": allowed,
        "reasons": [] if allowed else [
            *( ["missing history and fail_closed_if_missing_history=true"] if (missing_history and fail_closed_missing) else []),
            *( [f"flaky_count {len(flaky)} > max_flaky_tests {max_flaky}"] if len(flaky) > max_flaky else []),
        ],
    }

    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, indent=2))
    print(f"Wrote flaky policy result: {out}")

    if args.strict and not allowed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
