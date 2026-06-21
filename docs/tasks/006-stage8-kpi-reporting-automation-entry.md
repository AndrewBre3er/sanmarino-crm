# Task 006: Stage 8 Entry - KPI Reporting Automation

## Role

Planning/control task.
Do not implement code in this task.

Recommended window title:

`Stage 8 Entry - KPI Reporting Automation`

## Goal

Define the entry scope for Stage 8 `KPI / Reporting / Automation layer` after Stage 7 backend baseline closure.

This task must:

- identify which KPI, reporting, and automation contracts are already accepted
- verify current repo state before any Stage 8 coding
- decide the first safe implementation slice for Stage 8
- keep KPI as a derived/read layer, not a source of truth
- avoid inventing new metrics, statuses, fields, provider rules, or domain processes

## Starting Point

Expected project state:

- Stage 7 `Returns + Reconciliation + Audit hardening` is closed as a backend baseline.
- The next major stage is Stage 8 `KPI / Reporting / Automation layer`.
- Stage 7 deferrable gaps are tracked into target stages instead of reopening Stage 7:
  - live reconciliation worker-to-API transport/scheduler -> Stage 8 automation hardening
  - Telegram/MAX providers and broad notification routing -> MVP integrations / Delta 0 Wave D
  - reconciliation resolution workflow -> Stage 8 reporting/control
  - external payment intake/control realignment -> Delta 0 Wave A before MVP release
  - UI/e2e coverage for returns/reconciliation/corrections -> MVP release hardening
- Current repo may have a worker KPI queue/job placeholder, but KPI runtime, analytics schema models, and KPI API implementation must be verified before coding.

If the local repo does not match this state, stop and report the mismatch before writing any follow-up implementation task.

## Read First

- `README.md`
- `AGENTS.md`
- `.agents/skills/sanmarino-step-runner/SKILL.md`
- `docs/ai/PROJECT_INDEX.md`
- `docs/ai/CONTEXT_BRIEF.md`
- `docs/ai/BUSINESS_RULES.md`
- `docs/ai/CODING_RULES.md`
- `docs/01-system-logic.md`
- `docs/02-domain-map.md`
- `docs/03-entity-catalog.md`
- `docs/05-process-flows.md`
- `docs/06-data-integrity-rules.md`
- `docs/07-roles-and-access.md`
- `docs/08-architecture-fixes-and-critical-blockers.md`
- `docs/09-kpi-model.md`
- `docs/13-database-architecture.md`
- `docs/14-api-contracts.md`
- `docs/15-event-model.md`
- `docs/16-implementation-roadmap.md`
- `docs/17-ui-ux-architecture.md`
- `docs/18-role-based-workspaces.md`
- `docs/19-screen-map-and-core-user-flows.md`
- `docs/20-security-architecture.md`
- `docs/21-testing-strategy.md`
- `docs/22-qa-release-checklist.md`
- `docs/23-tech-baseline-and-decision-log.md`
- `docs/24-mvp-scope-v1.md`
- `docs/25-development-standards.md`
- `docs/26-current-task-codex.md`
- `docs/28-approved-tech-stack.md`
- `docs/30-initial-folder-contracts.md`
- `docs/32-physical-database-schema.md`
- `docs/33-root-repo-files-spec.md`
- `docs/38-mvp-v1-functional-realignment.md`
- `docs/tasks/README.md`
- `docs/tasks/005-stage7-closure-reconciliation-alerts-admin-override.md`

## Inspect Repo State

Read only. Do not edit code.

