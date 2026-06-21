# Task 003: Return Consequences Baseline

## Role

Implementation task.

## Goal

Implement the next narrow slice of `Returns + Reconciliation + Audit hardening`: return consequences after the existing `ReturnRequest` workflow baseline.

This task must make refund and goods-return effects flow through `ReturnRequest` without broadening into full reconciliation automation or advanced audit hardening.

## Read First

- `README.md`
- `AGENTS.md`
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
- `apps/api/src/modules/orders/return-requests.controller.ts`
- `apps/api/src/modules/orders/return-requests.service.ts`
- `apps/api/src/modules/orders/orders.module.ts`
- `apps/api/src/modules/payments/payments.controller.ts`
- `apps/api/src/modules/payments/payments.service.ts`
- `apps/api/src/modules/reconciliation/reconciliation.service.ts`
- `apps/api/prisma/schema.prisma`
- related tests under `apps/api/tests/unit/`

## Scope

Implement only:
- refund command through `ReturnRequest`
- item resolution consequences for existing return items
- close gating based on required consequences
- audit/outbox coverage for return lifecycle consequences
- focused tests for this slice

## Required Behavior

### Refund Through ReturnRequest

- Add or align runtime command:
  - `POST /payments/:paymentId/refunds`
- `Idempotency-Key` is required.
- `returnRequestId` is required.
- A refund without `returnRequestId` must be rejected.
- Refund must be linked to the referenced `ReturnRequest`.
- Refund must create the accepted money/finance consequences according to current payment/finance contracts:
  - refund cash operation
  - finance return/correction surface where already supported by the repo contracts
- Do not reintroduce CRM-side payment creation.
- Do not implement external gateway payment initiation.

If exact refund finance entry behavior is ambiguous in accepted docs/code, stop and report the gap before guessing.

### Return Item Resolutions

Honor existing `ReturnRequestItem.resolution`:
- `return_to_quarantine` creates quarantine movement.
- `writeoff` creates writeoff movement.
- `refund_only` creates no goods movement.

Do not return goods directly to `available`.
Do not create inventory effects outside `ReturnRequest.process`.

### Close Gating

`ReturnRequest.close` must verify required consequences before moving to `closed`.

Minimum required gating:
- goods consequences for item resolutions are completed where applicable
- refund/money consequences are completed when a refund amount is required
- `processed` state alone is not enough if required downstream consequences are missing

If the current schema lacks a clean way to prove a consequence is completed, implement the narrowest safe check available from existing facts and report any residual limitation.

### Audit And Outbox

Add focused audit/outbox coverage for:
- return request creation, if missing
- return request confirmation, if missing
- return request processing consequences
- return request close
- refund command linked to `ReturnRequest`

Use existing audit/outbox patterns.
Do not invent a new event transport.

## Explicit Non-Scope

Do not implement:
- daily reconciliation scheduler
- notification/alert delivery pipeline
- manual correction approval workflow
- quarantine release-to-available workflow
- advanced admin override framework
- KPI/reporting features
- broad payment model realignment beyond refund enforcement
- new migrations unless strictly required by the implementation

## Tests Required

Add or update focused tests for:
- refund without `returnRequestId` is rejected
- refund with `returnRequestId` creates the accepted refund consequences
- refund command is idempotent
- `return_to_quarantine` creates quarantine movement
- `writeoff` creates writeoff movement
- `refund_only` creates no inventory movement
- close is blocked before required consequences are complete
- close succeeds after required consequences are complete
- audit/outbox records are written for the new consequences
- forbidden roles cannot run refund or consequence commands

## Verification Commands

Run:

```powershell
$env:DATABASE_URL='postgresql://user:pass@localhost:5432/sanmarino'
pnpm --filter @sanmarino/api exec prisma validate
pnpm --filter @sanmarino/api exec vitest run tests/unit/return-requests.service.spec.ts tests/unit/reconciliation.service.spec.ts
pnpm --filter @sanmarino/api exec vitest run tests/unit/prisma.infra-schema.spec.ts tests/unit/transactional.repository-skeletons.spec.ts tests/unit/transactional.transition-guards.spec.ts
pnpm --filter @sanmarino/api test:unit
pnpm typecheck
git diff --check
```

## Required Report

Return:

```text
1. changed_files
2. what_done
3. tests_run
4. open_risks
5. ready_to_commit: yes/no
```

