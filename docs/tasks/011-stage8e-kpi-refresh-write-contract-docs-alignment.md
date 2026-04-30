# Task 011: Stage 8E - KPI Refresh Write Contract Docs Alignment

## Role

Docs-alignment task.
Do not change code in this task.

Recommended window title:

`Stage 8E - KPI Refresh Write Contract Docs Alignment`

## Goal

Align accepted docs so a later implementation task can safely persist KPI refresh results into the analytics read layer without inventing domain behavior in code.

This task must define the narrow write contract for refreshing `analytics.live_kpi_metrics` and decide whether the next Stage 8 slice can be implementation.

The task must:

- define the accepted KPI refresh write target semantics for `analytics.live_kpi_metrics`
- define accepted refresh inputs: `metricKey`, `period`, `scopeType`, `scopeId`, `refreshedAt`, `idempotencyKey`
- define period mapping to `as_of` / `period_start` / `period_end` where applicable
- define durable idempotency expectations for worker refresh writes
- define transaction and outbox behavior for `kpi.live_aggregate_refreshed`
- explicitly keep `metric_value` source formulas and source-event mapping as `TBD` unless accepted docs already define them
- decide whether the next task after docs alignment can be implementation

Do not implement the refresh runner, persistence adapter, formulas, source-domain mapping, queues, schedulers, or read-model writes in this task.

## Starting Point

Expected project state:

- Stage 8A `Analytics Read-Model Contract Baseline` is complete.
- Stage 8B `KPI Refresh Automation Boundary` is complete.
- Stage 8C `KPI Shared Metric Contract Alignment` is complete.
- Stage 8D `KPI Refresh Runner Contract Preflight` concluded that docs alignment is required before implementation.
- Prisma schema contains the accepted analytics models:
  - `AnalyticsLiveKpiMetric`
  - `AnalyticsSnapshotKpiMetric`
  - `AnalyticsDepartmentPlan`
- API exposes only the accepted KPI read endpoints:
  - `GET /kpi/live`
  - `GET /kpi/snapshots`
  - `GET /kpi/department-plans`
- `packages/types` exports the shared accepted KPI metric/event/queue/job contract.
- Worker KPI refresh boundary uses:
  - queue key: `kpi`
  - default queue name: `analytics.kpi`
  - job name: `kpi.live-aggregate.refresh`
  - event type: `kpi.live_aggregate_refreshed`
  - minimal event payload fields: `metricKey`, `period`, `refreshedAt`
- Worker KPI refresh processor validates accepted metric keys and delegates to an injected runner boundary.
- Real KPI formulas, source-domain event-to-metric mapping, and analytics write persistence are not implemented.

If the local repo does not match this state, stop and report the mismatch before editing docs.

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
- `docs/tasks/010-stage8d-kpi-refresh-runner-contract-preflight.md`

Inspect implementation read-only:

- `packages/types/src/analytics/kpi.ts`
- `apps/api/prisma/schema.prisma`
- `apps/api/src/modules/analytics/`
- `apps/api/src/common/persistence/idempotency-persistence.contract.ts`
- `apps/api/src/common/persistence/outbox-persistence.contract.ts`
- `apps/worker/src/jobs/kpi-recompute.processor.ts`
- `apps/worker/src/queues/queue.contracts.ts`
- `apps/worker/tests/unit/worker.spec.ts`

## Scope

Align docs only.

Allowed docs changes:

- `docs/09-kpi-model.md`
- `docs/14-api-contracts.md`
- `docs/15-event-model.md`
- `docs/21-testing-strategy.md`
- `docs/22-qa-release-checklist.md`
- `docs/32-physical-database-schema.md`
- optionally `docs/16-implementation-roadmap.md` or `docs/24-mvp-scope-v1.md` only if needed to keep roadmap/MVP wording consistent

Do not change:

- application code
- Prisma schema
- migrations
- tests
- package manifests
- lockfile
- `packages/types`
- API modules
- worker modules
- web/UI files

