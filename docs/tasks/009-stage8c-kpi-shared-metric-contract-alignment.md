# Task 009: Stage 8C - KPI Shared Metric Contract Alignment

## Role

Implementation task.

Recommended window title:

`Stage 8C - KPI Shared Metric Contract Alignment`

## Goal

Implement the next narrow Stage 8 slice for the `KPI / Reporting / Automation layer`.

This task must move the already accepted KPI metric-key, event, queue, and job-name contract into a shared repo contract so API and worker code do not maintain separate copies of the same Stage 8A/8B constants.

The task must:

- keep the accepted KPI metric list exactly aligned with accepted docs
- expose the shared contract from `packages/types`
- make the API KPI read contract consume the shared metric-key contract
- make the worker KPI refresh boundary consume the shared metric-key/event/queue/job contract
- add focused tests proving API and worker align to the same accepted contract
- preserve KPI as a derived/read layer only

Do not implement KPI formulas, read-model writes, department plan mutations, notification/provider delivery, dashboards, or broad automation routing.

## Starting Point

Expected project state:

- Stage 8A `Analytics Read-Model Contract Baseline` is complete.
- Stage 8B `KPI Refresh Automation Boundary` is complete.
- `packages/types` exists and exports shared platform contracts from `packages/types/src/index.ts`.
- API currently keeps accepted KPI metric keys under `apps/api/src/modules/analytics/kpi.metric-keys.ts`.
- Worker currently keeps accepted KPI refresh metric keys and the KPI refresh job contract under `apps/worker/src/jobs/kpi-recompute.processor.ts`.
- Worker queue contracts include:
  - key: `kpi`
  - env key: `WORKER_KPI_QUEUE`
  - default name: `analytics.kpi`
- Worker KPI refresh job contract uses:
  - queue key: `kpi`
  - job name: `kpi.live-aggregate.refresh`
- Accepted event contract exists for:
  - `kpi.live_aggregate_refreshed`
  - minimal payload: `metricKey`, `period`, `refreshedAt`

If the local repo does not match this state, stop and report the mismatch before coding.

## Read First

- `README.md`
- `AGENTS.md`
- `.agents/skills/sanmarino-step-runner/SKILL.md`
- `docs/ai/PROJECT_INDEX.md`
- `docs/ai/CONTEXT_BRIEF.md`
- `docs/ai/BUSINESS_RULES.md`
- `docs/ai/CODING_RULES.md`
- `docs/08-architecture-fixes-and-critical-blockers.md`
- `docs/09-kpi-model.md`
- `docs/14-api-contracts.md`
- `docs/15-event-model.md`
- `docs/16-implementation-roadmap.md`
- `docs/20-security-architecture.md`
- `docs/21-testing-strategy.md`
- `docs/22-qa-release-checklist.md`
- `docs/24-mvp-scope-v1.md`
- `docs/25-development-standards.md`
- `docs/28-approved-tech-stack.md`
- `docs/32-physical-database-schema.md`
- `docs/38-mvp-v1-functional-realignment.md`
- `docs/tasks/006-stage8-kpi-reporting-automation-entry.md`
- `docs/tasks/007-stage8a-analytics-read-model-contract-baseline.md`
- `docs/tasks/008-stage8b-kpi-refresh-automation-boundary.md`

Inspect implementation:

- `packages/types/src/index.ts`
- `packages/types/src/contracts.spec.ts`
- `packages/types/package.json`
- `apps/api/package.json`
- `apps/api/src/modules/analytics/kpi.metric-keys.ts`
- `apps/api/src/modules/analytics/kpi-read.dto.ts`
- `apps/api/tests/unit/kpi-read-contract.spec.ts`
- `apps/worker/package.json`
- `apps/worker/src/jobs/kpi-recompute.processor.ts`
- `apps/worker/src/queues/queue.contracts.ts`
- `apps/worker/tests/unit/worker.spec.ts`
- `tsconfig.base.json`
- `pnpm-workspace.yaml`

## Scope

Implement only shared contract alignment for accepted KPI constants.

Allowed changes:

