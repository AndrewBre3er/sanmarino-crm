# 34. Bootstrap Task for Codex

## Status

Accepted.

This file is the **immediate execution task** for Codex.
It must be used only after Codex reads the accepted project docs.
The goal is to generate the initial repository scaffold and database bootstrap without inventing business behavior.

---

## 1. Objective

Create the first runnable monorepo bootstrap for the CRM/ERP project using the approved stack.

Deliverables of this task:
- root workspace files
- `apps/web` scaffold
- `apps/api` scaffold
- `apps/worker` scaffold
- `packages/ui`, `packages/config`, `packages/types` scaffolds
- deploy placeholders
- test placeholders
- API Prisma bootstrap aligned with the accepted physical schema
- no feature implementation beyond bootstrap foundations

---

## 2. Mandatory read order before any code changes

Read these files in this exact order:
1. `docs/00-project-context.md`
2. `docs/01-system-logic.md`
3. `docs/04-state-machines.md`
4. `docs/05-process-flows.md`
5. `docs/06-data-integrity-rules.md`
6. `docs/07-roles-and-access.md`
7. `docs/08-architecture-fixes-and-critical-blockers.md`
8. `docs/13-database-architecture.md`
9. `docs/20-security-architecture.md`
10. `docs/21-testing-strategy.md`
11. `docs/23-tech-baseline-and-decision-log.md`
12. `docs/24-mvp-scope-v1.md`
13. `docs/25-development-standards.md`
14. `docs/28-approved-tech-stack.md`
15. `docs/29-monorepo-bootstrap-spec.md`
16. `docs/30-initial-folder-contracts.md`
17. `docs/32-physical-database-schema.md`
18. `docs/33-root-repo-files-spec.md`

Do not start generating files before reading all of them.

---

## 3. Implementation scope for this task

### 3.1 In scope
- bootstrap repo structure
- root manifests/configs
- initial app scaffolds
- initial shared package scaffolds
- Prisma bootstrap in `apps/api`
- first migration-ready schema surface
- minimal seed scaffolding for roles/permissions/admin bootstrap
- dev/test/deploy placeholders

### 3.2 Explicitly out of scope
- full business services
- full REST endpoints
- real dashboard implementation
- real CRM forms
- advanced authorization matrix implementation
- production-ready UI
- full worker jobs
- full reconciliation logic
- KPI calculations
- external provider integrations

This is a bootstrap task, not a feature delivery task.

---

## 4. Hard constraints

1. Do not invent business rules outside accepted docs.
2. Do not reduce the model back to `1 Order = 1 DeliveryTask`.
3. Do not omit `stock_locks`, `reservations`, `idempotency`, `outbox`, or `quarantine` support from schema bootstrap.
4. Do not place business-critical logic in `apps/web`.
5. Do not use hard delete flows for protected entities.
6. Do not implement live KPI using runtime cross-domain joins.
7. Do not replace PostgreSQL domain schemas with ad hoc table naming unless a new ADR explicitly approves it.
8. Do not skip worker/deploy/test placeholders.
9. Do not commit real secrets.
10. Do not restructure `/docs`.

---

## 5. Required bootstrap sequence

Execute in this order:

### Step 1. Root bootstrap
Create:
- `package.json`
- `pnpm-workspace.yaml`
- `turbo.json`
- `tsconfig.base.json`
- `.gitignore`
- `.gitattributes`
- `.editorconfig`
- `.env.example`
- `.vscode/settings.json`
- `.vscode/extensions.json`
- update `README.md` only if needed to reflect the approved stack/bootstrap
- preserve and keep `AGENTS.md`

### Step 2. Apps bootstrap
Create:
- `apps/web`
- `apps/api`
- `apps/worker`

Each app must have valid package manifest, tsconfig, source entrypoint, and minimal runnable structure.

### Step 3. Packages bootstrap
Create:
- `packages/ui`
- `packages/config`
- `packages/types`

Each package must have a valid manifest and public entrypoint.

### Step 4. Deploy bootstrap
Create:
- `deploy/compose/docker-compose.dev.yml`
- `deploy/compose/docker-compose.vps.yml`
- `deploy/nginx/crm.conf.example`
- `deploy/env/*.env.example`
- `deploy/README.md`

### Step 5. Test bootstrap
Create:
- repo-level `tests/e2e`
- repo-level `tests/integration`
- repo-level `tests/fixtures`
- repo-level `tests/smoke`
- API-side test placeholders
- Playwright config placeholder if repo-level placement is chosen

### Step 6. Database bootstrap
Inside `apps/api/prisma`:
- create `schema.prisma`
- configure PostgreSQL datasource
- configure Prisma generator(s)
- include domain schemas from accepted physical schema
- include core enums
- include initial models/tables from `32-physical-database-schema.md`
- create seed scaffold

Minimum models that must exist in the first pass:
- users/departments/roles/permissions/user_roles/role_permissions
- crm/clients/contacts/leads/deals
- inventory/products/warehouses/stock_balances/stock_locks/reservations/inventory_movements
- orders/orders/order_items/fulfillments/fulfillment_items/return_requests/return_request_items
- payments/payments/cash_operations
- logistics/delivery_slots/pickup_windows/drivers/vehicles/route_days/delivery_tasks/delivery_task_items
- finance/finance_entries/expenses/marketing_expenses
- analytics/live_kpi_metrics/snapshot_kpi_metrics
- audit/audit_events
- reconciliation/reports
- system/idempotency_records/outbox_events/settings

### Step 7. Quality pass
Ensure:
- manifests are coherent
- TypeScript config extends correctly
- imports resolve
- scripts exist
- bootstrap compiles or is one close follow-up away from compile-ready

---

## 6. Deliverable shape expected from Codex

Codex must output:
- file tree summary
- list of created/updated files
- note on any `TBD` items intentionally left unresolved
- no fabricated feature claims

Codex must not claim production readiness after bootstrap.

---

## 7. Acceptance criteria

The task is accepted only if all of the following are true:
- `pnpm install` can be run at repo root
- root scripts exist
- web/api/worker manifests exist
- Prisma bootstrap exists in API
- schema covers the critical architecture blockers
- no direct contradiction with docs `08`, `28`, `29`, `30`, `32`, `33`
- deploy placeholders exist
- test placeholders exist
- repo remains monorepo and TypeScript-based

---

## 8. Mandatory note for database generation

If any part of the accepted physical schema is too large for one pass, Codex must still scaffold the **full namespace structure and core critical models first**, specifically:
- `orders.orders`
- `orders.order_items`
- `inventory.stock_locks`
- `inventory.reservations`
- `inventory.inventory_movements`
- `logistics.delivery_tasks`
- `logistics.delivery_task_items`
- `orders.return_requests`
- `payments.payments`
- `system.idempotency_records`
- `system.outbox_events`

These may not be deferred out of the first schema pass.

---

## 9. Stop conditions

Codex must stop and report instead of guessing if:
- a file would violate the approved stack
- a required constraint conflicts with accepted docs
- a required production secret is missing and a placeholder is not sufficient

In such a case Codex must preserve the bootstrap and clearly mark the unresolved point as `TBD`.
