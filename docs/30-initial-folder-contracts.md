# 30. Initial Folder Contracts


## Status

Accepted.

This document defines the folder-level contracts for the CRM/ERP v1 monorepo.
Its purpose is to prevent structural drift, hidden logic placement, and unclear ownership between apps, packages, deployment assets, and documentation.

Date of approval: `2026-04-03`

---

## 1. Purpose

This file answers:
- what each top-level folder is for
- what is allowed inside each folder
- what must not be placed there
- what dependency direction is allowed
- where new code should be added by default

This file is binding for Codex and contributors during repository bootstrap and early implementation.

---

## 2. Canonical top-level contracts

## 2.1 `/apps`
Purpose:
- first-party runnable applications

Allowed children:
- `web`
- `api`
- `worker`

Rules:
- every child folder under `/apps` must be a runnable app
- shared libraries must not be placed here
- docs must not be placed here
- infra assets must not be placed here unless app-local and minimal

Dependency direction:
- apps may depend on `packages/*`
- apps must not import source files from other apps directly unless explicitly approved
- `web` must not import server implementation from `api`
- `worker` must not import private UI code from `web`

## 2.2 `/packages`
Purpose:
- shared reusable code used by more than one app or intended to be centrally managed

Allowed children:
- `ui`
- `config`
- `types`
- later shared packages only by explicit need

Rules:
- packages must expose clear public entrypoints
- packages must avoid circular dependencies
- packages must not become a dumping ground for unowned utilities
- business-critical domain authority must stay in `apps/api`

Dependency direction:
- packages may depend on other packages when justified
- packages must not depend on app source code

## 2.3 `/docs`
Purpose:
- canonical project context, ADRs, logic, process docs, security/testing docs, and implementation guidance

Rules:
- accepted docs are source of truth
- numeric prefixes are stable ordering aids
- docs should be additive, not casually renamed
- unresolved items must be marked `TBD`
- chat history is not source of truth once a doc is accepted

Not allowed:
- generated binary assets
- screenshots unless specifically needed
- hidden scratch notes used as pseudo-authority

## 2.3.1 `/.beads`
Purpose:
- repo-local task tracking and development workflow metadata

Allowed:
- issue/task tracking data
- execution planning metadata
- branch-aware workflow artifacts related to implementation tracking

Rules:
- `.beads/` is not a source of truth for business logic, architecture, API contracts, or domain rules
- canonical product and architecture decisions remain in `docs/*`
- `.beads/` may track tasks and dependencies, but must not override accepted documentation

## 2.4 `/deploy`
Purpose:
- VPS deployment assets, Compose files, Nginx configs, deploy scripts, and environment templates

Rules:
- deploy artifacts must reflect approved topology
- secrets must not be committed
- service names must map clearly to runtime services
- environment-specific values must be injected, not hardcoded

Not allowed:
- domain logic
- local-only experimental scripts without documentation

## 2.5 `/scripts`
Purpose:
- repository utility scripts for bootstrap, maintenance, dev workflow, or ops assistance

Allowed examples:
- setup helpers
- seed/bootstrap helpers
- maintenance scripts
- validation utilities

Rules:
- scripts must be explicit about target environment
- destructive scripts must require clear confirmation
- scripts must not silently rewrite source-of-truth docs

## 2.6 `/tests`
Purpose:
- repo-level or cross-app test assets

Allowed:
- E2E suites
- shared fixtures
- shared test utilities
- smoke-check assets
- cross-service integration test helpers

Rules:
- app-local tests may also exist inside each app
- repo-level tests should be used when the test spans multiple apps or deploy topology

---

## 3. App-level folder contracts

## 3.1 `/apps/web`
Purpose:
- user-facing internal CRM/backoffice interface

Primary responsibility:
- render role-based workspaces
- collect user input
- display data from API
- enforce UI-level hiding for usability
- never become system-of-record authority

Recommended internal layout:

```text
apps/web/src/
├─ app/          # routing, layouts, route groups
├─ components/   # generic UI components
├─ features/     # feature-oriented UI modules
├─ hooks/        # React hooks
├─ lib/          # app-local helpers, clients, adapters
├─ providers/    # app providers
├─ styles/       # styling entrypoints and tokens
└─ types/        # web-local types only
```

Not allowed in `apps/web`:
- direct database queries
- hidden business-rule enforcement as source of truth
- finance/inventory authority logic
- background worker logic
- server secrets embedded in client code

Dependency direction:
- may depend on `packages/ui`, `packages/types`, `packages/config`
- may depend on API contracts, but not API internals

## 3.2 `/apps/api`
Purpose:
- business authority and transactional core

Primary responsibility:
- authentication
- authorization
- domain modules
- workflow/state validation
- audit event creation
- API contract implementation
- integration with DB/Redis/queues

