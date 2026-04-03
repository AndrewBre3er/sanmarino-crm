# UI Phase A Task for Codex

Read and follow the current repository state first.

This task assumes Phase 9 is already completed and committed.

## Goal

Implement **UI Phase A only** for the backoffice frontend.

## Hard constraints

- Do not implement business logic in frontend.
- Do not implement auth flow.
- Do not implement controllers/endpoints from UI.
- Do not invent new entities or workflows.
- Do not add speculative buttons/actions that have no confirmed backend contract.
- Do not implement inventory engine UI, finance ledger UI, analytics logic, or admin policy UI.
- Do not break current repository boundaries.

## Scope

Implement only:

1. backoffice app shell
2. role-aware navigation shell
3. top bar / workspace frame
4. page shell layout primitives
5. reusable empty/loading/error state components
6. reusable status badge component
7. reusable section/page header component
8. shell pages for:
   - leads
   - deals
   - orders
   - payments
   - delivery tasks
   - return requests
   - sales workspace
   - logistics workspace
   - finance workspace
   - CEO overview shell
9. route structure for the above shell pages
10. keep all data access mocked or TODO-marked at shell level only if real UI wiring is not yet confirmed

## Required architecture behavior

- Follow current monorepo boundaries.
- Keep UI work inside `apps/web` and shared presentation primitives in `packages/ui` only if appropriate.
- Do not move backend/domain code into frontend.
- Keep role-awareness at layout/navigation level.
- Page shells may be read-only and placeholder-backed, but must be clearly marked as shell-only where applicable.

## UI rules

- Use the current backoffice design direction from project docs.
- Prefer clean table/list/detail layouts.
- Keep visual structure suitable for role-based CRM/ERP backoffice usage.
- Do not overdesign with decorative marketing visuals.
- Focus on clarity, hierarchy, statuses, actions placement, and density control.

## Output required

1. execution plan
2. files created
3. files modified
4. UI shell/navigation/layout elements added
5. what remains intentionally deferred
6. blockers or doc conflicts

## Acceptance criteria

- Backoffice shell exists.
- Navigation structure exists.
- Role-aware workspace shells exist.
- Core confirmed entities have shell pages.
- No business logic was introduced into frontend.
- No speculative workflows were implemented.
- Project structure remains consistent with accepted architecture.
