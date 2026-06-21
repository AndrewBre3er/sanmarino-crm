# Task 004: Finance Manual Corrections Baseline

## Role

Implementation task.

Recommended window title:

`Returns Step 4 - Finance Manual Corrections Baseline`

## Goal

Implement the next narrow slice of `Returns + Reconciliation + Audit hardening`: manual finance corrections with approval/apply workflow, linked to reconciliation findings where the current contracts allow it.

This task must add the MVP v1 correction control loop without changing the broader payment model, adding schedulers, adding notifications, or building UI.

## Starting Point

Expected project state:
- `Returns Step 2/3` backend baseline is already committed.
- `ReturnRequest` workflow and return consequences baseline already exist.
- reconciliation reports and mismatch events already exist.
- manual correction contracts are accepted in docs, but runtime implementation may still be missing.

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
- `docs/13-database-architecture.md`
- `docs/14-api-contracts.md`
- `docs/15-event-model.md`
- `docs/20-security-architecture.md`
- `docs/21-testing-strategy.md`
- `docs/22-qa-release-checklist.md`
- `docs/24-mvp-scope-v1.md`
- `docs/32-physical-database-schema.md`
- `docs/38-mvp-v1-functional-realignment.md`

Inspect implementation:
- `apps/api/prisma/schema.prisma`
- `apps/api/src/app.module.ts`
- `apps/api/src/modules/finance/finance.module.ts`
- `apps/api/src/modules/finance/finance.service.ts`
- `apps/api/src/modules/finance/expenses.controller.ts`
- `apps/api/src/modules/reconciliation/reconciliation.service.ts`
- `apps/api/src/modules/transactional/shared/status.contract.ts`
- `apps/api/tests/unit/finance.service.spec.ts`
- `apps/api/tests/unit/reconciliation.service.spec.ts`
- `apps/api/tests/unit/prisma.infra-schema.spec.ts`

## Scope

Implement only:
- `finance.manual_corrections` runtime baseline if absent from Prisma/runtime.
- manual correction create/list/detail API surface.
- manual correction workflow commands:
  - submit for approval
  - approve
  - reject
  - apply
- role restrictions from `docs/07-roles-and-access.md`.
- idempotency for critical correction commands.
- audit/outbox events for correction lifecycle.
- apply-once rule with `0..1` final `finance_entry`.
- minimal reconciliation reference storage in correction payload when a correction is created from a mismatch context.
- focused unit tests and schema tests for this slice.

If implementation requires a migration, create exactly one narrow Prisma migration for manual corrections and related enum/model fields. Do not combine it with unrelated schema cleanup.

## Required Behavior

### Manual Correction Lifecycle

Canonical statuses:
- `draft`
- `pending_approval`
- `approved`
- `rejected`
- `applied`

Allowed transitions:
- `draft -> pending_approval`
- `pending_approval -> approved`
- `pending_approval -> rejected`
- `approved -> applied`

Forbidden transitions:
- apply before approval
- approve/reject outside `pending_approval`
- apply a rejected correction
- apply an already applied correction
- return an applied correction to any earlier state

### API Surface

Implement or align:
- `POST /finance-corrections`
- `GET /finance-corrections`
- `GET /finance-corrections/:correctionId`
- `POST /finance-corrections/:correctionId/submit-for-approval`
- `POST /finance-corrections/:correctionId/approve`
- `POST /finance-corrections/:correctionId/reject`
- `POST /finance-corrections/:correctionId/apply`

Every `POST` command must require `Idempotency-Key`.

### Roles

Use `docs/07-roles-and-access.md` as the source of truth.

Minimum role matrix:
- `finance` can create corrections.
- `finance` can submit corrections for approval.
- `ceo` can approve corrections.
- `ceo` can reject corrections.
- `finance` can apply approved corrections.
- `seller`, `warehouse`, and `logistics` cannot run correction commands.

Do not grant `admin` business correction commands unless accepted docs explicitly allow that path. If existing code patterns conflict with the role matrix, stop and report the conflict instead of silently broadening access.