If the docs cannot be aligned without inventing formulas, source-domain mappings, or business rules, stop and report the exact missing decision.

## Required Docs Alignment

### 1. Refresh Write Target

Define that the first accepted refresh write target is:

- `analytics.live_kpi_metrics`

Clarify that this docs-alignment task does not authorize writes to:

- `analytics.snapshot_kpi_metrics`
- `analytics.department_plans`

Snapshot closing behavior remains separate unless accepted docs already define it explicitly.

### 2. Live KPI Write Operation

Define whether live refresh writes use one of these semantics:

- upsert by the accepted live uniqueness key `(metric_code, scope_type, scope_id)`
- update-only if row already exists
- insert-only if row does not exist
- `TBD`

Use only accepted docs and current repo state. If choosing one requires a new business rule, mark it `TBD` and stop before recommending implementation.

### 3. Accepted Refresh Inputs

Define the accepted input contract for a future worker persistence adapter:

- `metricKey`
- `period`
- `scopeType`
- `scopeId`
- `refreshedAt`
- `idempotencyKey`

Clarify which inputs are required, nullable, or `TBD`.

Input constraints:

- `metricKey` must be one of the accepted shared KPI metric keys.
- `idempotencyKey` is required for the write boundary.
- `refreshedAt` must be an accepted timestamp input.
- `scopeType` and `scopeId` must be defined without inventing unaccepted dimensions. If only global scope is safe, state the exact global scope convention or leave scope behavior `TBD`.

### 4. Period Mapping

Define how the refresh input `period` maps to live/snapshot storage fields.

At minimum decide:

- whether live refresh writes store `as_of = refreshedAt`
- whether `period` is only an event/idempotency grouping value for live KPI
- whether `period` maps to `period_start` / `period_end` only for snapshot KPI and therefore remains out of scope for live refresh writes
- whether any part is `TBD`

Do not invent calendar rules, fiscal calendars, timezone rules, or period parsing rules unless already accepted in docs.

### 5. Metric Value And Payload

Explicitly keep these as `TBD` unless accepted docs already define them:

- source of `metric_value`
- metric formulas
- source-domain event-to-metric mapping
- calculation ownership per metric
- `metric_payload` shape

This task may define that a future persistence adapter can accept an already-computed `metricValue` only if docs also state that the adapter must not calculate it. If accepted docs do not allow even that input yet, leave `metricValue` as `TBD`.

Do not add formulas, metric definitions, owner-domain maps, or source-event mappings.

### 6. Durable Idempotency

Define durable idempotency expectations for KPI refresh writes.

At minimum decide:

- whether worker refresh writes use `system.idempotency_records`
- the accepted idempotency `scope` value or `TBD`
- whether repeated `idempotencyKey` with the same normalized payload returns the prior result
- whether repeated `idempotencyKey` with different normalized payload is a conflict
- which fields are included in the normalized request hash
- how failed/in-progress records should be treated, or mark as `TBD`

Do not invent a retry coordination policy if accepted docs do not define it. It is acceptable to leave retry coordination as `TBD`.

### 7. Transaction Boundary

Define the expected transaction boundary for a future refresh write implementation.

At minimum decide whether the following must be one DB transaction:

- create/read idempotency record
- write `analytics.live_kpi_metrics`
- enqueue `system.outbox_events` record for `kpi.live_aggregate_refreshed`
- mark idempotency record completed

If accepted docs do not define this enough, mark the transaction contract `TBD` and do not recommend implementation.

### 8. Outbox And Event Behavior

Define behavior for `kpi.live_aggregate_refreshed`.

At minimum decide:

- whether future refresh writes must enqueue `system.outbox_events`
- event type: `kpi.live_aggregate_refreshed`
- minimal payload: `metricKey`, `period`, `refreshedAt`
- whether `scopeType`, `scopeId`, and `idempotencyKey` are allowed in payload metadata or must stay out of the event payload
- aggregate type/id convention for outbox record, or `TBD`

Do not add Telegram/MAX provider delivery or broad notification routing.

