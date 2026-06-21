# Task 008: Stage 8B - KPI Refresh Automation Boundary

## Role

Implementation task.

Recommended window title:

`Stage 8B - KPI Refresh Automation Boundary`

## Goal

Implement the next narrow Stage 8 slice for the `KPI / Reporting / Automation layer`.

This task must add only a safe worker-side automation contract for refreshing accepted analytics read models through the existing KPI queue boundary:

- use the existing worker `kpi` queue contract with default queue name `analytics.kpi`
- keep KPI refresh asynchronous and non-mutating toward source domains
- define a narrow worker job payload/runner boundary only where accepted docs and repo state are already concrete
- add focused tests for worker queue contract, idempotency handling, and source-domain boundary behavior
- stop if implementation would require KPI formulas, new metric keys, source-domain mappings, scheduler policy, provider routing, or unsafe API/worker coupling

Do not implement KPI calculations, department plan mutations, dashboards, Telegram/MAX provider delivery, or broad notification routing.

## Starting Point

Expected project state:

- Stage 8A `Analytics Read-Model Contract Baseline` is complete.
- `docs/tasks/007-stage8a-analytics-read-model-contract-baseline.md` exists and has been executed.
- Prisma schema contains the accepted analytics models:
  - `AnalyticsLiveKpiMetric`
  - `AnalyticsSnapshotKpiMetric`
  - `AnalyticsDepartmentPlan`
- API exposes only the accepted read endpoints:
  - `GET /kpi/live`
  - `GET /kpi/snapshots`
  - `GET /kpi/department-plans`
- Department plan mutation endpoints are still not implemented.
- Worker queue contracts already include:
  - key: `kpi`
  - env key: `WORKER_KPI_QUEUE`
  - default name: `analytics.kpi`
- `apps/worker/src/jobs/kpi-recompute.processor.ts` is still placeholder-only.

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

Inspect implementation:

- `apps/api/prisma/schema.prisma`
- `apps/api/src/modules/analytics/`
- `apps/api/tests/unit/kpi-read-contract.spec.ts`
- `apps/api/tests/unit/kpi-read.use-cases.spec.ts`
- `apps/worker/src/jobs/kpi-recompute.processor.ts`
- `apps/worker/src/jobs/reconciliation.processor.ts`
- `apps/worker/src/queues/queue.contracts.ts`
- `apps/worker/src/queues/queue.names.ts`
- `apps/worker/src/queues/queue.factory.ts`
- `apps/worker/src/workers/worker.bootstrap.ts`
- `apps/worker/tests/unit/worker.spec.ts`

## Scope

Implement only the worker-side KPI refresh automation boundary.

Allowed changes:

- add or align a KPI refresh job contract in `apps/worker/src/jobs/kpi-recompute.processor.ts`
- add narrow worker tests, preferably in `apps/worker/tests/unit/worker.spec.ts` or a focused KPI worker unit test
- touch `apps/worker/src/queues/queue.contracts.ts` only if the existing `kpi` queue contract is missing or misaligned with repo state
- update exports/imports only where needed for tests or worker-local contract access

Do not change:

- Prisma schema or migrations
- API KPI read endpoints
- API transactional source-domain modules
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

Accepted analytics tables already established by Stage 8A:

- `analytics.live_kpi_metrics`
- `analytics.snapshot_kpi_metrics`
- `analytics.department_plans`

Accepted event contract:

- `kpi.live_aggregate_refreshed`
- minimal payload: `metricKey`, `period`, `refreshedAt`

Accepted worker/queue baseline:

- Redis + BullMQ is the v1 async baseline.
- `apps/worker` is the background worker app.
- Existing worker queue contract key `kpi` resolves to default queue name `analytics.kpi`.
- Worker jobs may process queued/delayed work but must not bypass API/domain rules.

### Accepted Metric Keys

Use only the accepted executive metric keys already enforced by Stage 8A:

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

### Worker Contract

Add a minimal KPI refresh worker contract only around the existing `kpi` queue boundary.

The contract must:

- bind to worker queue key `kpi`, whose repo-default queue name is `analytics.kpi`
- accept only supported metric keys
- preserve an explicit idempotency boundary
- normalize/validate only fields already accepted by docs or already present in Stage 8A contract code
- delegate actual refresh work to an injected worker-local runner/port
- return only a refresh acknowledgement compatible with accepted `kpi.live_aggregate_refreshed` semantics

If a job payload shape cannot be defined from accepted docs without inventing refresh behavior, stop and report the missing contract instead of guessing.

### Idempotency Boundary

The worker contract must make repeated delivery safe at the boundary.

Allowed implementation choices:

- require an explicit `idempotencyKey` on the job payload; or
- derive a deterministic technical idempotency key only if all inputs used for derivation are already accepted in docs or repo contracts.

Do not invent a business idempotency rule that changes domain semantics.
Do not write idempotency records unless an accepted repository/worker persistence boundary already exists for this worker slice.

### Runner Boundary

The KPI processor may define a narrow injected runner interface.

The runner boundary must:

- receive a normalized refresh command
- be invoked once per valid job processing call
- be responsible for future read-model refresh implementation outside this task
- not be implemented with KPI formulas in this task
- not import Nest API modules or transactional API services into `apps/worker`
- not call unauthenticated internal HTTP endpoints
- not write CRM, Orders, Inventory, Payments, Logistics, Finance, Returns, Audit, or Reconciliation source-domain facts

If a real refresh implementation would require source-domain formulas or source-event mapping, keep the runner as a contract and report that calculation wiring is blocked for a later accepted task.

### Boundary Tests

Add focused tests proving:

- worker queue contracts still include `kpi -> analytics.kpi`
- KPI refresh job contract uses queue key `kpi`
- unsupported metric keys are rejected before runner execution
- missing/invalid idempotency input is rejected or normalized according to the implemented contract
- repeated equivalent payloads produce the same idempotency boundary behavior
- valid payload delegates to the injected runner exactly once
- runner failures surface retryable diagnostic context without mutating source domains
- processor code does not depend on API modules, HTTP calls, Telegram/MAX providers, or notification routing

Keep tests worker-local and fast.

## Explicit Non-Scope

Do not implement:

- KPI formulas or calculators
- source-domain event-to-metric mapping
- new metric keys
- metric definitions editor
- analytics facts platform beyond the accepted MVP read layer
- writes to `analytics.live_kpi_metrics` or `analytics.snapshot_kpi_metrics` unless docs/repo state already define the exact refresh operation safely
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

KPI remains a derived/read layer and cannot mutate source-domain facts.

## Verification Commands

Run:

```powershell
git status --short
pnpm --filter @sanmarino/worker exec vitest run tests/unit/worker.spec.ts
pnpm --filter @sanmarino/worker test:unit
pnpm typecheck
git diff --check
```

If a separate KPI worker unit test is added, run it explicitly before the full worker unit suite.

Do not run broad API tests unless this task unexpectedly touches API code. If API code appears necessary, stop and report the scope conflict instead.

## Stop Conditions

Stop and report instead of coding if:

- the working tree contains unrelated dirty changes
- Stage 8A analytics read-model baseline is missing or incomplete
- accepted docs conflict on KPI being derived/read-only
- the existing `kpi` queue contract is absent and adding one would require a broader queue design change
- accepted docs do not define enough refresh payload behavior to create a narrow worker boundary
- implementation would require KPI formulas or metric calculations
- implementation would require adding metric keys outside accepted docs
- implementation would require source-domain event-to-metric mapping
- implementation would require department plan mutations or ownership rules
- implementation would require heavy runtime JOINs across transactional domains
- implementation would require API module imports into the worker
- implementation would require unauthenticated internal HTTP calls between worker and API
- implementation would require Telegram/MAX provider delivery or broad notification routing
- implementation would require reconciliation resolution workflow
- implementation would require external payment model realignment
- implementation would require workers to bypass state machine, idempotency, permissions, audit, quarantine, cash-basis, or ReturnRequest rules
- repo already contains a complete KPI refresh automation boundary and only verification is needed

## Required Report

Return:

```text
1. changed_files
2. what_done
3. tests_run
4. open_risks
5. ready_to_commit: yes/no
```