- add a narrow analytics/KPI contract module under `packages/types/src/`
- export the new shared contract from `packages/types/src/index.ts`
- add or update focused `packages/types` unit tests
- update API KPI metric-key contract code to consume the shared contract
- update API KPI read contract tests only where needed to prove shared contract usage
- update worker KPI refresh boundary code to consume shared metric, event, queue, and job constants
- update worker unit tests only where needed to prove shared contract usage
- add minimal workspace package dependencies to API/worker package manifests only if required by existing repo import patterns
- update lockfile only if package manifest changes require it

Do not change:

- Prisma schema or migrations
- analytics read repositories or SQL behavior
- KPI read endpoint paths or response semantics
- KPI refresh runner implementation beyond shared constant imports
- read-model write logic
- source-domain modules
- department plan mutation surfaces
- web/UI code
- Telegram/MAX provider code
- broad notification routing
- reconciliation resolution workflow

## Accepted Contracts To Preserve

### KPI / Analytics

Already accepted:

- KPI is a derived/read layer and must not become a source of truth.
- Live KPI updates are asynchronous.
- Live KPI is read from aggregates, precomputed counters, materialized read models, or cache.
- User dashboard KPI must not execute heavy runtime JOINs across transactional source-domain tables.
- Snapshot KPI is fixed for a period and must not be silently rewritten backward.
- Department plans are manual plan records and remain separate from factual KPI aggregates.
- Factual KPI values are derived from source-of-truth domains.
- KPI screens and KPI automation cannot mutate source-domain facts.

Accepted analytics tables:

- `analytics.live_kpi_metrics`
- `analytics.snapshot_kpi_metrics`
- `analytics.department_plans`

Accepted read endpoints:

- `GET /kpi/live`
- `GET /kpi/snapshots`
- `GET /kpi/department-plans`

Accepted event contract:

- event type: `kpi.live_aggregate_refreshed`
- minimal payload: `metricKey`, `period`, `refreshedAt`

Accepted worker/queue baseline:

- Redis + BullMQ is the v1 async baseline.
- `apps/worker` is the background worker app.
- Existing worker queue contract key `kpi` resolves to default queue name `analytics.kpi`.
- KPI refresh worker job name is `kpi.live-aggregate.refresh`.
- Worker jobs may process queued/delayed work but must not bypass API/domain rules.

### Accepted Metric Keys

Use only the accepted executive metric keys already enforced by Stage 8A/8B:

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

Do not add any other metric key.
Do not add KPI formulas.

## Required Behavior

### Shared Contract

Add a shared KPI contract in `packages/types` for repo-wide constants and types that are already accepted.

The shared contract should include only accepted constants and types, such as:

- accepted KPI metric key tuple/list
- accepted KPI metric key type
- optional pure helper for checking whether a string is an accepted KPI metric key
- KPI refresh queue key `kpi`
- KPI refresh queue default name `analytics.kpi`
- KPI refresh job name `kpi.live-aggregate.refresh`
- KPI live aggregate refreshed event type `kpi.live_aggregate_refreshed`
- minimal event payload type containing `metricKey`, `period`, and `refreshedAt`

Keep naming consistent with existing repo conventions. Do not add formula definitions, ownership rules, display labels, role visibility matrices, scheduler policies, retry policies, or read-model write semantics.

### API Alignment

The API analytics read contract must consume the shared accepted metric list/type instead of owning a divergent hard-coded source.

The API must continue to:

- expose only read endpoints already accepted by docs
- validate `metricKey` against the accepted shared list
- reject unsupported metric keys
- read only from accepted analytics read-model tables
- avoid source-domain calculations and heavy runtime JOINs
- avoid department plan mutations

Do not make the API enqueue KPI refresh jobs in this task. If API queue production would be needed to use shared queue/job constants in runtime code, stop and report that producer behavior is a later accepted task.

### Worker Alignment

The worker KPI refresh boundary must consume the shared accepted metric list, event type, queue key, queue default name, and job name instead of owning divergent constants.

The worker must continue to:

- validate only accepted KPI metric keys
- require the existing explicit idempotency boundary
- delegate refresh work to the injected runner boundary
- return a refresh acknowledgement compatible with `kpi.live_aggregate_refreshed`
- avoid KPI formulas and read-model writes
- avoid source-domain mutations
- avoid API module imports, unsafe internal HTTP calls, Telegram/MAX provider delivery, and broad notification routing

Do not implement a real refresh runner or persistence adapter in this task.

### Import Boundary

