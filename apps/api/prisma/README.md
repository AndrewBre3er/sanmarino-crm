# Prisma Infra Bootstrap

This folder is intentionally infra-only in Phase 2.

Current state:
- datasource and generator are configured
- infra/system models are configured:
  - `system.idempotency_records`
  - `system.outbox_events`
  - `audit.audit_log_records`
- no business/domain models yet
- migration conventions are documented in `MIGRATION_WORKFLOW.md`

TODO:
- add schema models in implementation phase only
- add business migrations when domain schema is approved for implementation
- add repository implementations after persistence contracts are wired
