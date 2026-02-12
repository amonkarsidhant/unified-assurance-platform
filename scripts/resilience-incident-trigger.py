#!/usr/bin/env python3
import argparse
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

CATEGORY_MAP = {
    "network": {"mode": "CHAOS", "scenario": "network-partition-api", "run_mode": "targeted-chaos"},
    "db": {"mode": "CHAOS", "scenario": "db-failover-latency", "run_mode": "targeted-chaos"},
    "app": {"mode": "ROBUSTNESS", "scenario": "robustness-fixed", "run_mode": "targeted-robustness"},
    "queue": {"mode": "CHAOS", "scenario": "queue-backpressure-worker", "run_mode": "targeted-chaos"},
}


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def safe_slug(raw: str, fallback: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9._-]", "-", (raw or "").strip())
    cleaned = re.sub(r"-+", "-", cleaned).strip("-._")
    return cleaned[:80] or fallback


def load_json(path: Path) -> Dict[str, Any]:
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid JSON payload: {exc}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Trigger resilience intelligence from incident payload")
    parser.add_argument("--payload", required=True, help="Path to incident payload JSON")
    parser.add_argument("--source", default="incident-system", help="Trigger source label")
    parser.add_argument("--timeout-seconds", type=int, default=180, help="Timeout for resilience run")
    parser.add_argument("--output-root", default="artifacts/latest/incident-runs", help="Root directory for incident run artifacts")
    args = parser.parse_args()

    payload_path = Path(args.payload).resolve()
    if not payload_path.exists():
        raise SystemExit(f"Payload not found: {payload_path}")

    payload = load_json(payload_path)
    service = safe_slug(str(payload.get("service", "sample-service")), "sample-service")
    environment = safe_slug(str(payload.get("environment", "dev")), "dev")
    category = str(payload.get("symptom_category", "app")).strip().lower()
    severity = str(payload.get("severity", "medium")).strip().lower()
    incident_id = safe_slug(str(payload.get("incident_id", f"incident-{int(datetime.now().timestamp())}")), "incident")

    mapping = CATEGORY_MAP.get(category)
    if not mapping:
        supported = ", ".join(sorted(CATEGORY_MAP.keys()))
        raise SystemExit(f"Unsupported symptom_category '{category}'. Supported: {supported}")

    run_tier = "high" if severity in {"high", "critical", "sev1", "sev2"} else "medium"
    run_dir = Path(args.output_root).resolve() / service / environment / incident_id
    run_dir.mkdir(parents=True, exist_ok=True)

    trigger_decision = {
        "timestamp": now_iso(),
        "trigger_source": args.source,
        "incident": {
            "incident_id": incident_id,
            "service": service,
            "environment": environment,
            "symptom_category": category,
            "severity": severity,
        },
        "decision": {
            "selected_mode": mapping["mode"],
            "selected_scenario": mapping["scenario"],
            "selected_run_mode": mapping["run_mode"],
            "selected_risk_tier": run_tier,
            "rationale": [
                f"category={category} maps to scenario={mapping['scenario']}",
                f"severity={severity} maps to tier={run_tier}",
                "phase3 incident-triggered targeted run",
            ],
        },
        "payload_path": str(payload_path),
        "artifact_dir": str(run_dir),
    }
    (run_dir / "incident-trigger-decision.json").write_text(json.dumps(trigger_decision, indent=2) + "\n")

    root = Path(__file__).resolve().parents[1]
    cmd = [str(root / "scripts" / "run-resilience-intelligence.sh")]
    # explicit env map to avoid shell interpolation risks
    import os
    env = os.environ.copy()
    env.update(
        {
            "ART_DIR": str(run_dir),
            "RESILIENCE_INTELLIGENCE_MODE": mapping["mode"],
            "RESILIENCE_INTELLIGENCE_SCENARIO": mapping["scenario"],
            "SERVICE_NAME": service,
            "TARGET_ENV": environment,
            "RISK_TIER": run_tier,
            "TRIGGER_SOURCE": args.source,
            "TRIGGER_DECISION_PATH": str(run_dir / "incident-trigger-decision.json"),
        }
    )

    try:
        result = subprocess.run(cmd, cwd=str(root), env=env, timeout=max(30, args.timeout_seconds), check=False)
    except subprocess.TimeoutExpired:
        status_doc = {
            "timestamp": now_iso(),
            "status": "fail",
            "reason": f"timeout after {args.timeout_seconds}s",
            "artifact_dir": str(run_dir),
        }
        (run_dir / "incident-trigger-result.json").write_text(json.dumps(status_doc, indent=2) + "\n")
        raise SystemExit(1)

    summary_path = run_dir / "resilience-intelligence.json"
    summary = {}
    if summary_path.exists():
        try:
            summary = json.loads(summary_path.read_text())
        except Exception:
            summary = {}

    result_doc = {
        "timestamp": now_iso(),
        "status": "pass" if result.returncode == 0 else "fail",
        "exit_code": result.returncode,
        "artifact_dir": str(run_dir),
        "resilience_summary": {
            "status": summary.get("status", "unknown"),
            "score": summary.get("score", 0),
            "correlation": (summary.get("correlation") or {}).get("score", 0),
        },
    }
    (run_dir / "incident-trigger-result.json").write_text(json.dumps(result_doc, indent=2) + "\n")

    print(json.dumps(result_doc, indent=2))
    if result.returncode != 0:
        raise SystemExit(result.returncode)


if __name__ == "__main__":
    main()