- `apps/api/prisma/schema.prisma`
- `apps/api/src/app.module.ts`
- `apps/api/src/modules/read-side/`
- `apps/api/src/modules/reconciliation/reconciliation.controller.ts`
- `apps/api/src/modules/reconciliation/reconciliation.service.ts`
- `apps/api/src/modules/finance/finance.service.ts`
- `apps/api/tests/unit/prisma.infra-schema.spec.ts`
- `apps/api/tests/unit/read-side.query-contract.spec.ts`
- `apps/api/tests/unit/read-side.use-cases.spec.ts`
- `apps/worker/src/jobs/kpi-recompute.processor.ts`
- `apps/worker/src/jobs/reconciliation.processor.ts`
- `apps/worker/src/queues/queue.contracts.ts`
- `apps/worker/src/queues/queue.names.ts`
- `apps/worker/src/workers/worker.bootstrap.ts`
- `apps/worker/tests/unit/worker.spec.ts`

## Scope

Produce a Stage 8 entry report only.

The report must decide:

- which accepted docs already define KPI/reporting/automation contracts
- whether current repo state is ready for Stage 8 coding
- what must be verified or aligned before coding
- the first safe Stage 8 implementation slice
- explicit anti-scope for KPI/reporting/automation

Do not:

- change code
- add Prisma models or migrations
- add KPI API controllers/services
- add worker processors beyond inspection
- add tests
- update metrics or formulas
- invent permission rules for plan ownership
- invent notification provider routing

## Accepted Contracts To Verify

### KPI / Analytics

Already accepted contracts:

- KPI is a derived/read layer and must not become a source of truth.
- Live KPI must be updated asynchronously from facts.
- Live KPI must be read from aggregates, precomputed counters, materialized views, or cache.
- Heavy runtime JOINs across transactional tables for user dashboard KPI are forbidden.
- Snapshot KPI is period-fixed and must not be silently rewritten backward.
- Department plans are manual manager-entered `plan` values.
- Factual KPI values are derived from source-of-truth domains.
- Plan values must not overwrite or impersonate factual KPI values.
- KPI screens must not perform domain mutations.

Accepted entities/read models:

- `LiveKPI`
- `SnapshotKPI`
- `DepartmentPlan`
- `KPIPlanFactView`
- `ExecutiveMetric`

Accepted executive metric keys from `docs/14-api-contracts.md`:

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

Do not add any other metric key in this task.

### Reporting

Already accepted reporting surface:

- sales, payments, inventory, delivery, return, finance, mismatch, reconciliation, and executive reporting are read/control surfaces only
- reconciliation reports remain their own control contour and are not replaced by KPI/reporting
- reports must read accepted domain facts or accepted aggregates, not mutate primary facts
- report visibility must respect role, object-level, and field-level permissions

### Automation

Already accepted automation surface:

- BullMQ + Redis is the accepted v1 async baseline.
- `apps/worker` is the accepted background processing app.
- Worker jobs may process queued/delayed work but must not bypass API/domain rules.
- Transactional outbox or equivalent rollback/compensation discipline is required for cross-domain effects.
- Reconciliation daily job baseline exists, with live transport/scheduler hardening deferred to Stage 8.
- Notification dispatch is accepted as traceable outbound intent/log for Telegram/MAX, but broad provider delivery and routing remain separate MVP integration work.
- Automation must not bypass state machine, idempotency, permissions, audit, quarantine, cash-basis, or ReturnRequest rules.

## Must Verify Before Coding

Verify and report:

- `git status --short` is clean or only contains expected docs-only changes.
- Accepted docs do not conflict on KPI being derived/read-only.
- `docs/09`, `docs/14`, `docs/15`, `docs/21`, `docs/22`, `docs/24`, `docs/32`, and `docs/38` agree on plan/fact separation.
- Current Prisma schema either has or lacks accepted analytics models:
  - `analytics.live_kpi_metrics`
  - `analytics.snapshot_kpi_metrics`
  - `analytics.department_plans`
- Current API either has or lacks a KPI/analytics module.
- Current worker KPI processor is only a placeholder or already has a safe contract.
- Existing read-side module patterns can be reused without mixing KPI into transactional source domains.
- Existing source domains expose enough accepted facts for a narrow first slice; if not, first slice must avoid calculations and only freeze contracts.
- Department plan write permissions and ownership rules are concrete enough to implement. If they are still only "managerial planning right" without a repo permission contract, report this as a blocker for plan mutation endpoints.
- Reporting/control work does not require unresolved reconciliation resolution workflow.
- Automation work does not require unauthenticated internal HTTP calls, unsafe cross-app imports, or provider-specific Telegram/MAX delivery.

