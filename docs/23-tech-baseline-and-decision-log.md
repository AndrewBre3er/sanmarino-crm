# 23. Tech Baseline and Decision Log


## Purpose

This document records accepted technical decisions for CRM/ERP v1.
It exists to prevent stack drift, mixed implementation styles, and undocumented framework changes.

Status model:
- `accepted` = canonical decision, mandatory for implementation
- `proposed` = candidate decision, not yet canonical
- `deprecated` = should not be used for new work
- `superseded` = replaced by a later accepted ADR

Date of update: `2026-04-03`

---

## Usage rules

- Codex must treat all `accepted` ADRs as source of truth.
- If there is no accepted ADR for a topic, use `TBD` and do not invent a technology choice.
- Any conflict between implementation and accepted ADR must be resolved in documentation before merge.
- This log complements `28-approved-tech-stack.md`. If an accepted ADR conflicts with older baseline placeholders, the accepted ADR wins.

---

## Global baseline status

The following baseline is now accepted:
- runtime: `Node.js 24 LTS`
- package manager: `pnpm`
- repository model: `pnpm workspace monorepo`
- frontend: `Next.js 16 + TypeScript`
- backend: `NestJS + TypeScript`
- database: `PostgreSQL 17`
- ORM/migrations: `Prisma ORM + Prisma Migrate`
- cache/queues: `Redis + BullMQ`
- tests: `Vitest + Playwright`
- deployment: `Docker Compose + Nginx`
- auth baseline: `custom auth module + httpOnly cookies + refresh rotation + TOTP for privileged roles`

See also: `28-approved-tech-stack.md`

---

## ADR-001

Status: `accepted`
Date: `2026-04-03`
Scope: `runtime`
Decision: Use `Node.js 24 LTS` as the canonical runtime for all first-party applications in the monorepo.
Why:
- one runtime across web, api, and worker
- consistent local setup on Win11 + VS Code
- simplified deployment and scripts
Impact on repo:
- all apps target the same Node major version
- `.nvmrc` / toolchain notes should align to Node 24
Impact on deploy:
- server images and containers must use Node 24
Impact on tests:
- CI and local test runs must execute on Node 24

---

## ADR-002

Status: `accepted`
Date: `2026-04-03`
Scope: `package-management-and-repo-layout`
Decision: Use `pnpm workspace` monorepo structure.
Why:
- multiple first-party apps are required: web, api, worker
- shared packages are needed for config, types, and UI
- single repo improves Codex-driven coordination
Impact on repo:
- use `/apps` and `/packages`
- avoid ad hoc package trees outside workspace conventions
Impact on deploy:
- build and deploy scripts should reference workspace apps explicitly
Impact on tests:
- test scripts should be runnable per app and from root workspace

---

## ADR-003

Status: `accepted`
Date: `2026-04-03`
Scope: `frontend`
Decision: Use `Next.js 16 + TypeScript` for the CRM/backoffice UI.
Why:
- good application shell and routing model for internal UI
- compatible with component reuse and workspace-based structure
- supports role-based workspace presentation cleanly
Impact on repo:
- frontend app resides in `apps/web`
Impact on deploy:
- web app runs as a dedicated service/container
Impact on tests:
- frontend behavior is covered by Playwright and focused component/integration tests where needed

---

## ADR-004

Status: `accepted`
Date: `2026-04-03`
Scope: `backend`
Decision: Use `NestJS + TypeScript` as the primary API and domain application.
Why:
- strong modular architecture for domain boundaries
- suitable for permission enforcement, workflows, audit, and background coordination
- clear separation between API/application logic and frontend
Impact on repo:
- backend app resides in `apps/api`
- business-critical logic must not be implemented in `apps/web`
Impact on deploy:
- API runs as its own service/container
Impact on tests:
- domain and API integration tests target `apps/api`

---

## ADR-005

Status: `accepted`
Date: `2026-04-03`
Scope: `api-style`
Decision: Use `REST JSON` for v1 and expose internal API documentation via `OpenAPI / Swagger`.
Why:
- faster delivery for internal product scope
- explicit endpoint semantics for workflow operations
- simpler testing and permission verification for v1
Alternatives considered:
- GraphQL as primary API model: rejected for v1
Impact on repo:
- endpoint contracts must be documented
Impact on deploy:
- API docs may be exposed only in controlled environments or secured internal access
Impact on tests:
- contract tests and integration tests align to REST endpoints

---

## ADR-006

Status: `accepted`
Date: `2026-04-03`
Scope: `database`
Decision: Use `PostgreSQL 17` as the single primary transactional database.
Why:
- one source of truth for transactional core
- fits finance, inventory, workflow, and audit needs
- reduces data consistency complexity in v1
Alternatives considered:
- MongoDB as primary transactional store: rejected
- multiple transactional databases in v1: rejected
Impact on repo:
- schemas and migrations target PostgreSQL
Impact on deploy:
- PostgreSQL runs as managed service or VPS-hosted service depending infra approval
Impact on tests:
- integration tests must run against PostgreSQL-compatible environment

