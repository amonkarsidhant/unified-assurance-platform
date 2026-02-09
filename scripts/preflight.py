#!/usr/bin/env python3
import argparse
import fnmatch
import json
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts" / "latest"
PROFILES = ROOT / "config" / "module-profiles"


def run_check(name: str, command: str):
    start = time.time()
    proc = subprocess.run(command, shell=True, cwd=ROOT, capture_output=True, text=True)
    duration = round(time.time() - start, 2)
    log_file = ART / f"preflight-{name.replace(' ', '-').replace('/', '-')}.log"
    log_file.write_text((proc.stdout or "") + ("\n" if proc.stderr else "") + (proc.stderr or ""))
    return {
        "name": name,
        "command": command,
        "status": "pass" if proc.returncode == 0 else "fail",
        "exit_code": proc.returncode,
        "duration_sec": duration,
        "log": str(log_file.relative_to(ROOT)),
    }


def load_profile(module_type: str):
    profile_path = PROFILES / f"{module_type}.json"
    if not profile_path.exists():
        raise SystemExit(f"Unknown module type profile: {profile_path}")
    return json.loads(profile_path.read_text()), profile_path


def should_escalate(profile, minimal_results, risk_tier, changed_files):
    escalation = profile.get("escalation", {})
    if any(r["status"] != "pass" for r in minimal_results):
        return True, "minimal-check-failure"
    if risk_tier in escalation.get("risk_tiers", []):
        return True, f"risk-tier:{risk_tier}"
    patterns = escalation.get("changed_file_patterns", [])
    if patterns and changed_files:
        for f in changed_files:
            if any(fnmatch.fnmatch(f, p) for p in patterns):
                return True, f"changed-files:{f}"
    return False, "none"


def render_md(summary):
    lines = [
        "# Preflight Summary",
        "",
        f"- Module: **{summary['module']}**",
        f"- Type: **{summary['module_type']}**",
        f"- Risk tier: **{summary['risk_tier']}**",
        f"- Escalated: **{summary['escalated']}** ({summary['escalation_reason']})",
        f"- Overall: **{summary['overall_status'].upper()}**",
        "",
        "## Checks",
        "",
    ]
    for c in summary["checks"]:
        lines.append(f"- {c['name']}: **{c['status']}** (`{c['command']}`) → `{c['log']}`")
    lines += ["", "## Owners", ""]
    for o in summary.get("owners", []):
        lines.append(f"- {o}")
    return "\n".join(lines) + "\n"


def main():
    ap = argparse.ArgumentParser(description="Phase 3 DX preflight entrypoint")
    ap.add_argument("--module", required=True)
    ap.add_argument("--type", required=True, choices=["api", "frontend", "worker", "shared-lib"])
    ap.add_argument("--changed-files", default="", help="Comma separated list")
    ap.add_argument("--risk-tier", default="")
    args = ap.parse_args()

    ART.mkdir(parents=True, exist_ok=True)
    profile, profile_path = load_profile(args.type)

    risk_tier = args.risk_tier or profile.get("default_risk_tier", "medium")
    changed_files = [x.strip() for x in args.changed_files.split(",") if x.strip()]

    checks = []
    for item in profile.get("minimal_checks", []):
        checks.append(run_check(item["name"], item["command"]))

    escalated, reason = should_escalate(profile, checks, risk_tier, changed_files)
    if escalated:
        for item in profile.get("escalation", {}).get("checks", []):
            checks.append(run_check(item["name"], item["command"]))

    overall = "pass" if all(c["status"] == "pass" for c in checks) else "fail"
    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "module": args.module,
        "module_type": args.type,
        "profile": str(profile_path.relative_to(ROOT)),
        "risk_tier": risk_tier,
        "changed_files": changed_files,
        "target_runtime_minutes": profile.get("target_runtime_minutes", 10),
        "owners": profile.get("owners", []),
        "escalated": escalated,
        "escalation_reason": reason,
        "checks": checks,
        "overall_status": overall,
    }

    (ART / "preflight-summary.json").write_text(json.dumps(summary, indent=2))
    (ART / "preflight-summary.md").write_text(render_md(summary))
    print("Wrote artifacts/latest/preflight-summary.json")
    print("Wrote artifacts/latest/preflight-summary.md")
    if overall != "pass":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
