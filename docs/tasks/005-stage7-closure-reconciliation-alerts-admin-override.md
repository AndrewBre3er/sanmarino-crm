# Task 005: Stage 7 Closure - Reconciliation Alerts And Admin Override Audit

## Role

Implementation task.

Recommended window title:

`Returns Stage 7 - Reconciliation Alerts Admin Override`

## Goal

Implement the next narrow closure slice for `Returns + Reconciliation + Audit hardening` after:

- `0a7e24d feat(api): add returns reconciliation runtime gate`
- `792fffe feat(api): add return consequences baseline`
- `31be135 feat(api): add finance manual corrections baseline`

This task must close only the remaining Stage 7 backend baseline around daily reconciliation execution, mismatch alert dispatch, and admin override audit traceability.

## Starting Point

Expected project state:

- `ReturnRequest` lifecycle and consequences baseline already exists.
- refund commands require `ReturnRequest`.
- reconciliation report generation and mismatch events already exist.
- finance manual corrections baseline already exists.
- worker app already has queue bootstrap placeholders.

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
- `docs/14-api-contracts.md`
- `docs/15-event-model.md`
- `docs/16-implementation-roadmap.md`
- `docs/20-security-architecture.md`
- `docs/21-testing-strategy.md`
- `docs/22-qa-release-checklist.md`
- `docs/24-mvp-scope-v1.md`
- `docs/32-physical-database-schema.md`
- `docs/38-mvp-v1-functional-realignment.md`
- `docs/tasks/002-returns-stage-status-rebuild.md`
- `docs/tasks/003-return-consequences-baseline.md`
- `docs/tasks/004-finance-manual-corrections-baseline.md`

Inspect implementation:

- `apps/api/prisma/schema.prisma`
- `apps/api/src/app.module.ts`
- `apps/api/src/modules/reconciliation/reconciliation.controller.ts`
- `apps/api/src/modules/reconciliation/reconciliation.service.ts`
- `apps/api/src/modules/transactional/shared/status.contract.ts`
- `apps/api/tests/unit/reconciliation.service.spec.ts`
- `apps/api/tests/unit/prisma.infra-schema.spec.ts`
- `apps/worker/src/main.ts`
- `apps/worker/src/workers/worker.bootstrap.ts`
- `apps/worker/src/jobs/reconciliation.processor.ts`
- `apps/worker/src/jobs/outbox.processor.ts`
- `apps/worker/src/queues/queue.contracts.ts`
- `apps/worker/src/queues/queue.factory.ts`
- `apps/worker/src/queues/queue.names.ts`
- `apps/worker/tests/unit/worker.spec.ts`

## Scope

Implement only:

- daily reconciliation worker baseline
- mismatch alert/dispatch baseline
- admin override audit baseline
- focused unit/schema tests for this slice

Keep the implementation small and repo-native. Prefer existing Prisma, audit, idempotency, outbox, queue, and test patterns.

## Required Behavior

### Daily Reconciliation Worker Baseline

Add or align a worker-side baseline for the existing reconciliation queue.

Minimum required behavior:

- the `reconciliation` worker queue has a concrete daily job contract
- daily run uses the existing reconciliation run behavior and required v1 pairs
- daily run is idempotent per report date
- daily run does not create duplicate reports for the same date
- worker failure leaves retryable diagnostic context without corrupting source-of-truth data
- worker tests can verify date normalization, idempotency key generation, and runner invocation without requiring a live Redis or database

Use existing queue names and worker bootstrap conventions.

If the current worker cannot safely call the API reconciliation service without introducing an unsafe cross-app dependency or unauthenticated internal HTTP path, implement the narrow processor/runner adapter contract and report the remaining integration gap instead of inventing a transport.

### Mismatch Alert/Dispatch Baseline

Add or align a baseline that turns `reconciliation.mismatch_detected` facts into an internal alert/dispatch record or dispatch-intent event.

Minimum required behavior:

