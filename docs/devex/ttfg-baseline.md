# TTFG Baseline (Sprint-01)

TTFG = **Time To First Green** from clone to first successful `make validate`.

## Baseline assumptions

- Clean local setup.
- Toolchain installed per required-tooling docs.
- No pre-warmed caches.

## Initial baseline (Sprint-01)

| Segment | Median | p90 | Notes |
| --- | ---: | ---: | --- |
| Bootstrap (`make bootstrap`) | 8 min | 14 min | First-time downloads dominate |
| Validation (`make validate`) | 5 min | 9 min | Core lint/validation flow |
| Context loading (docs/orientation) | 7 min | 12 min | Discoverability overhead |
| **Total TTFG** | **20 min** | **35 min** | Baseline for improvement |

## Target direction

- Sprint-02 target: median <= 15 min, p90 <= 25 min.
- Add preflight diagnostics and clearer first-green path.
- Improve determinism and error clarity.
