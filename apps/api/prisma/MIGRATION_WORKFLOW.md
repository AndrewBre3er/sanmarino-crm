# Prisma Migration Workflow (Infra-Only Baseline)

This workflow defines bootstrap-safe migration conventions.

## Current scope

- Prisma schema is infra-only placeholder.
- Business/domain models are intentionally deferred.
- No business migrations are generated in this phase.

## Commands

Use root scripts:

- `pnpm db:validate`
- `pnpm db:generate`
- `pnpm db:migrate`

Use API-local scripts when needed:

- `pnpm --filter @sanmarino/api prisma:validate`
- `pnpm --filter @sanmarino/api prisma:generate`
- `pnpm --filter @sanmarino/api prisma:migrate`

## Bootstrap conventions

1. Keep `schema.prisma` infra-only until domain implementation is explicitly started.
2. Any future migration must be reproducible and committed.
3. Migration files should be generated from Prisma commands, not handwritten SQL by default.
4. Apply migrations in controlled environments only.
5. Never commit real secrets.

## TODO (deferred)

- define business schema rollout plan by domain
- define migration approval gate for high-risk changes
- define rollback/recovery playbook for production migrations

