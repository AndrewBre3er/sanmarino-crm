# 29. Monorepo Bootstrap Spec


## Status

Accepted.

This document defines the required bootstrap specification for the CRM/ERP v1 monorepo.
Its purpose is to let Codex create the repository skeleton without guessing structure, app boundaries, or bootstrap artifacts.

Date of approval: `2026-04-03`

---

## 1. Purpose

This file defines:
- the canonical workspace structure
- mandatory bootstrap artifacts
- root-level configuration responsibilities
- initial application/package boundaries
- repository bootstrap sequence
- implementation constraints for first scaffolding

This file does **not** define:
- detailed domain implementation
- full UI implementation
- final CI vendor
- final monitoring vendor
- final infra vendor choices

These remain governed by other accepted docs or `TBD`.

---

## 2. Canonical repository model

The repository must be a `pnpm workspace` monorepo using the approved stack.

Canonical top-level structure:

```text
/
├─ apps/
│  ├─ web/
│  ├─ api/
│  └─ worker/
├─ packages/
│  ├─ ui/
│  ├─ config/
│  └─ types/
├─ docs/
├─ deploy/
├─ scripts/
├─ tests/
├─ .vscode/
├─ .editorconfig
├─ .env.example
├─ .gitattributes
├─ .gitignore
├─ AGENTS.md
├─ README.md
├─ package.json
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
└─ turbo.json
```

Notes:
- `turbo.json` is included as the task orchestration baseline for the monorepo.
- No additional top-level app folders may be created without ADR-level approval.
- No business-critical code may live at the repository root.

---

## 3. Mandatory bootstrap artifacts

The initial bootstrap must create the following files at root:

### 3.1 Root repository files
- `package.json`
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `.gitignore`
- `.gitattributes`
- `.editorconfig`
- `.env.example`
- `README.md`
- `AGENTS.md`

### 3.2 VS Code workspace support
- `.vscode/settings.json`
- `.vscode/extensions.json`

### 3.3 Deployment baseline
- `deploy/README.md`
- placeholder deployment artifacts for:
  - `nginx`
  - `compose`
  - `env templates`

### 3.4 Application bootstrap files
Each app must contain its own:
- `package.json`
- `tsconfig.json`
- source entrypoint
- test entry placeholder
- README or local usage note where useful

### 3.5 Package bootstrap files
Each package must contain:
- `package.json`
- `tsconfig.json`
- explicit public entrypoint

---

## 4. Root workspace contract

## 4.1 `package.json`
The root `package.json` must:
- declare the workspace package manager expectation
- expose root scripts
- avoid app-specific implementation details
- avoid business logic
- avoid runtime secrets

Minimum root scripts expected:
- `dev`
- `build`
- `test`
- `test:unit`
- `test:integration`
- `test:e2e`
- `lint`
- `typecheck`
- `format`
- `db:migrate`
- `db:generate`
- `compose:up`
- `compose:down`

If exact implementation of a script remains unresolved, the command may be a placeholder, but the script name must still be reserved.

## 4.2 `pnpm-workspace.yaml`
Must include:
- `apps/*`
- `packages/*`

No hidden or ad hoc workspace globs are allowed during bootstrap.

## 4.3 `tsconfig.base.json`
Must define:
- common TypeScript baseline for the repo
- shared path alias policy if approved for use
- strict mode expectation for app configs

App-level TypeScript configs may extend this file, but may not silently weaken core strictness without documented reason.

## 4.4 `.env.example`
Must include placeholders for:
- web app public config
- API app secrets and DB connection
- Redis connection
- auth/session secrets
- deploy/runtime environment references
- optional external provider placeholders marked `TBD`

Secrets must be placeholders only.
No real credentials may be committed.

## 4.5 `README.md`
Must explain:
- project purpose
- approved stack
- workspace layout
- local bootstrap steps
- basic dev commands
- link to canonical docs in `/docs`

## 4.6 `AGENTS.md`
Must instruct Codex to:
- treat accepted docs as source of truth
- avoid inventing missing business rules
- respect role/access boundaries
- avoid stack drift
- preserve monorepo boundaries

---

## 5. Application bootstrap specification

## 5.1 `apps/web`
Purpose:
- internal CRM/backoffice UI

Required baseline:
- Next.js 16 app scaffold
- TypeScript enabled
- `src/`-based code layout
- app shell placeholder
- auth/session-aware routing boundary placeholder
- test placeholder
- no direct database access

Initial internal structure target:

```text
apps/web/
├─ package.json
├─ tsconfig.json
├─ next.config.ts
├─ src/
│  ├─ app/
│  ├─ components/
│  ├─ features/
│  ├─ hooks/
│  ├─ lib/
│  ├─ providers/
│  ├─ styles/
│  └─ types/
└─ tests/
```

