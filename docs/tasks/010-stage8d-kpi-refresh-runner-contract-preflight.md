# Task 010: Stage 8D - KPI Refresh Runner Contract Preflight

## Role

Planning/control task.
Do not implement code or edit docs in this task.

Recommended window title:

`Stage 8D - KPI Refresh Runner Contract Preflight`

## Goal

Verify whether accepted docs and current repo state define enough for a future KPI refresh runner persistence/write implementation.

This task must:

- inspect the accepted KPI refresh, analytics read-model, event, queue, and idempotency contracts
- identify which refresh write inputs, outputs, and idempotency semantics are already concrete
- decide whether the next Stage 8 slice can be implementation or must be docs alignment
- stop if implementing persistence would require inventing KPI formulas, metric values, source-event mapping, or write semantics

Do not implement the KPI refresh runner, persistence adapter, formulas, source-domain mapping, or read-model writes in this task.

## Starting Point

Expected project state:

- Stage 8A `Analytics Read-Model Contract Baseline` is complete.
- Stage 8B `KPI Refresh Automation Boundary` is complete.
- Stage 8C `KPI Shared Metric Contract Alignment` is complete.
- Prisma schema contains the accepted analytics models:
  - `AnalyticsLiveKpiMetric`
  - `AnalyticsSnapshotKpiMetric`
  - `AnalyticsDepartmentPlan`
- API exposes only the accepted KPI read endpoints:
  - `GET /kpi/live`
  - `GET /kpi/snapshots`
  - `GET /kpi/department-plans`
- Department plan mutation endpoints are still not implemented.
- `packages/types` exports the shared accepted KPI metric/event/queue/job contract.
- Worker KPI refresh boundary uses:
  - queue key: `kpi`
  - default queue name: `analytics.kpi`
  - job name: `kpi.live-aggregate.refresh`
  - event type: `kpi.live_aggregate_refreshed`
  - minimal event payload fields: `metricKey`, `period`, `refreshedAt`
- Worker KPI refresh processor validates accepted metric keys and delegates to an injected runner boundary.
- Real KPI formulas, source-domain event-to-metric mapping, and analytics write persistence are not implemented.

If the local repo does not match this state, stop and report the mismatch.

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
- `docs/23-tech-baseline-and-decision-log.md`
- `docs/24-mvp-scope-v1.md`
- `docs/25-development-standards.md`
- `docs/28-approved-tech-stack.md`
- `docs/32-physical-database-schema.md`
- `docs/38-mvp-v1-functional-realignment.md`
- `docs/tasks/006-stage8-kpi-reporting-automation-entry.md`
- `docs/tasks/007-stage8a-analytics-read-model-contract-baseline.md`
- `docs/tasks/008-stage8b-kpi-refresh-automation-boundary.md`
- `docs/tasks/009-stage8c-kpi-shared-metric-contract-alignment.md`

Inspect implementation read-only:

