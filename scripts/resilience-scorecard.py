#!/usr/bin/env python3
import argparse
import json
import logging
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


def read_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text())
    except (json.JSONDecodeError, OSError) as e:
        logger.warning("Failed to parse JSON from %s: %s", path, e, exc_info=True)
        return {}


def parse_ts(value: str) -> datetime:
    try:
        dt = datetime.fromisoformat((value or "").replace("Z", "+00:00"))
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt
    except (ValueError, TypeError):
        return datetime.min.replace(tzinfo=timezone.utc)


def safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def run_identity(data: dict[str, Any]) -> str:
    context = data.get("run_context") or {}
    trigger = data.get("trigger") or {}
    selected = data.get("selected") or {}

    # Prefer a stable logical identity over file path so copied snapshots
    # (latest + history + incident-runs) are counted once.
    identity = {
        "timestamp": data.get("timestamp"),
        "service": context.get("service") or data.get("service") or "unknown-service",
        "environment": context.get("environment") or "unknown",
        "tier": context.get("tier") or "unknown",
        "mode": data.get("mode") or "unknown",
        "scenario": data.get("scenario") or "unknown",
        "seed": data.get("seed"),
        "selected": {
            "vus": selected.get("vus"),
            "duration": selected.get("duration"),
            "fault_profile": selected.get("fault_profile"),
        },
        "trigger": {
            "source": trigger.get("source"),
            "decision_artifact": trigger.get("decision_artifact"),
        },
    }
    return json.dumps(identity, sort_keys=True, separators=(",", ":"))


def source_rank(path: Path) -> int:
    p = path.as_posix()
    if not p.startswith("/"):
        p = "/" + p
    if "/artifacts/history/" in p:
        return 0
    if "/artifacts/latest/incident-runs/" in p:
        return 1
    if "/artifacts/latest/" in p:
        return 2
    return 3


def collect_artifacts(paths: list[Path]) -> list[tuple[Path, dict[str, Any]]]:
    found: list[tuple[Path, dict[str, Any]]] = []
    for p in paths:
        if p.is_file() and p.name == "resilience-intelligence.json":
            d = read_json(p)
            if d:
                found.append((p, d))
            continue
        if p.is_dir():
            for f in p.rglob("resilience-intelligence.json"):
                d = read_json(f)
                if d:
                    found.append((f, d))

    dedup: dict[str, tuple[Path, dict[str, Any]]] = {}
    for fp, data in found:
        key = run_identity(data)
        current = dedup.get(key)
        if current is None:
            dedup[key] = (fp, data)
            continue
        # Prefer canonical archived copies when duplicates exist.
        if source_rank(fp) < source_rank(current[0]):
            dedup[key] = (fp, data)
    return list(dedup.values())


def main() -> None:
    parser = argparse.ArgumentParser(description="Build multi-service resilience scorecards and trends from artifacts")
    parser.add_argument("--input", action="append", default=None, help="File/dir inputs to scan")
    parser.add_argument("--output-json", default="artifacts/latest/resilience-scorecard.json")
    parser.add_argument("--output-md", default="artifacts/latest/resilience-scorecard.md")
    args = parser.parse_args()

    input_paths = args.input if args.input is not None else ["artifacts/latest", "artifacts/history", "artifacts/latest/incident-runs"]
    artifacts = collect_artifacts([Path(p) for p in input_paths])
    by_service: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for file_path, item in artifacts:
        context = item.get("run_context") or {}
        service = str(context.get("service") or item.get("service") or "unknown-service")
        environment = str(context.get("environment") or "unknown")
        tier = str(context.get("tier") or "unknown")
        status = str(item.get("status", "unknown"))
        score = safe_float(item.get("score", 0), 0.0)
        corr = safe_float((item.get("correlation") or {}).get("score", 0), 0.0)
        adapter_count = safe_int((item.get("adapters") or {}).get("count", 0), 0)
        ts = str(item.get("timestamp") or "")
        by_service[service].append(
            {
                "timestamp": ts,
                "status": status,
                "score": score,
                "correlation": corr,
                "adapter_count": adapter_count,
                "environment": environment,
                "tier": tier,
                "artifact": str(file_path),
            }
        )

    services_summary: list[dict[str, Any]] = []
    for service, runs in sorted(by_service.items()):
        runs_sorted = sorted(runs, key=lambda r: parse_ts(r["timestamp"]))
        status_counts = {"pass": 0, "fail": 0, "skipped": 0, "other": 0}
        env_tier_counts: dict[str, int] = defaultdict(int)
        for r in runs_sorted:
            if r["status"] in status_counts:
                status_counts[r["status"]] += 1
            else:
                status_counts["other"] += 1
            env_tier_counts[f"{r['environment']}::{r['tier']}"] += 1

        score_trend = [round(r["score"], 3) for r in runs_sorted]
        corr_trend = [round(r["correlation"], 3) for r in runs_sorted]
        adapter_avg = round(sum(r["adapter_count"] for r in runs_sorted) / max(1, len(runs_sorted)), 3)
        latest = runs_sorted[-1] if runs_sorted else {}
        services_summary.append(
            {
                "service": service,
                "runs_total": len(runs_sorted),
                "latest": latest,
                "score_trend": score_trend,
                "correlation_trend": corr_trend,
                "adapter_participation_avg": adapter_avg,
                "status_counts": status_counts,
                "environment_tier_counts": dict(sorted(env_tier_counts.items())),
            }
        )

    out = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "artifacts_scanned": len(artifacts),
        "services": services_summary,
    }

    output_json = Path(args.output_json)
    output_json.parent.mkdir(parents=True, exist_ok=True)
    output_json.write_text(json.dumps(out, indent=2) + "\n")

    lines = [
        "# Resilience Intelligence Phase 3 Scorecard",
        "",
        f"- Generated at: **{out['generated_at']}**",
        f"- Artifacts scanned: **{out['artifacts_scanned']}**",
        "",
        "## Service Summary",
        "",
    ]
    if not services_summary:
        lines.append("No resilience artifacts found.")
    for s in services_summary:
        latest = s.get("latest") or {}
        lines += [
            f"### {s['service']}",
            f"- Runs total: **{s['runs_total']}**",
            f"- Latest status/score: **{latest.get('status', 'n/a')} / {latest.get('score', 'n/a')}**",
            f"- Score trend: `{s['score_trend']}`",
            f"- Correlation trend: `{s['correlation_trend']}`",
            f"- Adapter participation avg: **{s['adapter_participation_avg']}**",
            f"- Pass/Fail/Skip: pass={s['status_counts']['pass']} fail={s['status_counts']['fail']} skipped={s['status_counts']['skipped']}",
            "",
        ]

    output_md = Path(args.output_md)
    output_md.parent.mkdir(parents=True, exist_ok=True)
    output_md.write_text("\n".join(lines) + "\n")

    print(f"Wrote {output_json}")
    print(f"Wrote {output_md}")


if __name__ == "__main__":
    main()