## 5.2 `apps/api`
Purpose:
- system of record for business rules, permissions, workflows, and critical mutations

Required baseline:
- NestJS application scaffold
- modular structure by domain
- health endpoint
- auth module placeholder
- RBAC/policy layer placeholder
- OpenAPI bootstrap
- test placeholder

Initial internal structure target:

```text
apps/api/
├─ package.json
├─ tsconfig.json
├─ src/
│  ├─ main.ts
│  ├─ app.module.ts
│  ├─ common/
│  ├─ config/
│  ├─ modules/
│  ├─ policies/
│  ├─ prisma/
│  └─ shared/
└─ tests/
```

## 5.3 `apps/worker`
Purpose:
- background jobs and asynchronous processing only

Required baseline:
- Node TypeScript worker app
- BullMQ bootstrap
- queue registration placeholder
- isolated worker entrypoint
- no HTTP authority role

Initial internal structure target:

```text
apps/worker/
├─ package.json
├─ tsconfig.json
├─ src/
│  ├─ main.ts
│  ├─ jobs/
│  ├─ queues/
│  ├─ workers/
│  └─ shared/
└─ tests/
```

---

## 6. Shared package bootstrap specification

## 6.1 `packages/ui`
Purpose:
- reusable UI components and presentation primitives for `apps/web`

Allowed contents:
- design-system primitives
- shared layout components
- reusable backoffice UI atoms/molecules
- no business authority

Not allowed:
- direct API business logic
- server authority checks
- app-specific route logic

## 6.2 `packages/config`
Purpose:
- shared repo-level config packages

Allowed contents:
- shared TypeScript config fragments
- shared lint/test config wrappers
- shared environment validation helpers if later approved

This package exists to centralize config, not domain logic.

## 6.3 `packages/types`
Purpose:
- shared safe-to-reuse TypeScript types and DTO-safe contracts

Allowed:
- primitive shared types
- contract-level response/request typing where safe
- enum mirrors only when explicitly controlled

Not allowed:
- leaking backend-only internal domain implementation details into web by default
- circular dependencies on app code

---

## 7. Docs bootstrap requirements

The `/docs` directory already contains canonical business and technical context.
Bootstrap work must preserve:
- numeric prefix ordering
- stable filenames once accepted
- source-of-truth status for approved docs

New docs created during bootstrap must:
- use English technical style for consistency
- avoid contradiction with accepted files
- use `TBD` instead of guessed decisions

---

## 8. Deployment bootstrap requirements

The initial bootstrap must prepare placeholders for VPS deployment without pretending deployment is finished.

Required deployment baseline structure:

```text
deploy/
├─ README.md
├─ compose/
│  ├─ docker-compose.yml
│  └─ .env.example
├─ nginx/
│  └─ default.conf
└─ scripts/
```

Rules:
- deployment files may start as placeholders
- production values must not be hardcoded
- service names must map clearly to `web`, `api`, `worker`, `postgres`, `redis`, and `nginx`
- deploy assets must remain compatible with Docker Compose + Nginx baseline

---

## 9. Bootstrap sequence

Codex must follow this order when generating the repository skeleton:

1. Create root workspace files and top-level folders.
2. Create `pnpm-workspace.yaml`, root `package.json`, and base TypeScript config.
3. Bootstrap `apps/web`, `apps/api`, and `apps/worker`.
4. Bootstrap shared packages under `packages/`.
5. Add placeholder tests for each app.
6. Add deployment placeholder files under `deploy/`.
7. Verify scripts, type references, and workspace resolution.
8. Do **not** begin domain implementation until bootstrap artifacts are stable.

---

## 10. Validation checklist for bootstrap

The bootstrap is acceptable only if:
- the repo installs from root with `pnpm install`
- each workspace package is discoverable
- root scripts resolve without broken references
- TypeScript configs extend cleanly
- web, api, and worker each have a compilable entry baseline
- no app depends on forbidden layers
- no real secrets exist in repo
- docs remain intact

---

## 11. Explicit prohibitions during bootstrap

The following are not allowed during the bootstrap phase:
- implementing domain logic before repo skeleton is stable
- introducing extra services outside approved stack
- creating hidden utility directories without contract
- placing backend business logic into `apps/web`
- allowing `apps/worker` to mutate domain state outside API/domain rules
- committing real credentials
- restructuring accepted docs without explicit need

---

## 12. Output expectation for Codex

At the end of bootstrap, the repository must be:
- installable
- understandable
- aligned to approved stack
- ready for the next task: initial implementation of the first vertical slice

The bootstrap phase is complete when the repo is structurally ready, not when business features are implemented.


## Mandatory architecture note

Bootstrap не должен зашивать ошибочную модель `Order -> DeliveryTask = 1:1` и должен предусмотреть слои для idempotency, outbox и soft delete.