---

## ADR-007

Status: `accepted`
Date: `2026-04-03`
Scope: `orm-and-migrations`
Decision: Use `Prisma ORM` and `Prisma Migrate`.
Why:
- type-safe DB access baseline
- consistent migration discipline
- good fit with TypeScript stack
Impact on repo:
- Prisma schema and migrations are canonical
- direct schema drift outside migration flow is prohibited
Impact on deploy:
- deploy process must run migrations in controlled order
Impact on tests:
- test database setup must support Prisma migration flow

---

## ADR-008

Status: `accepted`
Date: `2026-04-03`
Scope: `cache-and-queues`
Decision: Use `Redis` for cache/queue backing and `BullMQ` for background jobs.
Why:
- practical async baseline for retries, delayed jobs, notifications, reconciliation, and imports
- sufficient for v1 without external broker complexity
Alternatives considered:
- Kafka: rejected for v1
- RabbitMQ: rejected for v1
Impact on repo:
- worker app resides in `apps/worker`
Impact on deploy:
- Redis is required for full async capability
Impact on tests:
- async job tests should support isolated queue execution or mocked boundaries where appropriate

---

## ADR-009

Status: `accepted`
Date: `2026-04-03`
Scope: `frontend-data-layer`
Decision: Use the following frontend libraries:
- `TanStack Query`
- `TanStack Table`
- `React Hook Form`
- `Zod`
Why:
- suitable for CRM tables, filters, forms, and server-state management
- reduces ad hoc state and validation patterns
Impact on repo:
- these libraries are the preferred baseline in `apps/web`
Impact on tests:
- UI forms and data interactions should be tested against these conventions

---

## ADR-010

Status: `accepted`
Date: `2026-04-03`
Scope: `testing`
Decision: Use:
- `Vitest` for unit and integration tests
- `Playwright` for end-to-end tests
Why:
- one fast test runner for TypeScript app layers
- robust E2E coverage for role-based CRM workflows
Impact on repo:
- root scripts must expose lint, typecheck, unit, integration, and e2e commands
Impact on deploy:
- release readiness requires successful test runs according to release checklist
Impact on tests:
- permission boundaries, workflow transitions, and critical business flows are mandatory coverage areas

---

## ADR-011

Status: `accepted`
Date: `2026-04-03`
Scope: `deployment`
Decision: Deploy v1 on VPS using `Docker Compose + Nginx`.
Why:
- practical deployment baseline without unnecessary orchestration overhead
- suitable for web, api, worker, postgres, and redis topology
Alternatives considered:
- Kubernetes: rejected for v1
Impact on repo:
- deployment assets belong in `/deploy`
Impact on deploy:
- Compose definitions and reverse proxy configuration are required artifacts
Impact on tests:
- staging/smoke validation must reflect the Compose deployment model

---

## ADR-012

Status: `accepted`
Date: `2026-04-03`
Scope: `auth-and-access-control`
Decision:
- authentication is implemented in API as a custom auth module
- session transport uses `httpOnly cookies`
- refresh uses token rotation
- privileged roles use `TOTP` MFA
- access control uses `RBAC + field-level permissions + server-side checks`
Why:
- CRM contains sensitive financial, customer, and operational data
- UI-only permission checks are not acceptable
Impact on repo:
- permissions must be modeled in backend policy layers
- frontend may hide UI, but may not be authority
Impact on deploy:
- secure cookie and secret handling are mandatory in production
Impact on tests:
- permission and negative-access tests are mandatory

---

## ADR-013

Status: `accepted`
Date: `2026-04-03`
Scope: `architecture-boundaries`
Decision:
The following are prohibited in v1 without new ADR approval:
- microservices
- GraphQL as primary API model
- MongoDB as primary database
- frontend-only business-critical mutations
- direct frontend access to transactional database
- additional queue/broker systems
- Kubernetes
Why:
- prevents architecture drift and premature complexity
Impact on repo:
- contributors must not introduce these technologies by default
Impact on deploy:
- deployment remains single-VPS, multi-service Compose topology
Impact on tests:
- testing strategy stays aligned with current topology and boundaries

---

## Open items still unresolved

The following remain `TBD` and must not be guessed in implementation:
- CI provider
- monitoring / observability vendor stack
- backup tooling details
- VPS provider
- Linux distribution/version baseline
- object storage provider
- SMTP provider
- SMS or messaging provider if required

Use placeholders, interfaces, or environment contracts until approved.

---

## Start condition for coding

Coding may proceed under this decision log when the repo contains:
- canonical business docs in `docs/`
- `28-approved-tech-stack.md`
- this file
- environment placeholders
- current implementation task file
- bootstrap checklist

Any new foundational decision after this point must be added as a new ADR.
