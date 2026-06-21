# Context Brief

## Project

Sanmarino CRM/ERP is an internal operational system for the Sanmarino business.
It covers CRM, orders, inventory, payments, logistics, finance, KPI, permissions, audit, and cross-domain reconciliation.

The system is not a single CRM table that owns every fact.
Each domain has its own source-of-truth boundary.

## Current Repository State

Last known clean commit:
- `d40449c feat(api): add stage 7 closure baseline`

Current branch:
- `codex/auth-skeleton`

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

## What The Latest Commit Added

The Stage 7 closure baseline completed the backend hardening sequence after:
- returns reconciliation runtime gate
- return consequences baseline
- finance manual corrections baseline
- stage 7 closure baseline

Final verification passed with:
- `git diff --check`
- Prisma validation
- targeted Vitest suites
- full API unit suite
- `pnpm typecheck`

## Current Roadmap Position

`Logistics + Fulfillment` is complete.

`Returns + Reconciliation + Audit hardening` is closed as a backend baseline.
It is not production-complete notification/provider automation.

Deferrable gaps and target stages:
- live reconciliation worker-to-API transport/scheduler: Stage 8 automation hardening
- Telegram/MAX providers and broad notification routing: MVP integrations / Delta 0 Wave D
- reconciliation resolution workflow: Stage 8 reporting/control
- external payment intake/control realignment: Delta 0 Wave A before MVP release
- UI/e2e coverage for returns/reconciliation/corrections: MVP release hardening

The next major stage is:
- Stage 8: KPI / Reporting / Automation layer

The next control task should define the first narrow Stage 8 slice from accepted docs and repo state.

## Working Protocol

New windows should use:
- `.agents/skills/sanmarino-step-runner/SKILL.md`
- one task file from `docs/tasks/`

The task file defines the scope.
The skill defines how to execute the step.
