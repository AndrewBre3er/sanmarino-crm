# Prisma Schema Foundation

This folder currently contains:
- infra/system foundation models
- minimal core transactional business foundation models

Current state:
- datasource and generator are configured
- infra/system models are configured:
  - `system.idempotency_records`
  - `system.outbox_events`
  - `audit.audit_log_records`
- minimal core transactional models are configured:
  - `crm.leads`
  - `crm.deals`
  - `orders.orders`
  - `orders.order_items`
  - `logistics.delivery_tasks`
  - `orders.return_requests`
  - `payments.payments`
- migration conventions are documented in `MIGRATION_WORKFLOW.md`

TODO:
- add remaining business/domain schema models in dedicated phases only
- add domain-specific migrations when each domain schema is approved
- add repository implementations after persistence contracts are wired
