#!/usr/bin/env python3
import argparse
import subprocess
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Export resilience trend/scorecard artifacts")
    parser.add_argument("--output-json", default="artifacts/latest/resilience-scorecard.json")
    parser.add_argument("--output-md", default="artifacts/latest/resilience-scorecard.md")
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    cmd = [
        "python3",
        str(root / "scripts" / "resilience-scorecard.py"),
        "--output-json",
        args.output_json,
        "--output-md",
        args.output_md,
    ]
    res = subprocess.run(cmd, cwd=str(root), check=False)
    raise SystemExit(res.returncode)


if __name__ == "__main__":
    main()
