#!/usr/bin/env python3
import argparse
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts" / "latest"
OUT_DIR = ROOT / "config" / "exceptions" / "requests"


def main():
    ap = argparse.ArgumentParser(description="Generate exception request draft")
    ap.add_argument("--control", required=True)
    ap.add_argument("--reason", required=True)
    ap.add_argument("--expiry-days", type=int, default=7)
    args = ap.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    now = datetime.now(timezone.utc)
    exp = now + timedelta(days=max(1, args.expiry_days))

    results = json.loads((ART / "results.json").read_text()) if (ART / "results.json").exists() else {}
    preflight = json.loads((ART / "preflight-summary.json").read_text()) if (ART / "preflight-summary.json").exists() else {}

    req_id = f"EXC-REQ-{now.strftime('%Y%m%d-%H%M%S')}"
    out = OUT_DIR / f"{req_id}.yaml"
    body = f"""exceptions:
  - id: \"{req_id}\"
    service: \"{results.get('service', preflight.get('module', 'sample-service'))}\"
    environment: \"stage\"
    tier: \"{results.get('risk_context', {}).get('risk_tier', preflight.get('risk_tier', 'medium'))}\"
    control: \"{args.control}\"
    reason: \"{args.reason}\"
    approver: \"<security-or-platform-approver>\"
    approved_at: \"{now.isoformat().replace('+00:00', 'Z')}\"
    expires_at: \"{exp.isoformat().replace('+00:00', 'Z')}\"
    ticket: \"<JIRA-123>\"
    context:
      preflight_summary: \"artifacts/latest/preflight-summary.json\"
      results: \"artifacts/latest/results.json\"
      promotion_decision: \"artifacts/latest/promotion-decision.json\"
"""
    out.write_text(body)
    print(f"Wrote {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
