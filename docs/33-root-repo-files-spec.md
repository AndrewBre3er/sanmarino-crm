# 33. Root Repo Files Spec

## Status

Accepted.

This document defines the **exact repository bootstrap surface** that Codex must generate before feature coding begins.
It complements:
- `28-approved-tech-stack.md`
- `29-monorepo-bootstrap-spec.md`
- `30-initial-folder-contracts.md`
- `32-physical-database-schema.md`

The purpose is to remove ambiguity at the repository root and in the first-level apps/packages.

---

## 1. Mandatory root files

The repository root must contain exactly these baseline files on bootstrap:

```text
/
├─ package.json
├─ pnpm-workspace.yaml
├─ turbo.json
├─ tsconfig.base.json
├─ .gitignore
├─ .gitattributes
├─ .editorconfig
├─ .env.example
├─ README.md
├─ AGENTS.md
├─ .vscode/
│  ├─ settings.json
│  └─ extensions.json
├─ apps/
├─ packages/
├─ docs/
├─ deploy/
├─ scripts/
└─ tests/
```

No business code may live at root.

---

## 2. Required root file contracts

### 2.1 `package.json`
Purpose:
- workspace orchestration only

Must contain:
- `"private": true`
- `packageManager` pinned to `pnpm`
- root scripts for dev/build/test/lint/typecheck/format/db/compose
- no app runtime secrets
- no business logic

Required root scripts:
- `dev`
- `build`
- `lint`
- `typecheck`
- `format`
- `test`
- `test:unit`
- `test:integration`
- `test:e2e`
- `db:generate`
- `db:migrate`
- `db:seed`
- `compose:up`
- `compose:down`

Implementation note:
- commands may proxy into turbo or package-specific scripts
- script names are mandatory even if initial commands are placeholders

### 2.2 `pnpm-workspace.yaml`
Must include only:
- `apps/*`
- `packages/*`

No hidden or temporary globs.

### 2.3 `turbo.json`
Must define at minimum pipelines for:
- `build`
- `lint`
- `typecheck`
- `test`
- `test:unit`
- `test:integration`
- `test:e2e`

Rules:
- cacheable tasks must be declared explicitly
- environment-sensitive tasks should be marked carefully

### 2.4 `tsconfig.base.json`
Must define:
- strict TypeScript baseline
- shared compiler options
- shared path alias policy if used
- no weakening of strictness by default

### 2.5 `.env.example`
Must include placeholders for:
- web public config
- API config
- PostgreSQL
- Redis
- auth/session secrets
- worker config
- optional deploy/env placeholders marked `TBD`

No real secrets may be committed.

### 2.6 `README.md`
Must explain:
- project purpose
- approved stack
- repo layout
- local startup
- command reference
- link order for canonical docs in `/docs`

### 2.7 `AGENTS.md`
Must instruct Codex to:
- treat accepted docs as source of truth
- read docs in numeric order before generating code
- avoid inventing business rules
- respect role boundaries
- keep logic in API, not UI
- preserve bootstrap boundaries

### 2.8 `.vscode/settings.json`
Must include at minimum:
- format on save policy if approved
- TypeScript SDK preference if needed
- eslint integration baseline
- files.exclude only if minimal

### 2.9 `.vscode/extensions.json`
Recommended extensions:
- TypeScript support baseline
- ESLint
- Prettier
- Prisma
- Playwright
- Docker
- EditorConfig

---

## 3. Mandatory directory bootstrap

### 3.1 `apps/`
Must contain:
- `web`
- `api`
- `worker`

### 3.2 `packages/`
Must contain:
- `ui`
- `config`
- `types`

### 3.3 `deploy/`
Must contain at minimum:
- `README.md`
- `compose/`
- `nginx/`
- `env/`

### 3.4 `scripts/`
Must contain placeholders or utility scripts for:
- bootstrap
- database
- seed
- quality checks

### 3.5 `tests/`
Must contain at minimum:
- `e2e/`
- `integration/`
- `fixtures/`
- `smoke/`

---

## 4. App-level file requirements

## 4.1 `apps/web`
Must contain:
- `package.json`
- `tsconfig.json`
- `next.config.*`
- `src/app/`
- `src/components/`
- `src/features/`
- `src/lib/`
- `src/providers/`
- `src/styles/`
- minimal bootstrap app shell page
- minimal health/readiness route handlers for bootstrap checks

Must not contain:
- direct Prisma/db access
- business-critical workflow authority
- secret-bearing server code in client bundles

## 4.2 `apps/api`
Must contain:
- `package.json`
- `tsconfig.json`
- `nest-cli.json` or equivalent bootstrap config
- `src/main.ts`
- `src/app.module.ts`
- `src/common/`
- `src/config/`
- `src/modules/`
- `src/policies/`
- `src/prisma/`
- `prisma/`

Must include baseline modules or placeholders for:
- app bootstrap shell
- health
- prisma infrastructure shell

## 4.3 `apps/worker`
Must contain:
- `package.json`
- `tsconfig.json`
- source entrypoint
- queue bootstrap
- job registration placeholder

Must include job placeholders for:
- outbox processing
- KPI recompute
- reservation/lock expiry cleanup
- reconciliation jobs

---

## 5. Package-level file requirements

## 5.1 `packages/ui`
Must contain:
- `package.json`
- `tsconfig.json`
- public export entrypoint
- shared presentational components only

## 5.2 `packages/config`
Must contain:
- `package.json`
- `tsconfig.json`
- exported shared config where appropriate

May include:
- eslint config
- prettier config
- tsconfig presets
- env helpers that are safe to share

## 5.3 `packages/types`
Must contain:
- `package.json`
- `tsconfig.json`
- public export entrypoint
- shared safe types/interfaces/contracts

Must not contain:
- domain mutation logic
- app-specific runtime code

---

## 6. Required deploy files

The bootstrap must create these placeholders:

```text
deploy/
├─ README.md
├─ compose/
│  ├─ docker-compose.dev.yml
│  └─ docker-compose.vps.yml
├─ nginx/
│  └─ crm.conf.example
└─ env/
   ├─ api.env.example
   ├─ web.env.example
   └─ worker.env.example
```

The bootstrap is not required to finalize production deployment, but the file surface must exist.

---

## 7. Required test bootstrap files

At minimum:

```text
tests/
├─ e2e/
│  └─ playwright.config.* or central config reference
├─ integration/
├─ fixtures/
└─ smoke/
```

Also required:
- API-side unit/integration test placeholders inside `apps/api`
- web-side basic test placeholders only if used in v1

---

## 8. Required database bootstrap files

Inside `apps/api/prisma/` bootstrap must include:
- `schema.prisma`
- `seed.ts` or `seed.js`
- migrations directory placeholder if migration already initialized

`schema.prisma` must be designed for:
- PostgreSQL
- infra-only placeholder baseline
- TODO markers for deferred business schemas/models

---

## 9. Minimal file content quality bar

Bootstrap content must be:
- syntactically valid
- installable
- lintable or closeable with one follow-up pass
- free of fake secrets
- free of business logic guesses
- consistent with monorepo boundaries

Not acceptable:
- empty repo with only folder names
- placeholder comments without runnable scaffold
- hidden stack drift from approved tech stack
- direct contradiction of docs `08`, `28`, `29`, `30`, `32`

---

## 10. Acceptance criteria for bootstrap completion

Bootstrap is considered complete only if:
- workspace install works
- root scripts exist
- `apps/web`, `apps/api`, `apps/worker` all have valid manifests
- Prisma bootstrap exists in API
- deploy placeholders exist
- test placeholders exist
- docs remain intact
- no unauthorized domain logic was invented