- mismatch alert dispatch is derived from `reconciliation.mismatch_detected`, not arbitrary UI input
- dispatch payload includes `reportId`, `pair`, `leftEntityRef`, `rightEntityRef`, `actualDifference`, `recommendedAction`, and `detectedAt`
- dispatch target is limited to the accepted finance/admin/ceo control contour
- dispatch is idempotent per mismatch fact
- dispatch writes audit trace for queued/failed critical alert handling where the current schema supports it
- dispatch does not mutate or resolve reconciliation reports

Use existing `system.outbox_events` first if it is sufficient for the baseline.

Only add a narrow schema/migration for dispatch records if accepted docs and current schema make it necessary. Do not add a notification provider adapter in this task.

### Admin Override Audit Baseline

Add or align a reusable admin override audit baseline.

Minimum required behavior:

- only accepted privileged roles may perform an override baseline action
- every override baseline action requires a non-empty reason
- every override baseline action writes an `audit.override_performed` audit record
- audit payload includes `auditEventId`, `entityType`, `entityId`, `actorUserId`, `reason`, and `performedAt`
- audit record includes request/correlation context where available
- no override path may bypass a state machine without writing audit

Keep this as a baseline for explicit override actions only. Do not build a generic arbitrary table/field mutation endpoint.

If accepted docs do not define a safe concrete override command for an existing domain, implement only the reusable audit helper/service plus focused tests, and report the missing API contract as an open risk.

## Explicit Non-Scope

Do not implement:

- external payment model realignment
- CRM-side payment creation or removal
- UI screens
- e2e tests
- Telegram provider delivery
- MAX provider delivery
- broad notification provider routing
- broad reconciliation resolution workflow
- marking reconciliation reports as resolved
- supplier payables
- KPI/reporting changes
- full governance platform
- generic arbitrary admin data mutation framework
- broad finance ledger redesign

## Tests Required

Add or update focused tests for:

- daily reconciliation worker job builds one deterministic command per report date
- daily reconciliation worker job uses an idempotency key scoped to the report date
- worker job delegates to the reconciliation runner once on success
- worker job surfaces retryable errors without creating duplicate reports
- reconciliation run remains idempotent when repeated for the same report date
- mismatch alert dispatch is created/requested for each mismatch fact
- mismatch alert dispatch is not created for zero-mismatch reports
- mismatch alert dispatch replay is idempotent
- mismatch alert dispatch does not mutate reconciliation report status or summary
- forbidden roles cannot run reconciliation or override baseline commands
- admin override audit baseline rejects missing reason
- admin override audit baseline writes `audit.override_performed`
- admin override audit baseline captures actor, entity, reason, request id, and correlation id
- schema tests cover any new table/enum/model if this task adds one

## Verification Commands

Run:

```powershell
git status --short
$env:DATABASE_URL='postgresql://user:pass@localhost:5432/sanmarino'
pnpm --filter @sanmarino/api exec prisma validate
pnpm --filter @sanmarino/api exec vitest run tests/unit/reconciliation.service.spec.ts tests/unit/prisma.infra-schema.spec.ts
pnpm --filter @sanmarino/worker test:unit
pnpm --filter @sanmarino/api test:unit
pnpm typecheck
git diff --check
```

If a migration is created, also run the existing migration/schema-diff verification used by recent runtime-gate tasks.

## Stop Conditions

Stop and report instead of coding if:

- the working tree contains unrelated dirty changes
- accepted docs conflict on reconciliation worker behavior, mismatch alert routing, or override roles
- implementation would require external payment model realignment
- implementation would require UI scope
- implementation would require Telegram/MAX provider delivery
- implementation would require broad reconciliation resolution workflow
- implementation would require a generic arbitrary admin mutation framework
- implementation would require unauthenticated internal API calls or unsafe cross-app imports
- the repo already contains a complete implementation and only verification is needed

## Required Report

Return:

```text
1. changed_files
2. what_done
3. tests_run
4. open_risks
5. ready_to_commit: yes/no
```
