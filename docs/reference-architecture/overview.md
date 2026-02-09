# Reference Architecture Overview (3-Tier Transaction Platform)

This golden path targets a typical enterprise transaction platform running on VMs:

1. **Presentation + edge tier**
   - Public DNS + load balancer (LB)
   - TLS termination, routing, basic WAF/rate limiting
2. **Application tier**
   - API services on VM pool
   - Background workers for async jobs
   - Shared cache + queue for burst handling and decoupling
3. **Data tier**
   - Primary relational database + read replica(s)
   - Backups, replication monitoring, and failover runbook

## Design goals
- Keep p95 latency predictable under normal traffic spikes.
- Contain failures to one layer where possible.
- Provide clear release gates with objective evidence.
- Make operations auditable (security + compliance + SRE).

## Minimum production baseline
- At least 2 LB instances (or managed HA LB)
- At least 2 API VMs per environment
- DB primary + at least 1 replica
- Queue + cache with health alerts
- Central logs, metrics, traces, and error-budget tracking

## Out of scope (for this baseline)
- Multi-region active/active
- Service mesh-specific controls
- Advanced zero-trust network segmentation

Use this baseline first, then extend based on risk and scale.
