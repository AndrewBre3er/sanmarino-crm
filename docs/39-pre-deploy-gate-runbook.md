# 39. Pre-Deploy Gate Runbook

## Status

Manual pre-deploy runbook for staging and production release candidates.

This document does not replace dedicated future docs for deployment architecture,
environment matrix, backup implementation, or operations runbooks. It defines the
minimum gate that must pass before a release candidate can move forward.

Priority:
- `AGENTS.md`
- `docs/08-architecture-fixes-and-critical-blockers.md`
- `docs/20-security-architecture.md`
- `docs/21-testing-strategy.md`
- `docs/22-qa-release-checklist.md`
- this runbook

---

## 1. Required Inputs

Before starting the gate, record:

- release commit SHA
- target environment: `staging` or `production`
- staging or production web URL
- staging or production API URL
- database connection secret name or vault path
- backup storage location
- previous deploy artifact or image tag
- operator responsible for approval

Secrets must not be printed to logs, committed to git, or copied into docs.

---

## 2. Environment and Secrets Gate

Required checks:

- only `.env.example` files are tracked in git
- real `.env` files are outside git
- `DATABASE_URL`, token secrets, cookie secrets, Redis URL, provider secrets, and integration tokens come from the environment or secret storage
- no command output contains secret values
- deploy compose/env templates use placeholders only

Local verification commands:

```bash
git ls-files | grep -E '(^|/)\.env($|\.)|env\.example$' | sort
git grep -n -I -E '(sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN (RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----|xox[baprs]-[A-Za-z0-9-]{20,})' -- . ':!pnpm-lock.yaml'
```

The first command may list templates. The second command must return no real
secret matches.

---

## 3. Migration Gate

Migrations must be reproducible on a clean PostgreSQL database before touching
staging or production.

Use production-style Prisma deploy, not `migrate dev`, for release validation:

```bash
pnpm --filter @sanmarino/api exec prisma migrate deploy --schema prisma/schema.prisma
pnpm --filter @sanmarino/api exec prisma migrate status --schema prisma/schema.prisma
```

Required result:

- all committed migrations apply from empty database
- `migrate status` reports the database schema is up to date
- `pnpm --filter @sanmarino/api prisma:validate` passes

Do not run migrations against staging or production until the backup gate is
complete.

---

## 4. Backup Gate

Before applying migrations to staging or production:

1. Create a PostgreSQL custom-format dump from the target database.
2. Store the backup outside the repository.
3. Record the backup filename, storage location, timestamp, source commit, and checksum.
4. Verify the dump is readable.

Reference commands:

```bash
backup_file="sanmarino-${TARGET_ENV}-${RELEASE_SHA}-$(date +%Y%m%d%H%M%S).dump"
pg_dump "$DATABASE_URL" --format=custom --no-owner --no-acl --file "$backup_file"
pg_restore --list "$backup_file" >/dev/null
sha256sum "$backup_file"
```

`DATABASE_URL` must come from secret storage and must not be echoed.

---

## 5. Rollback Plan

Rollback must be decided before deployment.

Preferred order:

1. If the application deploy fails before migrations, redeploy the previous app
   artifact or image tag.
2. If the application deploy fails after backwards-compatible migrations, redeploy
   the previous app artifact only when the previous app can read the migrated
   schema.
3. If the database must be rolled back, restore the verified backup into a new
   database, switch the app `DATABASE_URL`, and run smoke checks.
4. In-place destructive restore is allowed only with explicit operator approval
   and a recorded maintenance window.

Rollback verification:

- API health endpoint responds
- web health endpoint responds
- login works
- critical workspace opens
- Prisma migration status is understood for the restored database
- error logs do not show a new burst of 5xx, auth, or database errors

---

## 6. Manual Smoke Gate

Run smoke on the target staging URL after deploy and before production release.

Required smoke:

- `/api/health` or equivalent API health check
- web health/readiness endpoint
- login and logout
- denied access for a role without permission
- role workspace opens for at least admin/CEO/seller/warehouse/logistics/finance
- external payment fact confirm and reject paths
- finance manual correction baseline path
- supplier sourcing and linked supplier request surfaces
- CRM productivity surfaces: follow-up, next contact, reminders, lost reasons, stuck deals
- notification and integration surfaces
- order reserve or fulfillment baseline
- return request baseline
- audit trace visible for critical mutation where available
- KPI live/read surfaces load from aggregates/cache, not heavy realtime joins

Smoke may use prepared staging seed data. If seed data is missing, record that
as a release blocker instead of inventing production-like data during the gate.

---

## 7. Gate Record Template

Record the following before approving the release:

```text
Environment:
Release SHA:
Previous artifact/tag:
Backup file:
Backup storage:
Backup checksum:
Migration deploy result:
Migration status result:
Secrets scan result:
Smoke URL:
Smoke result:
Rollback plan:
Operator:
Approved at:
Open blockers:
```
