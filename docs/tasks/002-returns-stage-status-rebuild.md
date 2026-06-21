# Task 002: Returns Stage Status Rebuild

## Role

Planning/control task.
Do not implement code in this task.

## Goal

Rebuild the exact status of `Returns + Reconciliation + Audit hardening` after commit `0a7e24d feat(api): add returns reconciliation runtime gate`.

## Read First

- `README.md`
- `AGENTS.md`
- `docs/ai/PROJECT_INDEX.md`
- `docs/ai/CONTEXT_BRIEF.md`
- `docs/ai/BUSINESS_RULES.md`
- `docs/ai/CODING_RULES.md`
- `docs/08-architecture-fixes-and-critical-blockers.md`
- `docs/14-api-contracts.md`
- `docs/15-event-model.md`
- `docs/16-implementation-roadmap.md`
- `docs/21-testing-strategy.md`
- `docs/22-qa-release-checklist.md`
- `docs/24-mvp-scope-v1.md`
- `docs/26-current-task-codex.md`
- `docs/32-physical-database-schema.md`
- `docs/38-mvp-v1-functional-realignment.md`

Inspect implementation:
- `apps/api/src/modules/orders/return-requests.controller.ts`
- `apps/api/src/modules/orders/return-requests.service.ts`
- `apps/api/src/modules/reconciliation/reconciliation.controller.ts`
- `apps/api/src/modules/reconciliation/reconciliation.service.ts`
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260429_phase16_returns_reconciliation_runtime_gate/migration.sql`
- related tests under `apps/api/tests/unit/`

## Required Output

Return:
1. `Project Status Snapshot`
2. `Returns Stage Status`
3. `Already Implemented`
4. `Remaining Gaps`
5. `Recommended Next Step`
6. `Prompt For Next Implementation Window`

## Must Verify

- `ReturnRequest` lifecycle coverage
- `ReturnRequestItem` coverage
- `realizationAnchorAt` rule coverage
- role restrictions for return commands
- quarantine/default goods-return status
- refund bypass prevention
- reconciliation pair coverage
- audit coverage for return transitions and manual interventions
- remaining docs/code drift, if any

## Constraints

- Do not edit files.
- Do not run broad refactors.
- Do not commit or push.
- If code and docs disagree, report the conflict and recommend a narrow fix step.

