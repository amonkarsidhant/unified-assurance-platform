SHELL := /bin/bash

.PHONY: bootstrap validate run-assurance report collect-evidence demo-up demo-down demo-happy demo-broken

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
	@test -f docs/agentic-alignment-matrix.md
	@test -f docs/enterprise-hardening-backlog.md
	@test -f docs/contribution-standard.md
	@test -f templates/self-reflection-template.md
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

demo-up:
	@if command -v docker >/dev/null 2>&1; then \
		docker compose -f demo/docker-compose.yml up -d; \
		echo "Demo services started."; \
	else \
		echo "Docker not installed. Skipping demo-up (file-based demo still works)."; \
	fi

demo-down:
	@if command -v docker >/dev/null 2>&1; then \
		docker compose -f demo/docker-compose.yml down; \
		echo "Demo services stopped."; \
	else \
		echo "Docker not installed. Nothing to stop."; \
	fi

demo-happy:
	@./scripts/generate-release-report.py --input examples/results/demo-happy.json --output artifacts/latest/demo-happy-report.md
	@echo "Happy demo report: artifacts/latest/demo-happy-report.md"

demo-broken:
	@./scripts/generate-release-report.py --input examples/results/demo-broken.json --output artifacts/latest/demo-broken-report.md
	@echo "Broken demo report: artifacts/latest/demo-broken-report.md"
