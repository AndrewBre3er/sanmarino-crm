# Task 001: Agent Context Pack

## Status

Infrastructure/navigation task.

## Goal

Create a compact context layer so new agent windows can start from `docs/ai`, `docs/tasks`, and `sanmarino-step-runner` instead of long pasted prompts.

## Scope

Create:
- `docs/ai/PROJECT_INDEX.md`
- `docs/ai/CONTEXT_BRIEF.md`
- `docs/ai/BUSINESS_RULES.md`
- `docs/ai/CODING_RULES.md`
- `docs/tasks/README.md`
- `docs/tasks/001-agent-context-pack.md`
- `docs/tasks/002-returns-stage-status-rebuild.md`
- `.agents/skills/sanmarino-step-runner/SKILL.md`

Update:
- `AGENTS.md` with a short pointer to the agent context pack

## Constraints

- Do not change domain rules.
- Do not make `docs/ai/*` a new source of truth.
- Do not replace accepted docs.
- Do not touch application code.

## Verification

Run:
- `git status --short`
- `git diff --check`

Expected:
- only docs/tooling context files changed
- no whitespace errors

