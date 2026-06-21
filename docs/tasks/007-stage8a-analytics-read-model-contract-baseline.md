# Task 007: Stage 8A - Analytics Read-Model Contract Baseline

## Role

Implementation task.

Recommended window title:

`Stage 8A - Analytics Read-Model Contract Baseline`

## Goal

Implement the first narrow Stage 8 slice for the `KPI / Reporting / Automation layer`.

This task must add only the accepted analytics/KPI read-model contract baseline:

- Prisma schema and migration for accepted `analytics` tables only
- read-only KPI API endpoints that are already accepted in docs
- focused schema/read-contract tests
- optional worker boundary alignment only if needed to keep KPI refresh asynchronous and non-mutating

Do not implement KPI formulas, broad reports, dashboards, notification providers, or department plan mutations.

## Starting Point

Expected project state:

- Stage 7 backend baseline is closed.
- `docs/tasks/006-stage8-kpi-reporting-automation-entry.md` exists and identifies this slice as the first safe Stage 8 implementation task.
- Current Prisma schema does not yet contain analytics models:
  - `AnalyticsLiveKpiMetric`
  - `AnalyticsSnapshotKpiMetric`
  - `AnalyticsDepartmentPlan`
- Current API does not yet contain a KPI/analytics module.
- `apps/worker/src/jobs/kpi-recompute.processor.ts` is still only a placeholder.
- Existing read-side query/envelope patterns are available under `apps/api/src/modules/read-side`.

If the local repo does not match this state, stop and report the mismatch before coding.

## Read First

- `README.md`
- `AGENTS.md`
- `.agents/skills/sanmarino-step-runner/SKILL.md`
- `docs/ai/PROJECT_INDEX.md`
- `docs/ai/CONTEXT_BRIEF.md`
- `docs/ai/BUSINESS_RULES.md`
- `docs/ai/CODING_RULES.md`
- `docs/07-roles-and-access.md`
- `docs/08-architecture-fixes-and-critical-blockers.md`
- `docs/09-kpi-model.md`
- `docs/13-database-architecture.md`
- `docs/14-api-contracts.md`
- `docs/15-event-model.md`
- `docs/20-security-architecture.md`
- `docs/21-testing-strategy.md`
- `docs/22-qa-release-checklist.md`
- `docs/23-tech-baseline-and-decision-log.md`
- `docs/24-mvp-scope-v1.md`
- `docs/25-development-standards.md`
- `docs/28-approved-tech-stack.md`
- `docs/30-initial-folder-contracts.md`
- `docs/32-physical-database-schema.md`
- `docs/33-root-repo-files-spec.md`
- `docs/38-mvp-v1-functional-realignment.md`
- `docs/tasks/006-stage8-kpi-reporting-automation-entry.md`

