# Coding Rules For Agent Windows

This file is a compact execution protocol for new agent windows.
It does not override `AGENTS.md`.

## Context Loading Policy

Use the narrowest context tier that is safe for the task. If the scope is
unclear or a rule may affect domain invariants, move to the wider tier.

Tier 0 - meta, process, no-code questions:

- `README.md`
- `AGENTS.md`
- `docs/ai/PROJECT_INDEX.md`
- `docs/ai/CONTEXT_BRIEF.md`
- `docs/ai/BUSINESS_RULES.md`
- this file

Tier 1 - task-driven implementation or docs work:

- everything from Tier 0
- the exact task file from `docs/tasks/`
- all canonical docs listed in that task file

Tier 2 - domain, schema, state-machine, security, permissions, finance,
inventory, logistics, KPI, API/event-contract, or cross-domain changes:

- everything from Tier 1 when a task file exists
- the relevant canonical docs for the touched domain
- the mandatory guardrail docs listed in `AGENTS.md`

Tier 3 - new stages, unclear scope, architecture conflicts, missing domain
rules, or high risk of violating invariants:

- `README.md`
- `AGENTS.md`
- all `docs/*.md` in numeric order
- relevant `docs/tasks/*` and `docs/ai/*`

`docs/ai/*` and `docs/tasks/*` are navigation and execution helpers. They do
not replace accepted docs. On conflict, follow `AGENTS.md` and the priority
order in `docs/ai/PROJECT_INDEX.md`.

## Start Every Step

1. Run `git status --short`.
2. If the tree is dirty, continue only when the dirty files are expected for the current task.
3. Select and read the required context tier from `Context Loading Policy`.
4. For task-driven work, read task-relevant canonical docs listed in the task file.
5. If the selected tier proves insufficient, stop broadening implementation scope and load the next tier first.

## Scope Discipline

- Execute one task file at a time.
- Do not broaden scope beyond the task file.
- Do not invent domain fields, statuses, or processes outside accepted docs.
- If docs conflict, follow the priority in `docs/ai/PROJECT_INDEX.md`.
- If a domain rule is missing, stop and report the gap instead of guessing.

## Code Discipline

- Follow existing repo patterns.
- Keep changes close to the modules named by the task.
- Do not refactor unrelated modules.
- Add or adjust tests for behavior changed by the task.
- Do not create migrations unless schema changes require them.
- Do not duplicate an existing migration.

## Verification

Run the narrow tests listed in the task file.
For API/runtime changes, prefer:

- `pnpm --filter @sanmarino/api exec prisma validate`
- `pnpm --filter @sanmarino/api exec vitest run <targeted tests>`
- `pnpm --filter @sanmarino/api test:unit`
- `pnpm typecheck`

If `DATABASE_URL` is missing for Prisma validation, use a safe dummy value:

```powershell
$env:DATABASE_URL='postgresql://user:pass@localhost:5432/sanmarino'
pnpm --filter @sanmarino/api exec prisma validate
```

## Git Rules

- Do not commit or push unless the user explicitly asks.
- Never use destructive git commands unless explicitly requested.
- Do not revert user changes.

## Required Report

Return this structure:

```text
1. changed_files
2. what_done
3. tests_run
4. open_risks
5. context_used
6. ready_to_commit: yes/no
```
