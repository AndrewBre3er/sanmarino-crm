# Coding Rules For Agent Windows

This file is a compact execution protocol for new agent windows.
It does not override `AGENTS.md`.

## Start Every Step

1. Run `git status --short`.
2. If the tree is dirty, continue only when the dirty files are expected for the current task.
3. Read:
   - `README.md`
   - `AGENTS.md`
   - `docs/ai/PROJECT_INDEX.md`
   - `docs/ai/CONTEXT_BRIEF.md`
   - `docs/ai/BUSINESS_RULES.md`
   - this file
   - the exact task file from `docs/tasks/`
4. Read task-relevant canonical docs listed in the task file.

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
5. ready_to_commit: yes/no
```

