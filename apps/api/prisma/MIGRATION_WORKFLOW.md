# Prisma Migration Workflow (Infra + Minimal Core Baseline)

This workflow defines bootstrap-safe migration conventions.

## Current scope

- Prisma schema includes:
  - infra/system models
  - minimal core transactional business foundation models
- full business/domain schema is intentionally deferred.

Current migration baseline:
- `system.idempotency_records`
- `system.outbox_events`
- `audit.audit_log_records`
- `crm.leads`
- `crm.deals`
- `orders.orders`
- `orders.order_items`
- `logistics.delivery_tasks`
- `orders.return_requests`
- `payments.payments`

## Commands

Use root scripts:

- `pnpm db:validate`
- `pnpm db:generate`
- `pnpm db:migrate`

Use API-local scripts when needed:

- `pnpm --filter @sanmarino/api prisma:validate`
- `pnpm --filter @sanmarino/api prisma:generate`
- `pnpm --filter @sanmarino/api prisma:migrate`

## Bootstrap conventions

1. Keep schema additions limited to approved phase scope.
2. Any future migration must be reproducible and committed.
3. Migration files should be generated from Prisma commands, not handwritten SQL by default.
4. Apply migrations in controlled environments only.
5. Never commit real secrets.

## TODO (deferred)

- define remaining business schema rollout plan by domain
- define migration approval gate for high-risk changes
- define rollback/recovery playbook for production migrations
