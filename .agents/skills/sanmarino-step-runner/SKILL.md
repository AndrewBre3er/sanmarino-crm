# Sanmarino Step Runner

Use this skill when executing a concrete Sanmarino CRM task from `docs/tasks/`.

## Purpose

Run one project step with consistent pre-start, scope control, verification, and structured reporting.

This skill is a workflow helper.
It does not override `AGENTS.md` or accepted `docs/*.md`.

## Required Input

The user should name a task file, for example:

```text
Use sanmarino-step-runner.
Task: docs/tasks/002-returns-stage-status-rebuild.md
```

If no task file is provided, read `docs/tasks/README.md` and ask for the exact task file.

## Pre-Start

1. Run `git status --short`.
2. If the tree is dirty, continue only if the dirty files are expected by the task.
3. Read:
   - `README.md`
   - `AGENTS.md`
   - `docs/ai/PROJECT_INDEX.md`
   - `docs/ai/CONTEXT_BRIEF.md`
   - `docs/ai/BUSINESS_RULES.md`
   - `docs/ai/CODING_RULES.md`
   - the requested task file
4. Read all task-specific docs and files listed in the task.

## Execution Rules

- Execute exactly one task.
- Keep edits inside the task scope.
- If the task is planning/control, do not edit files.
- If the task is implementation, follow existing repo patterns and add focused tests.
- If a domain rule is missing or contradictory, stop and report the gap.
- Do not invent fields, statuses, or processes outside accepted docs.
- Do not commit or push unless explicitly requested after a report.

## Verification

Run the commands listed in the task file.
If the task changes code and no commands are listed, run the narrow relevant tests and `pnpm typecheck`.

For Prisma validation without a local database URL:

```powershell
$env:DATABASE_URL='postgresql://user:pass@localhost:5432/sanmarino'
pnpm --filter @sanmarino/api exec prisma validate
```

## Report Format

Return:

```text
1. changed_files
2. what_done
3. tests_run
4. open_risks
5. ready_to_commit: yes/no
```

For planning/control tasks, replace `ready_to_commit` with `ready_for_next_step` when no files changed.

