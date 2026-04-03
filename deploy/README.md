# Deploy Baseline

Phase 2 infra baseline only.

Includes:
- Docker Compose topology for `web`, `api`, `worker`, `postgres`, `redis`, `nginx`
- healthcheck/readiness-friendly service wiring
- env templates aligned with root/app contracts

Explicitly deferred (TODO):
- production hardening details
- secret management implementation
- release automation
- backup/restore implementation
- monitoring/alerting vendor wiring
