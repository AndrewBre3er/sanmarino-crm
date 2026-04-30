# AI Project Index

## Status

This directory is a navigation layer for agent windows.
It does not replace `AGENTS.md` or accepted `docs/*.md`.

If this index conflicts with canonical docs, follow this priority:
1. `AGENTS.md`
2. `docs/08-architecture-fixes-and-critical-blockers.md`
3. `docs/20-security-architecture.md`
4. `docs/21-testing-strategy.md`
5. `docs/22-qa-release-checklist.md`
6. `docs/24-mvp-scope-v1.md`
7. `docs/32-physical-database-schema.md`
8. `docs/14-api-contracts.md`
9. `docs/15-event-model.md`
10. `docs/16-implementation-roadmap.md`
11. `docs/26-current-task-codex.md`
12. `docs/38-mvp-v1-functional-realignment.md`

## Fast Start For New Agent Windows

Read in this order:
1. `README.md`
2. `AGENTS.md`
3. `docs/ai/PROJECT_INDEX.md`
4. `docs/ai/CONTEXT_BRIEF.md`
5. `docs/ai/BUSINESS_RULES.md`
6. `docs/ai/CODING_RULES.md`
7. The exact task file from `docs/tasks/`
8. Task-relevant canonical docs listed in the task file

For coding, still read the canonical docs required by the task.
The `docs/ai/*` files are a map, not a permission to skip domain contracts.

## Current Roadmap Snapshot

Completed major stages:
- Foundation / bootstrap
- Canonical data model baseline
- Auth / Users / Roles / Permissions
- CRM core
- Supply + Inventory foundation
- Orders core
- Payments + Finance core
- Logistics + Fulfillment
- Returns + Reconciliation + Audit hardening backend baseline

Current major stage:
- KPI / Reporting / Automation layer

Recently completed commit:
- `d40449c feat(api): add stage 7 closure baseline`

Current planning need:
- Treat Stage 7 as closed as a backend baseline after final verification.
- Track Stage 7 deferrable gaps in their target stages, without reopening the backend baseline.
- Define the first narrow Stage 8 task for the `KPI / Reporting / Automation layer`.

Stage 7 deferrable gaps:
- live reconciliation worker-to-API transport/scheduler: Stage 8 automation hardening
- Telegram/MAX providers and broad notification routing: MVP integrations / Delta 0 Wave D
- reconciliation resolution workflow: Stage 8 reporting/control
- external payment intake/control realignment: Delta 0 Wave A before MVP release
- UI/e2e coverage for returns/reconciliation/corrections: MVP release hardening

## Where To Look

Project and business context:
- `docs/ai/CONTEXT_BRIEF.md`
- `docs/ai/BUSINESS_RULES.md`
- `docs/00-project-context.md`
- `docs/01-system-logic.md`
- `docs/02-domain-map.md`

Roadmap and MVP scope:
- `docs/16-implementation-roadmap.md`
- `docs/24-mvp-scope-v1.md`
- `docs/26-current-task-codex.md`
- `docs/38-mvp-v1-functional-realignment.md`

Domain contracts:
- `docs/03-entity-catalog.md`
- `docs/04-state-machines.md`
- `docs/05-process-flows.md`
- `docs/13-database-architecture.md`
- `docs/14-api-contracts.md`
- `docs/15-event-model.md`
- `docs/32-physical-database-schema.md`

Security, roles, tests, release gates:
- `docs/07-roles-and-access.md`
- `docs/20-security-architecture.md`
- `docs/21-testing-strategy.md`
- `docs/22-qa-release-checklist.md`

Implementation tasks:
- `docs/tasks/README.md`
- concrete files under `docs/tasks/`

Reusable step runner:
- `.agents/skills/sanmarino-step-runner/SKILL.md`