### 9. Implementation Readiness Decision

At the end of the docs alignment, decide one of:

- `implementation_ready: yes`
- `implementation_ready: no`

`implementation_ready: yes` is allowed only if docs define:

- live write target
- live write operation
- required inputs
- scope behavior
- period/as-of behavior
- durable idempotency behavior
- transaction boundary
- outbox/event behavior
- explicit rule that metric calculation remains outside the persistence adapter

If any of these remain `TBD`, recommend another docs task instead of implementation.

## Explicit Non-Scope

Do not implement or define:

- KPI formulas or calculators
- source-domain event-to-metric mapping
- source-domain owner map per metric
- new KPI metric keys
- metric definitions editor
- snapshot closing behavior unless already fully accepted
- `analytics.snapshot_kpi_metrics` writes
- `analytics.department_plans` mutations
- scheduler/producer behavior for KPI refresh jobs
- API enqueue behavior
- reporting UI
- dashboard UI
- reconciliation resolution workflow
- external payment model realignment
- Telegram/MAX provider delivery
- broad notification routing
- new queue/broker beyond Redis + BullMQ
- source-domain mutations from KPI/reporting/automation

KPI remains a derived/read layer and cannot mutate CRM, Orders, Inventory, Payments, Logistics, Finance, Returns, Audit, or Reconciliation facts.

## Verification Commands

Run:

```powershell
git status --short
Select-String -Path docs\09-kpi-model.md,docs\14-api-contracts.md,docs\15-event-model.md,docs\21-testing-strategy.md,docs\22-qa-release-checklist.md,docs\32-physical-database-schema.md -Pattern "KPI|kpi|analytics.live_kpi_metrics|metric_value|metric_payload|as_of|period|scope|idempotency|outbox|kpi.live_aggregate_refreshed|formula|source-domain event-to-metric|TBD"
Select-String -Path packages\types\src\analytics\kpi.ts,apps\worker\src\jobs\kpi-recompute.processor.ts,apps\api\prisma\schema.prisma,apps\api\src\common\persistence\idempotency-persistence.contract.ts,apps\api\src\common\persistence\outbox-persistence.contract.ts -Pattern "metricKey|period|refreshedAt|idempotencyKey|scope|metricValue|metricPayload|asOf|live_kpi_metrics|idempotency_records|outbox_events|kpi.live_aggregate_refreshed"
git diff -- docs\09-kpi-model.md docs\14-api-contracts.md docs\15-event-model.md docs\21-testing-strategy.md docs\22-qa-release-checklist.md docs\32-physical-database-schema.md docs\16-implementation-roadmap.md docs\24-mvp-scope-v1.md
git diff --check
git status --short
```

Do not run broad tests unless this task unexpectedly changes code. If code changes appear necessary, stop and report the scope conflict.

## Stop Conditions

Stop and report instead of editing docs if:

- working tree contains unexpected dirty changes
- accepted docs conflict on KPI being derived/read-only
- Stage 8A analytics read-model baseline is missing or incomplete
- Stage 8B KPI refresh automation boundary is missing or incomplete
- Stage 8C shared KPI contract alignment is missing or incomplete
- Stage 8D preflight has not been completed
- docs alignment would require KPI formulas or metric calculations
- docs alignment would require source-domain event-to-metric mapping
- docs alignment would require adding metric keys outside accepted docs
- docs alignment would require department plan mutations or ownership rules
- docs alignment would require heavy runtime JOINs across transactional domains
- docs alignment would require API module imports into the worker
- docs alignment would require unauthenticated internal HTTP calls between worker and API
- docs alignment would require Telegram/MAX provider delivery or broad notification routing
- docs alignment would require reconciliation resolution workflow
- docs alignment would require external payment model realignment
- docs alignment would require source-domain mutations from KPI/reporting/automation

## Required Report

Return:

```text
1. changed_files
2. what_done
3. tests_run
4. open_risks
5. implementation_ready: yes/no
6. recommended_next_task
7. ready_to_commit: yes/no
```