API and worker may depend on the shared `@sanmarino/types` package.

Do not:

- import `apps/api` code into `apps/worker`
- import `apps/worker` code into `apps/api`
- introduce cross-app path aliases
- add a new package outside the accepted monorepo structure
- change module/build configuration broadly unless the current repo cannot consume `packages/types` safely

If CommonJS/ESM or package export constraints prevent clean shared contract consumption without broad build-system changes, stop and report the exact blocker.

## Tests Required

Add or update focused tests proving:

- `packages/types` exports the accepted KPI metric key list exactly as accepted
- `packages/types` exports the KPI event type `kpi.live_aggregate_refreshed`
- `packages/types` exports the KPI queue key/default name/job name contract
- API KPI metric validation uses the shared accepted metric list
- API still rejects unsupported metric keys
- worker KPI refresh metric validation uses the shared accepted metric list
- worker KPI refresh job contract uses the shared queue key/job name
- worker queue contract default for `kpi` remains `analytics.kpi`
- API and worker do not retain divergent hard-coded accepted metric lists
- worker processor remains isolated from API imports, HTTP calls, Telegram/MAX providers, and notification routing

Prefer fast unit/contract tests. Do not add e2e or UI tests.

## Explicit Non-Scope

Do not implement:

- KPI formulas or calculators
- source-domain event-to-metric mapping
- read-model writes to `analytics.live_kpi_metrics` or `analytics.snapshot_kpi_metrics`
- scheduler/producer behavior for KPI refresh jobs
- new metric keys
- metric definitions editor
- analytics facts platform beyond the accepted MVP read layer
- `POST /kpi/department-plans`
- `PATCH /kpi/department-plans/{planId}`
- department plan ownership or permission workflows
- broad dashboard UI
- reporting UI
- heavy runtime JOIN KPI endpoints
- reconciliation resolution workflow
- marking reconciliation reports resolved
- Telegram/MAX provider delivery
- generic notification routing
- external payment model realignment
- a new queue/broker beyond Redis + BullMQ
- source-domain mutations from KPI/reporting/automation

KPI remains a derived/read layer and cannot mutate CRM, Orders, Inventory, Payments, Logistics, Finance, Returns, Audit, or Reconciliation facts.

## Verification Commands

Run:

```powershell
git status --short
pnpm --filter @sanmarino/types test:unit
pnpm --filter @sanmarino/api exec vitest run tests/unit/kpi-read-contract.spec.ts
pnpm --filter @sanmarino/worker exec vitest run tests/unit/worker.spec.ts
pnpm --filter @sanmarino/api test:unit
pnpm --filter @sanmarino/worker test:unit
pnpm typecheck
git diff --check
```

If package manifests or lockfile are changed, inspect the diff and report that only minimal workspace dependency alignment was added.

Do not run broad UI/e2e tests unless this task unexpectedly touches UI code. If UI code appears necessary, stop and report the scope conflict instead.

## Stop Conditions

Stop and report instead of coding if:

- the working tree contains unrelated dirty changes
- Stage 8A analytics read-model baseline is missing or incomplete
- Stage 8B KPI refresh automation boundary is missing or incomplete
- accepted docs conflict on KPI being derived/read-only
- accepted docs and current API/worker metric lists disagree
- current worker queue contract is not `kpi -> analytics.kpi`
- current worker KPI refresh job contract is not `kpi.live-aggregate.refresh`
- current event contract is not `kpi.live_aggregate_refreshed`
- moving constants would require adding KPI formulas or metric calculations
- moving constants would require read-model writes
- moving constants would require source-domain event-to-metric mapping
- moving constants would require department plan mutations or ownership rules
- moving constants would require heavy runtime JOINs across transactional domains
- moving constants would require API module imports into the worker
- moving constants would require worker module imports into the API
- moving constants would require unauthenticated internal HTTP calls between worker and API
- moving constants would require Telegram/MAX provider delivery or broad notification routing
- moving constants would require reconciliation resolution workflow
- moving constants would require external payment model realignment
- module/package constraints prevent clean `packages/types` consumption without broad build-system refactoring
- repo already contains a complete shared KPI metric/event/queue contract and only verification is needed

## Required Report

Return:

```text
1. changed_files
2. what_done
3. tests_run
4. open_risks
5. ready_to_commit: yes/no
```