### Correction Payload

Use the accepted physical model `payload jsonb`.

Minimum payload for this runtime baseline:
- correction amount
- currency
- recognized date/time
- reason/description context
- optional related order reference when the correction is tied to an order
- optional reconciliation reference when created from a mismatch context

The reconciliation reference must be minimal and non-authoritative:
- `reportId`
- `pair`
- `leftEntityRef`
- `rightEntityRef`
- `recommendedAction`

Do not add a new reconciliation resolution lifecycle in this task.
Do not mark reconciliation reports as resolved in this task unless an accepted doc already defines that transition.

If accepted docs do not provide enough payload detail to implement this safely, first add a narrow docs alignment change to `docs/14-api-contracts.md` and `docs/32-physical-database-schema.md`, then implement code. Keep that docs change inside this task only if it is strictly required.

### Apply Behavior

Applying an approved correction must:
- create at most one final `finance.finance_entry`
- link the correction to that entry through `applied_entry_id`
- set `applied_at`
- move status to `applied`
- not overwrite payment, inventory, order, logistics, or KPI source-of-truth facts

Use `finance_entry.entry_type = adjustment` unless accepted docs or current enum naming require a stricter existing value.

### Audit And Outbox

Use existing audit/outbox patterns.

Emit/write coverage for:
- `finance.correction_created`
- `finance.correction_submitted_for_approval`
- `finance.correction_approved`
- `finance.correction_rejected`
- `finance.correction_applied`

Every workflow transition must leave an audit trace with actor, action, entity type, entity id, and relevant command context.

## Explicit Non-Scope

Do not implement:
- external payment model realignment
- removal of existing CRM-side payment APIs
- daily reconciliation scheduler
- notification or alert delivery
- Telegram/MAX/ATS/Avito integrations
- UI screens
- e2e tests
- admin override framework
- full reconciliation resolution workflow
- supplier payables
- KPI/reporting changes
- broad finance ledger redesign

## Tests Required

Add or update focused tests for:
- Prisma/schema presence for manual corrections if new schema is added.
- create correction stores `draft`, reason, payload, and requester.
- list/detail are role-limited.
- submit requires `draft` and moves to `pending_approval`.
- approve requires `pending_approval` and moves to `approved`.
- reject requires `pending_approval` and moves to `rejected`.
- apply requires `approved`, creates one finance entry, links `applied_entry_id`, and moves to `applied`.
- apply cannot run twice.
- apply cannot run from `draft`, `pending_approval`, or `rejected`.
- forbidden roles cannot run correction commands.
- idempotent replay does not duplicate correction transitions or finance entries.
- same `Idempotency-Key` with different payload is rejected.
- audit/outbox records are written for create/submit/approve/reject/apply.
- reconciliation references are stored as payload context only and do not mutate reconciliation reports.

## Verification Commands

Run:

```powershell
git status --short
$env:DATABASE_URL='postgresql://user:pass@localhost:5432/sanmarino'
pnpm --filter @sanmarino/api exec prisma validate
pnpm --filter @sanmarino/api exec vitest run tests/unit/finance.service.spec.ts tests/unit/reconciliation.service.spec.ts tests/unit/prisma.infra-schema.spec.ts
pnpm --filter @sanmarino/api test:unit
pnpm typecheck
git diff --check
```

If a migration is created, also run the existing migration/schema-diff verification used by recent runtime-gate tasks.

## Stop Conditions

Stop and report instead of coding if:
- the working tree contains unrelated dirty changes
- accepted docs conflict on roles, lifecycle, or apply behavior
- implementation would require external payment model realignment
- implementation would require scheduler/notification/UI scope
- correction payload cannot be defined from accepted docs without a docs alignment change
- the repo already contains a complete manual correction implementation and only verification is needed

## Required Report

Return:

```text
1. changed_files
2. what_done
3. tests_run
4. open_risks
5. ready_to_commit: yes/no
```
