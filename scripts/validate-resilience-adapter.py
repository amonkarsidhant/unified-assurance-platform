#!/usr/bin/env python3
import argparse
import json
import sys
from pathlib import Path

ALLOWED_STATUS = {"pass", "fail", "skipped"}
ALLOWED_SIGNALS = {"load", "resilience", "external"}


def fail(msg: str) -> None:
    print(msg, file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate resilience adapter payload")
    parser.add_argument("--input", required=True, help="Path to adapter JSON payload")
    args = parser.parse_args()

    path = Path(args.input)
    if not path.exists():
        fail(f"adapter payload not found: {path}")

    try:
        data = json.loads(path.read_text())
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in {path}: {exc}")

    if not isinstance(data, dict):
        fail("adapter payload must be a JSON object")

    required = ["adapter", "signal", "status", "reason", "metrics", "metadata"]
    missing = [k for k in required if k not in data]
    if missing:
        fail(f"missing required fields: {missing}")

    if not isinstance(data["adapter"], str) or not data["adapter"].strip():
        fail("adapter must be a non-empty string")

    signal = str(data["signal"]).strip().lower()
    if signal not in ALLOWED_SIGNALS:
        fail(f"signal must be one of {sorted(ALLOWED_SIGNALS)}")

    status = str(data["status"]).strip().lower()
    if status not in ALLOWED_STATUS:
        fail(f"status must be one of {sorted(ALLOWED_STATUS)}")

    if not isinstance(data["reason"], str):
        fail("reason must be a string")

    if not isinstance(data["metrics"], dict):
        fail("metrics must be an object")

    for key in ["error_rate", "pass_rate", "degradation"]:
        if key in data["metrics"] and data["metrics"][key] is not None:
            try:
                float(data["metrics"][key])
            except (TypeError, ValueError):
                fail(f"metrics.{key} must be numeric when provided")

    if not isinstance(data["metadata"], dict):
        fail("metadata must be an object")

    print(f"ok: {path}")


if __name__ == "__main__":
    main()
