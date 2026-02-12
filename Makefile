SHELL := /bin/bash

.PHONY: all clean test bootstrap validate tooling-check run-assurance run-assurance-real resilience-intelligence resilience-intelligence-check zap-smoke phase-a-checks gitleaks-check schemathesis-check hadolint-check checkov-check chaos-check chaos-sample assurance-metrics-export assurance-metrics-export-if-ready assurance-dashboard-check assurance-governance-check report collect-evidence evidence-bundle sign-bundle validate-exceptions evaluate-flaky normalize-results-v2 render-pr-comment promotion-check module-golden-path preflight onboard onboarding-score onboarding-plan consumer-quickstart end-to-end-review explain-last-fail suggest-next-steps request-exception demo-up demo-down demo-happy demo-broken demo-site-up demo-site-down demo-e2e dev-stack-up dev-stack-down dev-stack-status

all: validate
	@echo "Default target complete. Run 'make run-assurance' for a full assurance pass."

clean:
	@rm -rf artifacts/latest/* artifacts/metrics/* evidence/bundles/* test-results .playwright .demo-site.pid .demo-site.port
	@mkdir -p artifacts/latest artifacts/metrics evidence/bundles
	@echo "Workspace artifacts cleaned."

test:
	@if [ -f package.json ] && command -v npm >/dev/null 2>&1; then \
		npm test; \
	else \
		echo "No npm test suite configured in this environment."; \
	fi

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
	@test -x scripts/validate-exceptions.py
	@test -f policies/tiers/low.json
	@test -f policies/tiers/medium.json
	@test -f policies/tiers/high.json
	@test -f policies/tiers/critical.json
	@test -f config/control-ownership.json
	@test -f config/flaky-policy.json
	@test -f schemas/results-v2.schema.json
	@test -x scripts/normalize-results-v2.py
	@test -x scripts/evaluate-flaky-policy.py
	@test -x scripts/render-pr-comment.py
	@test -x scripts/run-chaos-checks.sh
	@test -x scripts/run-resilience-intelligence.sh
	@test -f config/resilience-intelligence.json
	@test -f templates/scenarios/resilience/robustness-fixed.json
	@test -f templates/scenarios/resilience/chaos-randomized.json
	@test -x scripts/preflight.py
	@test -x scripts/onboard-service.py
	@test -x scripts/onboarding-score.py
	@test -x scripts/onboarding-plan.py
	@test -f config/onboarding-stages.json
	@test -x scripts/explain-failures.py
	@test -x scripts/suggest-next-steps.py
	@test -x scripts/request-exception.py
	@test -f config/remediation-map.yaml
	@test -f docs/compliance/control-traceability.md
	@test -f docs/chaos/experiment-contract.md
	@test -f docs/chaos/scenario-catalog.md
	@test -f templates/chaos/chaos-experiment-template.yaml
	@test -f templates/chaos/chaos-runbook-template.md
	@test -f docs/golden-paths/chaos-integration.md
	@test -f docs/resilience-intelligence-phase1.md
	@test -x scripts/run-gitleaks.sh
	@test -x scripts/run-schemathesis.sh
	@test -x scripts/run-hadolint.sh
	@test -x scripts/run-checkov.sh
	@test -f examples/openapi/sample-openapi.yaml
	@test -f examples/docker/Dockerfile.sample
	@test -d examples/iac/sample-terraform
	@echo "Validation passed."

tooling-check:
	@./scripts/tooling-check.sh

run-assurance:
	@./scripts/run-assurance.sh
	@$(MAKE) assurance-metrics-export
	@$(MAKE) evaluate-flaky
	@$(MAKE) normalize-results-v2

run-assurance-real:
	@ASSURANCE_MODE=real FORCE_REAL_TOOLS=1 ./scripts/run-assurance.sh
	@$(MAKE) assurance-metrics-export
	@$(MAKE) evaluate-flaky
	@$(MAKE) normalize-results-v2

resilience-intelligence:
	@./scripts/run-resilience-intelligence.sh
	@echo "Resilience intelligence: artifacts/latest/resilience-intelligence.json"

resilience-intelligence-check:
	@python3 -c 'import json, pathlib; p=pathlib.Path("artifacts/latest/resilience-intelligence.json"); assert p.exists(), "missing artifacts/latest/resilience-intelligence.json"; d=json.loads(p.read_text()); print("status={} score={} mode={}".format(d.get("status","unknown"), d.get("score","n/a"), d.get("mode","n/a")))'

phase-a-checks:
	@./scripts/run-gitleaks.sh
	@./scripts/run-schemathesis.sh
	@./scripts/run-hadolint.sh
	@./scripts/run-checkov.sh

gitleaks-check:
	@./scripts/run-gitleaks.sh

schemathesis-check:
	@./scripts/run-schemathesis.sh

hadolint-check:
	@./scripts/run-hadolint.sh

checkov-check:
	@./scripts/run-checkov.sh

chaos-check:
	@./scripts/run-chaos-checks.sh
	@echo "Chaos evidence: artifacts/latest/chaos-results.json"

chaos-sample:
	@ASSURANCE_MODE=pragmatic RISK_TIER=high MODULE_TYPE=api ./scripts/run-chaos-checks.sh
	@cat artifacts/latest/chaos-results.json

assurance-metrics-export:
	@./scripts/export-assurance-metrics.py --input artifacts/latest/results.json --output artifacts/metrics/assurance.prom --promotion artifacts/latest/promotion-decision.json --flaky artifacts/latest/flaky-policy.json --results-v2 artifacts/latest/results.v2.json --exceptions-audit artifacts/latest/exceptions-audit.json --pr-comment artifacts/latest/pr-comment.md

assurance-metrics-export-if-ready:
	@if [ -f artifacts/latest/results.json ]; then \
		$(MAKE) assurance-metrics-export; \
	else \
		echo "Skipping assurance-metrics-export (artifacts/latest/results.json missing)"; \
	fi

assurance-dashboard-check:
	@echo "Checking Prometheus assurance metrics..."
	@curl -fsS "http://localhost:9090/api/v1/query?query=assurance_pass_rate" | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d.get("status")=="success" and d["data"]["result"], "assurance_pass_rate missing"; print("✅ Prometheus has assurance_pass_rate")'
	@echo "Checking Grafana dashboard provisioning..."
	@curl -fsS "http://localhost:3000/api/search?query=UAP%20Assurance%20Dashboard" | python3 -c 'import json,sys; r=json.load(sys.stdin); assert any((x.get("title")=="UAP Assurance Dashboard") for x in r), "Dashboard not found"; print("✅ Grafana dashboard found")'

assurance-governance-check:
	@echo "Checking Prometheus governance metrics..."
	@for q in assurance_promotion_allowed assurance_promotion_failed_gates_total assurance_evidence_signature_required assurance_exceptions_active_total assurance_flaky_violations_total assurance_control_pass assurance_pr_summary_severity_total assurance_chaos_required assurance_chaos_executed_total assurance_chaos_passed assurance_chaos_skipped assurance_resilience_intelligence_status assurance_resilience_intelligence_score onboarding_score onboarding_ready onboarding_stage_current onboarding_plan_exists; do \
		curl -fsS "http://localhost:9090/api/v1/query?query=$$q" | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d.get("status")=="success" and d["data"]["result"], "missing metric"'; \
		echo "✅ Prometheus has $$q"; \
	done
	@echo "Checking Grafana governance dashboard provisioning..."
	@curl -fsS "http://localhost:3000/api/search?query=UAP%20Assurance%20Governance%20Dashboard" | python3 -c 'import json,sys; r=json.load(sys.stdin); assert any((x.get("title")=="UAP Assurance Governance Dashboard") for x in r), "Governance dashboard not found"; print("✅ Grafana governance dashboard found")'

zap-smoke:
	@ASSURANCE_MODE=real FORCE_REAL_TOOLS=1 ONLY_ZAP_SMOKE=1 ./scripts/run-assurance.sh

RESULTS ?= artifacts/latest/results.json
OUT ?= artifacts/latest/release-report.md

report:
	@./scripts/generate-release-report.py --input $(RESULTS) --output $(OUT)
	@$(MAKE) assurance-metrics-export
	@echo "Report generated at $(OUT)"

collect-evidence:
	@./scripts/collect-evidence.sh

EVIDENCE_SOURCE ?= artifacts/latest
EVIDENCE_OUT ?= evidence/bundles
ENV ?= dev
EXCEPTIONS_DIR ?= config/exceptions

evidence-bundle:
	@./scripts/create-evidence-bundle.py --source $(EVIDENCE_SOURCE) --out-dir $(EVIDENCE_OUT)

sign-bundle:
	@latest_bundle=$$(ls -1 $(EVIDENCE_OUT)/*.tar.gz | tail -n1); \
		if [ -z "$$latest_bundle" ]; then echo "No bundle found in $(EVIDENCE_OUT)"; exit 1; fi; \
		./scripts/sign-evidence-bundle.sh "$$latest_bundle"

validate-exceptions:
	@tier=$$(python3 -c 'import json;print(json.load(open("artifacts/latest/results.json")).get("risk_context",{}).get("risk_tier","low"))'); \
	service=$$(python3 -c 'import json;print(json.load(open("artifacts/latest/results.json")).get("service","sample-service"))'); \
	./scripts/validate-exceptions.py --exceptions-dir $(EXCEPTIONS_DIR) --service $$service --environment $(ENV) --tier $$tier --output artifacts/latest/exceptions-audit.json

evaluate-flaky:
	@./scripts/evaluate-flaky-policy.py --policy config/flaky-policy.json --results artifacts/latest/results.json --output artifacts/latest/flaky-policy.json

normalize-results-v2:
	@./scripts/normalize-results-v2.py --input artifacts/latest/results.json --output artifacts/latest/results.v2.json --exceptions artifacts/latest/exceptions-audit.json --promotion artifacts/latest/promotion-decision.json --flaky artifacts/latest/flaky-policy.json

render-pr-comment:
	@./scripts/render-pr-comment.py --results artifacts/latest/results.json --promotion artifacts/latest/promotion-decision.json --flaky artifacts/latest/flaky-policy.json --output artifacts/latest/pr-comment.md

promotion-check:
	@./scripts/evaluate-promotion.py --environment $(ENV) --results artifacts/latest/results.json --evidence-dir artifacts/latest --exceptions-dir $(EXCEPTIONS_DIR) --flaky-result artifacts/latest/flaky-policy.json
	@$(MAKE) assurance-metrics-export
	@echo "Promotion decision: artifacts/latest/promotion-decision.json"

MODULE ?=
TYPE ?=
module-golden-path:
	@if [ -z "$(MODULE)" ] || [ -z "$(TYPE)" ]; then \
		echo "Usage: make module-golden-path MODULE=<module-name> TYPE=<frontend|api|worker|shared-lib>"; \
		exit 1; \
	fi
	@./scripts/generate-module-golden-path.py --module "$(MODULE)" --type "$(TYPE)"

preflight:
	@if [ -z "$(MODULE)" ] || [ -z "$(TYPE)" ]; then \
		echo "Usage: make preflight MODULE=<module-name> TYPE=<frontend|api|worker|shared-lib>"; \
		exit 1; \
	fi
	@./scripts/preflight.py --module "$(MODULE)" --type "$(TYPE)"

SERVICE ?=
TIER ?=
OWNERS ?=
onboard:
	@if [ -z "$(SERVICE)" ] || [ -z "$(TYPE)" ] || [ -z "$(TIER)" ] || [ -z "$(OWNERS)" ]; then \
		echo "Usage: make onboard SERVICE=<service> TYPE=<api|frontend|worker|shared-lib> TIER=<low|medium|high|critical> OWNERS=<owner1,owner2>"; \
		exit 1; \
	fi
	@./scripts/onboard-service.py --service "$(SERVICE)" --type "$(TYPE)" --tier "$(TIER)" --owners "$(OWNERS)"
	@$(MAKE) assurance-metrics-export-if-ready

onboarding-score:
	@if [ -z "$(SERVICE)" ]; then \
		echo "Usage: make onboarding-score SERVICE=<service>"; \
		exit 1; \
	fi
	@./scripts/onboarding-score.py --service "$(SERVICE)"
	@$(MAKE) assurance-metrics-export-if-ready

onboarding-plan:
	@if [ -z "$(SERVICE)" ]; then \
		echo "Usage: make onboarding-plan SERVICE=<service>"; \
		exit 1; \
	fi
	@mkdir -p artifacts/latest/onboarding
	@./scripts/onboarding-plan.py --service "$(SERVICE)" | tee artifacts/latest/onboarding/$(SERVICE)-plan.md
	@echo "Saved: artifacts/latest/onboarding/$(SERVICE)-plan.md"
	@$(MAKE) assurance-metrics-export-if-ready

consumer-quickstart:
	@printf "%s\n" "# UAP Consumer Quickstart (first run)"
	@printf "%s\n" "git clone <your-uap-repo-url>"
	@printf "%s\n" "cd unified-assurance-platform"
	@printf "%s\n" "make bootstrap"
	@printf "%s\n" "make validate"
	@printf "%s\n" "make onboard SERVICE=payments-api TYPE=api TIER=high OWNERS=api-owner,security-owner"
	@printf "%s\n" "make preflight MODULE=payments-api TYPE=api"
	@printf "%s\n" "make onboarding-score SERVICE=payments-api"
	@printf "%s\n" "make onboarding-plan SERVICE=payments-api"
	@printf "%s\n" "make dev-stack-up && make assurance-governance-check"

end-to-end-review:
	@./scripts/run-end-to-end-review.sh

explain-last-fail:
	@./scripts/explain-failures.py

suggest-next-steps:
	@./scripts/suggest-next-steps.py

CONTROL ?=
REASON ?=
EXPIRY_DAYS ?= 7
request-exception:
	@if [ -z "$(CONTROL)" ] || [ -z "$(REASON)" ]; then \
		echo "Usage: make request-exception CONTROL=<control> REASON='<reason>' [EXPIRY_DAYS=7]"; \
		exit 1; \
	fi
	@./scripts/request-exception.py --control "$(CONTROL)" --reason "$(REASON)" --expiry-days "$(EXPIRY_DAYS)"

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

demo-site-up:
	@if [ -f .demo-site.pid ] && kill -0 $$(cat .demo-site.pid) 2>/dev/null; then \
		PORT=$$(cat .demo-site.port 2>/dev/null || echo 8790); \
		echo "Demo site already running at http://127.0.0.1:$$PORT/demo/site/"; \
	else \
		PORT=""; \
		for p in 8790 8791 8792; do \
			if ! python3 -c "import socket; s=socket.socket(); s.bind(('127.0.0.1', $$p)); s.close()" 2>/dev/null; then \
				continue; \
			fi; \
			PORT=$$p; \
			break; \
		done; \
		if [ -z "$$PORT" ]; then \
			echo "No free demo-site port found (tried 8790-8792)."; \
			exit 1; \
		fi; \
		nohup python3 -m http.server $$PORT > /tmp/uap-demo-site.log 2>&1 & echo $$! > .demo-site.pid; \
		echo $$PORT > .demo-site.port; \
		sleep 1; \
		if kill -0 $$(cat .demo-site.pid) 2>/dev/null; then \
			echo "Demo site started: http://127.0.0.1:$$PORT/demo/site/"; \
		else \
			echo "Failed to start demo site. Check /tmp/uap-demo-site.log"; \
			exit 1; \
		fi; \
	fi

demo-site-down:
	@if [ -f .demo-site.pid ] && kill -0 $$(cat .demo-site.pid) 2>/dev/null; then \
		kill $$(cat .demo-site.pid); rm -f .demo-site.pid .demo-site.port; \
		echo "Demo site stopped."; \
	else \
		rm -f .demo-site.pid .demo-site.port; \
		echo "Demo site is not running."; \
	fi

demo-e2e:
	@$(MAKE) dev-stack-up
	@$(MAKE) dev-stack-status
	@./scripts/dev-stack-smoke.sh
	@$(MAKE) demo-up
	@$(MAKE) demo-site-up
	@$(MAKE) tooling-check
	@$(MAKE) run-assurance-real
	@$(MAKE) report RESULTS=artifacts/latest/results.json OUT=artifacts/latest/demo-e2e-report.md
	@PORT=$$(cat .demo-site.port 2>/dev/null || echo 8790); \
		echo "\n✅ Demo E2E complete"; \
		echo "- Grafana: http://localhost:3000 (admin/admin)"; \
		echo "- Prometheus: http://localhost:9090"; \
		echo "- Demo UI: http://127.0.0.1:$$PORT/demo/site/"; \
		echo "- Final report: artifacts/latest/demo-e2e-report.md"; \
		echo "- To stop all: make demo-down && make demo-site-down && make dev-stack-down";

dev-stack-up:
	@mkdir -p artifacts/metrics
	@docker compose -f infra/local/docker-compose.yml up -d
	@echo "Local observability stack is up."

dev-stack-down:
	@docker compose -f infra/local/docker-compose.yml down
	@echo "Local observability stack is down."

dev-stack-status:
	@docker compose -f infra/local/docker-compose.yml ps