Recommended internal layout:

```text
apps/api/src/
├─ common/       # shared server concerns
├─ config/       # server config loading
├─ modules/      # domain/application modules
├─ policies/     # permission policies and guards
├─ prisma/       # db integration boundary
└─ shared/       # safe internal shared code
```

Not allowed in `apps/api`:
- UI components
- direct coupling to `apps/web` implementation
- undocumented cross-module mutation shortcuts
- bypass paths around policy and audit layers

Dependency direction:
- may depend on shared packages
- is the highest authority for business-critical state changes in v1

## 3.3 `/apps/worker`
Purpose:
- background processing and async orchestration

Primary responsibility:
- process queued jobs
- schedule retries/delayed work
- run reconciliation and non-interactive tasks
- emit logs/metrics/audit-supporting data where applicable

Not allowed in `apps/worker`:
- becoming an alternative public API
- bypassing business rules
- introducing separate domain truth from `apps/api`

Dependency direction:
- may use shared packages
- may reuse safe server-side modules only if architecture remains explicit
- must not become tightly coupled to web implementation

---

## 4. Shared package contracts

## 4.1 `/packages/ui`
Purpose:
- reusable interface primitives and shared design-system components

Allowed:
- buttons, inputs, modals, table primitives
- shared layout shells
- non-authoritative presentation helpers

Not allowed:
- API mutation business rules
- hidden auth authority
- direct DB or Redis code

## 4.2 `/packages/config`
Purpose:
- shared configuration baselines for tooling and apps

Allowed:
- tsconfig presets
- test config presets
- lint config presets
- shared env parsing helpers if approved

Not allowed:
- domain logic
- app-specific feature code

## 4.3 `/packages/types`
Purpose:
- shared TypeScript types safe for reuse

Allowed:
- shared primitive types
- shared DTO-level contracts
- basic enums mirrored by contract

Not allowed:
- leaking backend internal entities where not appropriate
- runtime-heavy code with side effects

---

## 5. Internal feature placement rules

When adding new functionality, default placement must follow this logic:

- UI rendering concern -> `apps/web`
- business rule / permission / workflow concern -> `apps/api`
- background or delayed processing concern -> `apps/worker`
- reusable presentation component -> `packages/ui`
- reusable config baseline -> `packages/config`
- safe shared typing -> `packages/types`
- business decision or process clarification -> `docs/`
- deploy topology or infra config -> `deploy/`
- repo helper utility -> `scripts/`
- cross-app or E2E test asset -> `tests/`

If a contributor cannot place a file confidently, the correct action is to stop and resolve the folder contract first, not improvise.

---

## 6. Dependency direction rules

Mandatory direction:

```text
docs -> informs all
packages -> reusable by apps
apps/web -> may consume packages and API contracts
apps/api -> may consume packages and data layer
apps/worker -> may consume packages and safe server-side shared contracts
deploy -> deploys apps and infra services
tests -> may exercise apps/packages/deploy topology
```

Forbidden default direction:
- `packages/* -> apps/*`
- `apps/web -> database`
- `apps/web -> worker internals`
- `worker -> web UI code`
- `docs -> runtime imports`

---

## 7. Naming and file-ownership rules

- Folder names should be explicit and stable.
- Feature folders should prefer domain or capability naming over generic names like `misc`, `helpers2`, `temp`, `common2`.
- Shared folders must have a clear owner and purpose.
- New top-level folders require explicit justification.
- Temporary experiments must not become permanent structure by accident.

---

## 8. Anti-drift rules

The following are common structural failures and are prohibited:
- placing logic in `utils/` without ownership
- copying shared code into multiple apps instead of extracting intentionally
- adding duplicate types across apps without contract review
- letting deployment scripts live in random locations
- using docs as a substitute for missing code boundaries
- using code comments instead of folder contracts for architecture decisions

---

## 9. Review checklist for folder placement

Before merge, contributors should confirm:
- Is the file in the correct top-level area?
- Does the file create forbidden dependency direction?
- Is this shared code actually shared?
- Does the placement preserve API authority?
- Would a new contributor understand why the file is here?
- Does the folder already have a documented purpose?

If any answer is unclear, placement is not yet good enough.

---

## 10. Start-of-implementation rule

Initial implementation must respect these folder contracts from the first commit.
Refactoring a bad structure later is more expensive than placing code correctly now.

This file remains binding until superseded by a later accepted architecture decision.


## Mandatory architecture note

В каталожных контрактах должны быть предусмотрены отдельные места для:
- idempotency middleware/guard
- outbox publisher / workers
- soft delete policies
- delivery-task aggregation logic
- quarantine inventory flows
