# Sanmarino CRM / ERP Monorepo Bootstrap

Bootstrap repository for internal CRM/ERP v1.

## Purpose

This repository contains only the approved monorepo foundation for the first implementation cycle:

- workspace and toolchain setup
- `web`, `api`, `worker` app scaffolds
- shared `config`, `types`, `ui` packages
- deploy/test placeholders
- Prisma infrastructure bootstrap surface (TODO-only schema)

Business features are intentionally not implemented in this phase.

## Approved Stack

- Node.js 24 LTS
- pnpm workspace monorepo
- TypeScript
- Next.js 16 (`apps/web`)
- NestJS (`apps/api`)
- BullMQ worker (`apps/worker`)
- PostgreSQL 17 + Prisma
- Redis
- Vitest + Playwright
- Docker Compose + Nginx baseline

Source of truth:

- `docs/28-approved-tech-stack.md`
- `docs/29-monorepo-bootstrap-spec.md`
- `docs/30-initial-folder-contracts.md`
- `docs/32-physical-database-schema.md`
- `docs/33-root-repo-files-spec.md`
- `docs/34-bootstrap-task-for-codex.md`

## Repository Layout

```text
apps/
  web/
  api/
  worker/
packages/
  config/
  types/
  ui/
docs/
deploy/
scripts/
tests/
```

## Local Bootstrap

1. Install Node.js 24 LTS.
2. Enable pnpm and install dependencies:

```bash
pnpm install
```

3. Copy env placeholders if needed:

```bash
cp .env.example .env
```

4. Start infrastructure baseline (optional):

```bash
pnpm compose:up
```

5. Generate Prisma client:

```bash
pnpm db:generate
```

6. Run dev mode:

```bash
pnpm dev
```

## Root Commands

- `pnpm dev`
- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm format`
- `pnpm test`
- `pnpm test:unit`
- `pnpm test:integration`
- `pnpm test:e2e`
- `pnpm db:generate`
- `pnpm db:migrate`
- `pnpm db:seed`
- `pnpm compose:up`
- `pnpm compose:down`

## Context Loading Before Coding

Use the context loading tiers defined in `AGENTS.md` and
`docs/ai/CODING_RULES.md`.

Minimum agent context:

1. `README.md`
2. `AGENTS.md`
3. `docs/ai/PROJECT_INDEX.md`
4. `docs/ai/CONTEXT_BRIEF.md`
5. `docs/ai/BUSINESS_RULES.md`
6. `docs/ai/CODING_RULES.md`

For task-driven work, read the exact task file from `docs/tasks/` and the
canonical docs it lists.

For new stages, unclear scope, architecture conflicts, or risky domain changes,
read `docs/` in numeric order before coding. Priority architecture guardrails:

- `docs/08-architecture-fixes-and-critical-blockers.md`
- `docs/34-bootstrap-task-for-codex.md`

## Scope Note

This bootstrap is structural and infrastructure-ready only.
No domain feature implementation is included.
