#!/usr/bin/env python3
"""Capture DevEx baseline metrics for recent merged PRs.

Metrics:
- pr_cycle_time_hours: PR opened -> merged
- ttfg_hours: first commit on PR -> first successful required-check run completion (best effort)
- failure_to_fix_hours: first failed run -> next successful run completion on same PR branch (best effort)
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import statistics
import subprocess
from pathlib import Path
from typing import Any


def gh_api(path: str) -> Any:
    out = subprocess.check_output(["gh", "api", path], text=True)
    return json.loads(out)


def parse_iso(ts: str | None) -> dt.datetime | None:
    if not ts:
        return None
    return dt.datetime.fromisoformat(ts.replace("Z", "+00:00"))


def percentile(values: list[float], p: float) -> float | None:
    if not values:
        return None
    vals = sorted(values)
    k = (len(vals) - 1) * p
    f = int(k)
    c = min(f + 1, len(vals) - 1)
    if f == c:
        return vals[f]
    return vals[f] + (vals[c] - vals[f]) * (k - f)


def first_commit_time(repo: str, pr_number: int) -> dt.datetime | None:
    commits = gh_api(f"repos/{repo}/pulls/{pr_number}/commits")
    if not commits:
        return None
    first = commits[0]
    return parse_iso(first.get("commit", {}).get("author", {}).get("date"))


def runs_for_branch(repo: str, branch: str, limit: int = 50) -> list[dict[str, Any]]:
    payload = gh_api(f"repos/{repo}/actions/runs?branch={branch}&per_page={limit}")
    return payload.get("workflow_runs", [])


def summarize(repo: str, prs: list[dict[str, Any]]) -> dict[str, Any]:
    cycle_vals: list[float] = []
    ttfg_vals: list[float] = []
    f2f_vals: list[float] = []

    details = []
    for pr in prs:
        num = pr["number"]
        opened = parse_iso(pr.get("created_at"))
        merged = parse_iso(pr.get("merged_at"))
        head_ref = pr.get("head", {}).get("ref")

        if opened and merged:
            cycle_vals.append((merged - opened).total_seconds() / 3600)

        first_commit = first_commit_time(repo, num)
        runs = runs_for_branch(repo, head_ref) if head_ref else []
        runs_sorted = sorted(runs, key=lambda r: r.get("created_at") or "")

        first_success = None
        first_fail = None
        next_success = None
        for r in runs_sorted:
            concl = r.get("conclusion")
            completed = parse_iso(r.get("updated_at") or r.get("run_started_at"))
            if concl == "success" and first_success is None:
                first_success = completed
            if concl == "failure" and first_fail is None:
                first_fail = completed
            if first_fail and concl == "success" and completed and completed > first_fail:
                next_success = completed
                break

        ttfg = None
        if first_commit and first_success and first_success > first_commit:
            ttfg = (first_success - first_commit).total_seconds() / 3600
            ttfg_vals.append(ttfg)

        f2f = None
        if first_fail and next_success and next_success > first_fail:
            f2f = (next_success - first_fail).total_seconds() / 3600
            f2f_vals.append(f2f)

        details.append(
            {
                "pr": num,
                "title": pr.get("title"),
                "cycle_hours": round((merged - opened).total_seconds() / 3600, 2)
                if opened and merged
                else None,
                "ttfg_hours": round(ttfg, 2) if ttfg is not None else None,
                "failure_to_fix_hours": round(f2f, 2) if f2f is not None else None,
            }
        )

    def pack(vals: list[float]) -> dict[str, Any]:
        return {
            "samples": len(vals),
            "p50_hours": round(percentile(vals, 0.5), 2) if vals else None,
            "p90_hours": round(percentile(vals, 0.9), 2) if vals else None,
            "mean_hours": round(statistics.mean(vals), 2) if vals else None,
        }

    return {
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "sample_size_prs": len(prs),
        "metrics": {
            "pr_cycle_time": pack(cycle_vals),
            "ttfg": pack(ttfg_vals),
            "failure_to_fix": pack(f2f_vals),
        },
        "details": details,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True, help="owner/repo")
    ap.add_argument("--limit", type=int, default=20, help="number of recent merged PRs")
    ap.add_argument("--out", default="artifacts/latest/devex-baseline.json")
    args = ap.parse_args()

    pulls = gh_api(f"repos/{args.repo}/pulls?state=closed&sort=updated&direction=desc&per_page={args.limit}")
    merged = [p for p in pulls if p.get("merged_at")]
    report = summarize(args.repo, merged)

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