- `packages/types/src/analytics/kpi.ts`
- `packages/types/src/index.ts`
- `packages/types/src/contracts.spec.ts`
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/`
- `apps/api/src/modules/analytics/`
- `apps/api/tests/unit/kpi-read-contract.spec.ts`
- `apps/api/tests/unit/kpi-read.use-cases.spec.ts`
- `apps/api/src/common/persistence/idempotency-persistence.contract.ts`
- `apps/api/src/common/persistence/outbox-persistence.contract.ts`
- `apps/worker/src/jobs/kpi-recompute.processor.ts`
- `apps/worker/src/queues/queue.contracts.ts`
- `apps/worker/src/queues/queue.names.ts`
- `apps/worker/src/queues/queue.factory.ts`
- `apps/worker/src/workers/worker.bootstrap.ts`
- `apps/worker/tests/unit/worker.spec.ts`

## Scope

Produce a read-only Stage 8D preflight report only.

The report must decide:

- what is already accepted for KPI refresh persistence/write behavior
- what is accepted only as a schema or boundary contract, not as implementation semantics
- what required inputs and outputs are still missing or unclear
- what idempotency behavior is already accepted for worker refresh writes
- whether the next step can be a narrow implementation task or must be docs alignment
- the first safe next task name and scope

Do not:

- change code
- change docs
- add tests
- add Prisma models or migrations
- implement KPI formulas, calculators, or metric definitions
- create or infer `metric_value`
- create or infer source-domain event-to-metric mapping
- implement writes to `analytics.live_kpi_metrics` or `analytics.snapshot_kpi_metrics`
- implement worker idempotency persistence
- implement outbox event emission
- implement API queue producer behavior
- implement schedulers
- implement department plan mutations
- implement notification/provider delivery

## Accepted Contracts To Verify

### KPI / Analytics Discipline

Already accepted:

- KPI is a derived/read layer and must not become a source of truth.
- Factual KPI values are derived from source-of-truth domains.
- KPI screens and KPI automation cannot mutate source-domain facts.
- Live KPI updates are asynchronous.
- Live KPI is read from aggregates, precomputed counters, materialized read models, or cache.
- User dashboard KPI must not execute heavy runtime JOINs across transactional source-domain tables.
- Snapshot KPI is fixed for a period and must not be silently rewritten backward.
- Department plans are manual plan records and remain separate from factual KPI aggregates.

### Accepted Analytics Tables

Already accepted:

- `analytics.live_kpi_metrics`
- `analytics.snapshot_kpi_metrics`
- `analytics.department_plans`

For refresh write preflight, verify the accepted columns and uniqueness rules:

- `analytics.live_kpi_metrics`
  - `metric_code`
  - `scope_type`
  - `scope_id`
  - `metric_value`
  - `metric_payload`
  - `as_of`
  - unique `(metric_code, scope_type, scope_id)`
- `analytics.snapshot_kpi_metrics`
  - `metric_code`
  - `period_type`
  - `period_start`
  - `period_end`
  - `scope_type`
  - `scope_id`
  - `metric_value`
  - `metric_payload`
  - unique `(metric_code, period_type, period_start, period_end, scope_type, scope_id)`
- `analytics.department_plans`
  - manual plan layer only
  - not a factual KPI write target for refresh runner

Schema existence does not by itself define refresh formulas, source mappings, metric values, or safe write semantics.

### Accepted Shared Contract

Verify the shared contract exposes only accepted constants and types:

- accepted KPI metric key list
- `AcceptedKpiMetricKey`
- KPI refresh queue key `kpi`
- KPI refresh queue default name `analytics.kpi`
- KPI refresh job name `kpi.live-aggregate.refresh`
- KPI live aggregate refreshed event type `kpi.live_aggregate_refreshed`
- minimal event payload type containing `metricKey`, `period`, and `refreshedAt`

Do not add or assume formula definitions, metric display rules, owner domains, scheduler policy, retry policy, or write semantics from this shared contract.

### Accepted Worker Boundary

Verify the current worker contract:

- accepts only supported metric keys
- requires or normalizes an explicit idempotency boundary
- accepts `period`
- accepts `refreshedAt`
- delegates actual refresh work to an injected runner/port
- returns an acknowledgement compatible with `kpi.live_aggregate_refreshed`
- does not import API modules
- does not call internal HTTP endpoints
- does not call Telegram/MAX providers or notification routing
- does not mutate source-domain facts

Do not treat the current injected runner interface as an accepted persistence implementation.

## Required Preflight Questions

Answer these from accepted docs and repo state only:

1. Which exact analytics table is the refresh runner allowed to write first: live KPI only, snapshot KPI, both, or neither yet?
2. Is the operation defined as insert, update, upsert, append-only snapshot insert, or TBD?
3. Which unique key must control idempotent live refresh writes?
4. Does accepted state define how `period` maps to `as_of`, `period_start`, and `period_end`, or is that still TBD?
5. Does accepted state define `scope_type` and `scope_id` inputs for refresh jobs, or are global-only/default scopes still TBD?
6. Does accepted state define where `metric_value` comes from without inventing formulas or source mappings?
7. Does accepted state define whether `metric_payload` is allowed, required, or omitted for refresh writes?
8. Does accepted state define whether worker refresh writes must emit `kpi.live_aggregate_refreshed` through `system.outbox_events`, return it only as an acknowledgement, or leave emission TBD?
9. Does accepted state define how worker idempotency should persist across process retries: `system.idempotency_records`, BullMQ job id, table unique constraints, or another accepted mechanism?
10. Does accepted state define the transaction boundary between idempotency record, analytics write, and optional outbox event?
11. Does accepted state define retry behavior after partial persistence failure?
12. Does accepted state define enough to implement without reading transactional source-domain tables through heavy runtime JOINs?

If any answer requires a new formula, new metric, new source-event mapping, new write behavior, or new domain rule, mark it as `TBD` and recommend docs alignment instead of implementation.

## Implementation Gate

The next task may be an implementation task only if this preflight verifies all of the following from accepted docs and current repo state:

- exact write target table is accepted
- exact write operation is accepted
- required write inputs are accepted
- `metric_value` source is accepted without formulas being invented in code
- `scope_type` and `scope_id` behavior is accepted
- `period` and timestamp mapping is accepted
- idempotency persistence semantics are accepted
- transaction boundary is accepted
- event/outbox behavior is accepted or explicitly not needed for the first implementation slice
- worker remains isolated from API imports and internal HTTP calls
- implementation can avoid heavy runtime JOINs and source-domain mutations

If any item is missing, the next task must be a docs-alignment task, not code.

## Possible Next Task Outcomes

If implementation is allowed, recommend a narrow task like:

`011-stage8e-kpi-live-refresh-persistence-adapter.md`

That implementation task must still be limited to persisting already-computed, accepted refresh inputs and must not calculate metrics.

If docs alignment is required, recommend a narrow task like:

`011-stage8e-kpi-refresh-write-contract-docs-alignment.md`

That docs task should define only the missing refresh write contract and must not add formulas or source-domain mappings unless accepted business documentation is explicitly updated first.

## Explicit Non-Scope

Do not implement or design beyond accepted docs:

- KPI formulas or calculators
- metric value computation
- source-domain event-to-metric mapping
- new KPI metric keys
- metric definitions editor
- writes to analytics read models
- snapshot closing behavior
- scheduler/producer behavior for KPI refresh jobs
- API enqueue behavior
- source-domain mutations from KPI/reporting/automation
- heavy runtime JOIN KPI endpoints
- department plan mutation endpoints
- department plan ownership or permission workflows
- reporting UI
- dashboard UI
- reconciliation resolution workflow
- external payment model realignment
- Telegram/MAX provider delivery
- broad notification routing
- new queue/broker beyond Redis + BullMQ

KPI remains a derived/read layer and cannot mutate CRM, Orders, Inventory, Payments, Logistics, Finance, Returns, Audit, or Reconciliation facts.

## Verification Commands

Run:

```powershell
git status --short
Select-String -Path docs\08-architecture-fixes-and-critical-blockers.md,docs\09-kpi-model.md,docs\14-api-contracts.md,docs\15-event-model.md,docs\16-implementation-roadmap.md,docs\21-testing-strategy.md,docs\22-qa-release-checklist.md,docs\24-mvp-scope-v1.md,docs\28-approved-tech-stack.md,docs\32-physical-database-schema.md,docs\38-mvp-v1-functional-realignment.md -Pattern "KPI|kpi|analytics|live_kpi|snapshot_kpi|metric_value|metric_payload|as_of|period|source of truth|source-of-truth|derived|runtime JOIN|idempotency|outbox|BullMQ|Redis|formula|mapping|refresh"
Select-String -Path docs\tasks\006-stage8-kpi-reporting-automation-entry.md,docs\tasks\007-stage8a-analytics-read-model-contract-baseline.md,docs\tasks\008-stage8b-kpi-refresh-automation-boundary.md,docs\tasks\009-stage8c-kpi-shared-metric-contract-alignment.md -Pattern "analytics.kpi|kpi.live-aggregate.refresh|kpi.live_aggregate_refreshed|metricKey|period|refreshedAt|metric_value|idempotency|runner|write|formulas|source-domain event-to-metric|read-model writes"
Select-String -Path packages\types\src\analytics\kpi.ts,apps\worker\src\jobs\kpi-recompute.processor.ts,apps\worker\src\queues\queue.contracts.ts,apps\api\prisma\schema.prisma,apps\api\src\modules\analytics\kpi-read.repository.ts,apps\api\src\common\persistence\idempotency-persistence.contract.ts,apps\api\src\common\persistence\outbox-persistence.contract.ts -Pattern "accepted_kpi_metric_keys|analytics.kpi|kpi.live-aggregate.refresh|kpi.live_aggregate_refreshed|metricKey|period|refreshedAt|idempotencyKey|metricValue|metricPayload|asOf|live_kpi_metrics|snapshot_kpi_metrics|idempotency_records|outbox_events|refreshLiveAggregate"
Get-ChildItem -Path apps\api\src\modules\analytics,apps\worker\src -Recurse -File | Select-String -Pattern "POST|PATCH|refreshLiveAggregate|live_kpi_metrics|snapshot_kpi_metrics|metricValue|metricPayload|http://|https://|telegram|max|notification"
git diff --check
git status --short
```

Do not run broad tests unless this task unexpectedly discovers a changed file or a mismatch that requires targeted verification. If the working tree is dirty at start, stop and report unless the only dirty file is this task file from the current docs-only creation work.

## Stop Conditions

Stop and report instead of recommending an implementation task if:

- working tree contains unexpected dirty changes
- accepted docs conflict on KPI being derived/read-only
- Stage 8A analytics read-model baseline is missing or incomplete
- Stage 8B KPI refresh automation boundary is missing or incomplete
- Stage 8C shared KPI contract alignment is missing or incomplete
- accepted docs do not define exact refresh write target table
- accepted docs do not define insert/update/upsert semantics
- accepted docs do not define required write inputs
- accepted docs do not define how `metric_value` is obtained without formulas or source mappings
- accepted docs do not define `scope_type` / `scope_id` behavior
- accepted docs do not define period/timestamp mapping
- accepted docs do not define idempotency persistence for worker refresh writes
- accepted docs do not define transaction/outbox behavior for refresh writes
- implementation would require KPI formulas or metric calculations
- implementation would require source-domain event-to-metric mapping
- implementation would require adding metric keys outside accepted docs
- implementation would require department plan mutations or ownership rules
- implementation would require heavy runtime JOINs across transactional domains
- implementation would require API module imports into the worker
- implementation would require unauthenticated internal HTTP calls between worker and API
- implementation would require Telegram/MAX provider delivery or broad notification routing
- implementation would require reconciliation resolution workflow
- implementation would require external payment model realignment
- implementation would require source-domain mutations from KPI/reporting/automation

## Required Report

Return:

```text
1. completed_scope
2. accepted_refresh_contracts
3. missing_or_tbd_contracts
4. next_step_decision
5. changed_files
6. what_done
7. tests_run
8. open_risks
9. ready_for_next_step: yes/no
```
