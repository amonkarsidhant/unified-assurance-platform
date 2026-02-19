# UAP Hello World - 5 Minute Quick Start

> Get up and running with UAP in 5 minutes

## Prerequisites

- [ ] GitHub account
- [ ] Repository with GitHub Actions enabled
- [ ] (Optional) Docker for local testing

## Step 1: Clone the Platform

```bash
git clone https://github.com/amonkarsidhant/unified-assurance-platform.git
cd unified-assurance-platform
```

## Step 2: Run Your First Assurance

```bash
make demo-happy
```

This runs a sample assurance check and generates a report.

**Expected output:**
```
Report written to artifacts/latest/demo-happy-report.md
Happy demo report: artifacts/latest/demo-happy-report.md
```

## Step 3: View the Report

Open `artifacts/latest/demo-happy-report.md` to see:
- ✅ Recommendation: **GO**
- Gate pass/fail matrix
- Risk assessment

## Step 4: Try a Failing Scenario

```bash
make demo-broken
```

**Expected output:**
- Recommendation: **NO-GO**
- Shows which gates failed

## Step 5: Check Your Setup

```bash
make validate
```

This validates your environment is ready for UAP.

---

## What's Next?

| Task | Command |
|------|---------|
| Run full assurance | `make run-assurance` |
| Check quality gates | `make quality-gates` |
| View metrics | `make metrics-sli` |
| Check status | `make help` |

## Understanding UAP

- **Assurance**: Automated quality checks before release
- **Gates**: Pass/fail thresholds for different controls
- **Promotion**: Moving code between environments

## Need Help?

- Docs: `docs/README.md`
- Troubleshooting: `docs/getting-started/troubleshooting.md`
- Issues: File on GitHub

---

**Congratulations!** You've run UAP. 🎉
