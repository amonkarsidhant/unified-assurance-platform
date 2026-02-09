# Reference Architecture Diagram

## Text view
- Clients hit a public LB.
- LB routes requests to API VM pool.
- API reads/writes primary DB; read-heavy calls may use replica.
- API publishes async work to queue.
- Worker VMs consume queue, update DB/cache, emit events.
- Cache serves hot reads and reduces DB load.
- All components emit logs/metrics/traces to observability stack.

## Mermaid
```mermaid
flowchart TD
    U[Users / Clients] --> DNS[DNS]
    DNS --> LB[Load Balancer + TLS/WAF]

    LB --> API1[API VM 1]
    LB --> API2[API VM 2]
    LB --> APIN[API VM N]

    API1 --> C[(Cache)]
    API2 --> C
    APIN --> C

    API1 --> Q[(Queue)]
    API2 --> Q
    APIN --> Q

    API1 --> DBP[(DB Primary)]
    API2 --> DBP
    APIN --> DBP

    DBP --> DBR[(DB Replica)]

    Q --> W1[Worker VM 1]
    Q --> W2[Worker VM 2]
    W1 --> DBP
    W2 --> DBP
    W1 --> C
    W2 --> C

    LB -. logs/metrics .-> OBS[Observability]
    API1 -. logs/metrics/traces .-> OBS
    API2 -. logs/metrics/traces .-> OBS
    APIN -. logs/metrics/traces .-> OBS
    W1 -. logs/metrics/traces .-> OBS
    W2 -. logs/metrics/traces .-> OBS
    DBP -. metrics/audit .-> OBS
    DBR -. metrics .-> OBS
```
