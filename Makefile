SHELL := /bin/bash

.PHONY: bootstrap validate run-assurance report collect-evidence

bootstrap:
	@echo "Bootstrapping local toolchain checks..."
	@command -v bash >/dev/null
	@command -v python3 >/dev/null
	@mkdir -p artifacts/latest evidence
	@echo "Bootstrap complete."

validate:
	@echo "Validating repository structure..."
	@test -f README.md
	@test -f policies/quality-gates.yaml
	@test -f policies/risk-model.yaml
	@test -f catalog/test-catalog.yaml
	@test -x scripts/run-assurance.sh
	@test -x scripts/collect-evidence.sh
	@test -x scripts/generate-release-report.py
	@echo "Validation passed."

run-assurance:
	@./scripts/run-assurance.sh

RESULTS ?= artifacts/latest/results.json
OUT ?= artifacts/latest/release-report.md

report:
	@./scripts/generate-release-report.py --input $(RESULTS) --output $(OUT)
	@echo "Report generated at $(OUT)"

collect-evidence:
	@./scripts/collect-evidence.sh