Inspect implementation:

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/MIGRATION_WORKFLOW.md`
- `apps/api/prisma/migrations/`
- `apps/api/src/app.module.ts`
- `apps/api/src/modules/read-side/`
- `apps/api/src/modules/auth/`
- `apps/api/tests/unit/prisma.infra-schema.spec.ts`
- `apps/api/tests/unit/read-side.query-contract.spec.ts`
- `apps/api/tests/unit/read-side.use-cases.spec.ts`
- `apps/worker/src/jobs/kpi-recompute.processor.ts`
- `apps/worker/src/queues/queue.contracts.ts`
- `apps/worker/src/queues/queue.names.ts`
- `apps/worker/tests/unit/worker.spec.ts`

## Scope

Implement only:

- accepted analytics Prisma models and migration
- read-only KPI/analytics API contract baseline
- focused tests for schema, read contracts, and anti-mutation guarantees
- optional worker placeholder contract alignment if needed

Keep changes narrow and repo-native. Use existing Prisma, NestJS module, auth guard, read-side DTO, response envelope, and Vitest patterns.

## Accepted Analytics Storage Contract

Add or align only these Prisma models and tables from `docs/32-physical-database-schema.md`:

- `AnalyticsLiveKpiMetric` mapped to `analytics.live_kpi_metrics`
- `AnalyticsDepartmentPlan` mapped to `analytics.department_plans`
- `AnalyticsSnapshotKpiMetric` mapped to `analytics.snapshot_kpi_metrics`

### `analytics.live_kpi_metrics`

Accepted columns:

- `id`
- `metric_code varchar(128) not null`
- `scope_type varchar(64) not null`
- `scope_id uuid null`
- `metric_value numeric(18,4) not null`
- `metric_payload jsonb null`
- `as_of timestamptz not null`
- `updated_at timestamptz not null default now()`
- `created_at timestamptz not null default now()`

Accepted indexes:

- unique `(metric_code, scope_type, scope_id)`
- index on `(as_of)`

### `analytics.department_plans`

Accepted columns:

- `id`
- `department_id uuid not null references users.departments(id)`
- `metric_code varchar(128) not null`
- `period_start date not null`
- `period_end date not null`
- `plan_value numeric(18,4) not null`
- `set_by_user_id uuid not null references users.users(id)`
- `set_at timestamptz not null`
- `created_at`
- `updated_at`

Accepted indexes:

- unique `(department_id, metric_code, period_start, period_end)`
- index on `(metric_code, period_start, period_end)`

Rules:

- plan records are manual inputs only
- plan records must stay separate from factual KPI aggregates
- this task must not add mutation endpoints for department plans

### `analytics.snapshot_kpi_metrics`

Accepted columns:

- `id`
- `metric_code varchar(128) not null`
- `period_type varchar(32) not null`
- `period_start date not null`
- `period_end date not null`
- `scope_type varchar(64) not null`
- `scope_id uuid null`
- `metric_value numeric(18,4) not null`
- `metric_payload jsonb null`
- `created_at`
- `updated_at`

Accepted indexes:

- unique `(metric_code, period_type, period_start, period_end, scope_type, scope_id)`

Do not add analytics tables, enums, dimensions, formula tables, metric history tables, or BI facts beyond these three accepted tables.

If Prisma/PostgreSQL nullable `scope_id` uniqueness cannot exactly enforce the accepted uniqueness with a normal Prisma unique constraint, implement the closest repo-approved Prisma mapping and report the exact limitation. Do not invent sentinel IDs or extra domain rules.

## Accepted Metric Keys

For this task, use only the accepted executive metric keys from `docs/14-api-contracts.md`:

- `cash_revenue`
- `shipped_amount`
- `gross_profit`
- `net_profit`
- `cash_balance`
- `sales_pipeline_count`
- `sales_pipeline_amount`
- `sales_conversion_by_shipment`
- `cac_paid_channels_first_shipment`
- `inventory_turnover_ratio_month`
- `driver_money_expected`
- `problem_orders_count`
- `supplier_payables_amount`

Do not add other metric keys.
Do not add KPI formulas.
Do not convert `metric_code` to a Prisma enum because the accepted schema defines it as `varchar(128)`.

## Accepted Read API Contract

Implement only read endpoints already accepted by `docs/14-api-contracts.md`:

- `GET /kpi/live`
- `GET /kpi/snapshots`
- `GET /kpi/department-plans`

Allowed filters:

- `GET /kpi/live`
  - `metricKey`
  - `scope`
  - `date`
- `GET /kpi/snapshots`
  - `metricKey`
  - `periodType`
  - `periodStart`
  - `periodEnd`
- `GET /kpi/department-plans`
  - `departmentId`
  - `metricKey`
  - `periodStart`
  - `periodEnd`

Implementation constraints:

- endpoints must read from `analytics.*` read models only
- endpoints must not query CRM, Orders, Inventory, Payments, Logistics, Finance, Returns, Audit, or Reconciliation transactional tables to calculate KPI
- endpoints must not mutate source-domain facts
- endpoints must not perform heavy runtime joins across transactional domains
- response shape should follow existing repo read-side envelope patterns
- `metricKey` may map to storage `metric_code`
- unsupported metric keys must be rejected or excluded by the read contract

Do not implement:

- `POST /kpi/department-plans`
- `PATCH /kpi/department-plans/{planId}`

Department plan mutation endpoints are blocked until accepted role/permission ownership rules are concrete in repo contracts. Do not invent a planning permission code or ownership workflow in this task.

## Optional Worker Boundary

The accepted architecture says live KPI is updated asynchronously and read from aggregates/cache/materialized read models.

For this task:

- keep `apps/worker/src/jobs/kpi-recompute.processor.ts` as a placeholder unless a narrow contract test requires alignment
- if alignment is needed, add only a minimal non-mutating worker contract around the existing `kpi` queue
- do not calculate metric values
- do not call API services through unsafe cross-app imports
- do not add unauthenticated internal HTTP calls
- do not mutate domain records from the worker

## Required Behavior

### Schema Baseline

- Prisma schema contains the three accepted analytics models.
- Models map to the accepted `analytics` table names.
- Relations to `users.departments` and `users.users` are added only for `AnalyticsDepartmentPlan` and only according to accepted docs/current user models.
- Existing non-analytics schema remains unchanged except relation fields required by Prisma.
- Migration, if generated, contains only the accepted analytics tables, indexes, FKs, and required relation support.

### Read API Baseline

- `GET /kpi/live` returns precomputed live KPI read models.
- `GET /kpi/snapshots` returns fixed-period snapshot KPI read models.
- `GET /kpi/department-plans` returns department plan read models.
- All three endpoints are read-only.
- Query DTOs validate accepted filters.
- Read services/repositories use analytics models only.
- No write command, idempotency record, outbox event, audit mutation, or domain mutation is created by these read endpoints.

### Plan/Fact Discipline

- `AnalyticsDepartmentPlan` is the manual plan layer.
- `AnalyticsLiveKpiMetric` and `AnalyticsSnapshotKpiMetric` are factual read-model layers.
- Plan values must not overwrite or impersonate factual KPI values.
- KPI facts remain derived from source-of-truth domains and are not editable through dashboards or reports.

### Security Boundary

- Use existing auth/access guard patterns.
- Do not invent new role-to-metric visibility rules.
- If a concrete KPI read permission or role-to-metric map is missing, implement only the repo-safe authenticated read baseline and report the missing granular visibility map as an open risk.
- Do not use KPI facts as a permission bypass for any source-domain mutation.

## Explicit Non-Scope

Do not implement:

- KPI formulas or calculators
- broad dashboard UI
- BI/analytics facts platform
- new metric keys
- metric definitions editor
- runtime cross-domain JOIN KPI endpoints
- reporting UI
- reconciliation resolution workflow
- marking reconciliation reports resolved
- Telegram/MAX provider delivery
- generic notification routing
- external payment model realignment
- worker scheduling/transport hardening beyond an optional placeholder contract
- department plan creation/update/delete endpoints
- new permission codes or plan ownership workflow
- source-domain mutations from KPI/reporting/automation

KPI remains a derived/read layer and cannot become a source of truth.

## Tests Required

Add or update focused tests for:

- Prisma schema contains `AnalyticsLiveKpiMetric`, `AnalyticsSnapshotKpiMetric`, and `AnalyticsDepartmentPlan`
- Prisma schema maps the models to `analytics.live_kpi_metrics`, `analytics.snapshot_kpi_metrics`, and `analytics.department_plans`
- schema contains accepted analytics indexes/unique constraints where Prisma can represent them
- schema keeps `metric_code` as string/varchar, not a new metric enum
- accepted metric key list contains only the keys listed in this task
- KPI read query DTOs reject unsupported metric keys
- `GET /kpi/live` read use case delegates only to analytics read repository
- `GET /kpi/snapshots` read use case delegates only to analytics read repository
- `GET /kpi/department-plans` read use case delegates only to analytics read repository
- no `POST /kpi/department-plans` or `PATCH /kpi/department-plans/{planId}` route exists
- KPI read endpoints do not call transactional source-domain repositories/services for calculations
- worker KPI placeholder/contract remains non-mutating if touched

Prefer fast unit/schema tests. Do not add e2e or broad UI tests in this task.

## Verification Commands

Run:

```powershell
git status --short
$env:DATABASE_URL='postgresql://user:pass@localhost:5432/sanmarino'
pnpm --filter @sanmarino/api exec prisma validate
pnpm --filter @sanmarino/api exec vitest run tests/unit/prisma.infra-schema.spec.ts
pnpm --filter @sanmarino/api exec vitest run tests/unit/kpi-read-contract.spec.ts tests/unit/kpi-read.use-cases.spec.ts
pnpm --filter @sanmarino/worker test:unit
pnpm --filter @sanmarino/api test:unit
pnpm typecheck
git diff --check
```

If worker files are not touched and no KPI worker test is added, `pnpm --filter @sanmarino/worker test:unit` may still be run as a regression check.

If a migration is created, also inspect the generated migration and report that it contains only accepted analytics tables/indexes/FKs for this slice.

## Stop Conditions

Stop and report instead of coding if:

- the working tree contains unrelated dirty changes
- accepted docs conflict on KPI being derived/read-only
- implementation would require KPI formulas or metric calculations
- implementation would require adding metric keys outside accepted docs
- implementation would require inventing department plan ownership/permissions
- implementation would require department plan mutation endpoints
- implementation would require heavy runtime JOINs across transactional domains
- implementation would require UI scope
- implementation would require Telegram/MAX provider delivery
- implementation would require reconciliation resolution workflow
- implementation would require external payment model realignment
- implementation would require workers to bypass API/domain rules
- repo already contains a complete Stage 8A implementation and only verification is needed

## Required Report

Return:

```text
1. changed_files
2. what_done
3. tests_run
4. open_risks
5. ready_to_commit: yes/no
```
