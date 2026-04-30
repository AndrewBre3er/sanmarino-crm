# Context Brief

## Project

Sanmarino CRM/ERP is an internal operational system for the Sanmarino business.
It covers CRM, orders, inventory, payments, logistics, finance, KPI, permissions, audit, and cross-domain reconciliation.

The system is not a single CRM table that owns every fact.
Each domain has its own source-of-truth boundary.

## Current Repository State

Last known clean commit:
- `0a7e24d feat(api): add returns reconciliation runtime gate`

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

Current major stage:
- Returns + Reconciliation + Audit hardening

## What The Latest Commit Added

The runtime gate commit added and verified the baseline needed for the returns/reconciliation stage:
- Prisma schema support for `OrdersReturnRequest.realizationAnchorAt`
- Prisma model/table support for `OrdersReturnRequestItem`
- reconciliation report schema/runtime surface
- migration `20260429_phase16_returns_reconciliation_runtime_gate`
- ReturnRequest command surface
- Reconciliation module baseline
- unit tests for return requests and reconciliation
- docs realignment for revised MVP v1

The commit gate passed with:
- `git diff --check`
- Prisma validation
- targeted Vitest suites
- full API unit suite
- `pnpm typecheck`

## Current Roadmap Position

`Logistics + Fulfillment` is complete.

`Returns + Reconciliation + Audit hardening` is open.
Its entry contracts and runtime gate are complete, but the exact remaining implementation status must be rebuilt before starting the next coding slice.

The next control task is:
- `docs/tasks/002-returns-stage-status-rebuild.md`

## Working Protocol

New windows should use:
- `.agents/skills/sanmarino-step-runner/SKILL.md`
- one task file from `docs/tasks/`

The task file defines the scope.
The skill defines how to execute the step.

