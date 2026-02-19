# UAP Control Plane Helm Chart

## Overview

This Helm chart deploys the Unified Assurance Platform (UAP) Control Plane to Kubernetes.

## Installation

```bash
# Add the repository
helm repo add uap https://amonkarsidhant.github.io/unified-assurance-platform

# Install
helm install uap-control-plane uap/control-plane

# Or with custom values
helm install uap-control-plane uap/control-plane -f values-prod.yaml
```

## Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of replicas | `2` |
| `image.repository` | Container image | `ghcr.io/amonkarsidhant/unified-assurance-platform` |
| `image.tag` | Image tag | `0.1.0` |
| `service.type` | Service type | `ClusterIP` |
| `service.port` | Service port | `8080` |
| `config.nodeEnv` | Node environment | `production` |
| `config.database.path` | SQLite database path | `/data/assurance.db` |
| `config.otel.endpoint` | OpenTelemetry collector endpoint | `http://otel-collector:4317` |
| `resources.limits.cpu` | CPU limit | `1000m` |
| `resources.limits.memory` | Memory limit | `1Gi` |
| `resources.requests.cpu` | CPU request | `250m` |
| `resources.requests.memory` | Memory request | `512Mi` |
| `persistence.enabled` | Enable persistence | `true` |
| `persistence.size` | PVC size | `10Gi` |

## Metrics

The chart includes Prometheus ServiceMonitor configuration:

```yaml
prometheus:
  enabled: true
  serviceMonitor:
    enabled: true
```

## TLS/SSL

Configure TLS via the ingress:

```yaml
ingress:
  enabled: true
  hosts:
    - host: uap.example.com
  tls:
    - secretName: uap-tls
      hosts:
        - uap.example.com
```

## High Availability

The chart configures pod anti-affinity for HA:

```yaml
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 100
      podAffinityTerm:
        topologyKey: kubernetes.io/hostname
```
