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
  - `orders.orders` (includes mandatory `deal_id` and `fulfillment_type`)
  - `orders.order_items`
  - `logistics.delivery_tasks`
  - `orders.return_requests`
  - `payments.payments`
- pickup/delivery consistency baseline:
  - pickup orders use `fulfillment_type='pickup'`
  - pickup orders are constrained to `delivery_status='not_scheduled'`
  - `delivery(1..N task) / pickup(0 task)` cardinality enforcement remains TODO at domain/transaction boundary
- migration conventions are documented in `MIGRATION_WORKFLOW.md`

TODO:
- add remaining business/domain schema models in dedicated phases only
- add domain-specific migrations when each domain schema is approved
- add repository implementations after persistence contracts are wired
