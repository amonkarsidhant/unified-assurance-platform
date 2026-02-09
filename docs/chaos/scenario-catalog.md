# Chaos Scenario Catalog (Injector-Agnostic)

## Network Latency
- Goal: validate timeout budgets and graceful degradation.
- Typical injectors: Chaos Toolkit, Toxiproxy.

## Dependency Timeout
- Goal: verify fallback/circuit-breaker/retry behavior.
- Typical injectors: Chaos Toolkit, service stubs, fault proxies.

## Process Kill
- Goal: verify restart semantics and in-flight work safety.
- Typical injectors: Pumba, container/runtime kill, supervised process stop.

## Resource Stress
- Goal: validate CPU/memory saturation behavior and protection.
- Typical injectors: stress-ng.

## Queue Backlog
- Goal: verify consumer lag handling and DLQ/idempotency paths.
- Typical injectors: backlog generators, rate throttling, worker pause.

## Module Type Minimums
- api: network_latency, dependency_timeout, queue_backlog
- frontend: network_latency, dependency_timeout
- worker: process_kill, queue_backlog, resource_stress
- shared-lib: dependency_timeout, resource_stress