## First Safe Implementation Slice Decision

Unless verification proves a different safer path, the first Stage 8 implementation slice should be:

`Stage 8A - Analytics Read-Model Contract Baseline`

Allowed in that future implementation task:

- add or align only the accepted analytics storage/API contract baseline
- keep live/snapshot KPI values precomputed/read-only
- expose only accepted KPI endpoints:
  - `GET /kpi/live`
  - `GET /kpi/snapshots`
  - `GET /kpi/department-plans`
- include `POST/PATCH /kpi/department-plans` only if accepted role/permission ownership is verified in repo state; otherwise leave plan mutations out and report the missing permission contract
- add a narrow worker KPI recompute adapter contract only if it does not calculate metrics yet and does not bypass domain rules
- add focused schema/contract tests that prove KPI is derived/read-only and no unsupported metric keys exist

Forbidden in the first implementation slice:

- KPI formula engines
- broad dashboard UI
- heavy runtime JOIN KPI endpoints
- reconciliation resolution workflow
- Telegram/MAX provider delivery
- generic notification routing platform
- automation that changes domain status directly
- new metrics not listed in accepted docs

If analytics models already exist in the repo, the first safe implementation slice must become a verification/alignment task instead of adding duplicate schema.

## Explicit Anti-Scope

KPI/reporting/automation must not:

- become a source of truth
- mutate CRM, Orders, Inventory, Payments, Logistics, Finance, Returns, Audit, or Reconciliation facts
- overwrite source-domain records from dashboard or report screens
- use KPI facts as permission bypass
- replace cash-basis finance logic
- replace fulfillment-based inventory issue logic
- replace `ReturnRequest` for returns
- mark reconciliation reports resolved without an accepted resolution workflow
- introduce new BI/analytics facts platform beyond MVP reporting layer
- introduce advanced forecasting, route optimization, dashboard builder, or generic automation builder

## Verification Commands

For this planning/control task, run:

```powershell
git status --short
Select-String -Path docs\09-kpi-model.md,docs\14-api-contracts.md,docs\15-event-model.md,docs\21-testing-strategy.md,docs\22-qa-release-checklist.md,docs\24-mvp-scope-v1.md,docs\32-physical-database-schema.md,docs\38-mvp-v1-functional-realignment.md -Pattern "KPI|kpi|plan/fact|department_plan|live_kpi|snapshot_kpi|source of truth|derived"
Select-String -Path apps\api\prisma\schema.prisma -Pattern "AnalyticsLiveKpiMetric|AnalyticsSnapshotKpiMetric|AnalyticsDepartmentPlan|live_kpi|snapshot_kpi|department_plan|ReconciliationReport|SystemOutboxRecord"
Get-ChildItem -Path apps\api\src\modules -Directory | Where-Object { $_.Name -match "analytics|kpi" }
Get-Content -Raw apps\worker\src\jobs\kpi-recompute.processor.ts
git diff --check
```

Do not run broad tests unless this task is expanded later into code changes.

## Stop Conditions

Stop and report instead of writing a follow-up implementation task if:

- accepted docs conflict on KPI source-of-truth discipline
- implementation would require inventing metric definitions or formulas
- implementation would require inventing department plan ownership/permissions
- implementation would require broad reporting UI
- implementation would require Telegram/MAX provider delivery
- implementation would require reconciliation resolution workflow
- implementation would require external payment model realignment
- implementation would require a new queue/broker beyond Redis + BullMQ
- implementation would require workers to bypass API/domain rules
- repo already contains a complete Stage 8 implementation and only verification is needed

## Required Report

Return:

```text
1. changed_files
2. what_done
3. tests_run
4. open_risks
5. ready_for_next_step: yes/no
```
