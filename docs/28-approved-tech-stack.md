# 28. Approved Tech Stack


## Status

Accepted.

This document is the canonical technical baseline for CRM/ERP v1.
Codex, VS Code workflows, repository setup, and deployment decisions must follow this file.
If another document conflicts with this file, this file has priority until superseded by a new accepted ADR.

Date of approval: `2026-04-03`

---

## 1. Scope of this decision

This document fixes the approved stack for:
- application runtime
- repository structure
- frontend
- backend
- database
- queues and background jobs
- testing
- deployment baseline on VPS
- authentication and authorization baseline

This document does **not** finalize:
- exact VPS provider
- exact Linux distribution image
- exact monitoring vendor
- external object storage provider
- email/SMS provider

These items remain `TBD` until separately approved.

---

## 2. Canonical stack

### 2.1 Runtime and repository
- runtime: `Node.js 24 LTS`
- package manager: `pnpm`
- repository model: `monorepo`
- workspace model: `pnpm workspace`
- language: `TypeScript`

### 2.2 Frontend
- app: `Next.js 16`
- language: `TypeScript`
- router model: `App Router`
- UI target: internal backoffice / CRM workspace UI

### 2.3 Backend
- API service: `NestJS`
- language: `TypeScript`
- API style for v1: `REST JSON`
- API documentation: `OpenAPI / Swagger`

### 2.4 Data layer
- primary database: `PostgreSQL 17`
- ORM: `Prisma ORM`
- migrations: `Prisma Migrate`
- cache / queue store: `Redis`

### 2.5 Async processing
- job queue: `BullMQ`
- worker runtime: `Node.js`
- worker app: separate `worker` app inside monorepo

### 2.6 Frontend data and forms
- server state: `TanStack Query`
- tables / datagrid baseline: `TanStack Table`
- forms: `React Hook Form`
- schema validation baseline: `Zod`

### 2.7 Testing
- unit tests: `Vitest`
- integration tests: `Vitest`
- end-to-end tests: `Playwright`

### 2.8 Deployment on VPS
- containerization: `Docker`
- environment orchestration: `Docker Compose`
- reverse proxy: `Nginx`
- SSL termination: `Nginx`

### 2.9 Auth and security baseline
- auth model: custom auth module in API
- session transport: `httpOnly cookie`
- refresh strategy: `refresh token rotation`
- MFA: `TOTP` for privileged roles
- access model: `RBAC + field-level permissions + server-side enforcement`

---

## 3. Canonical repository layout

```text
/apps
  /web        # Next.js backoffice app
  /api        # NestJS API
  /worker     # BullMQ workers / background jobs
/packages
  /ui         # shared UI components
  /config     # shared lint/test/ts/env config
  /types      # shared types and contracts safe for reuse
/docs
/deploy
/scripts
/tests
```

Rules:
- `apps/web` must not contain domain authority or business-critical server logic.
- `apps/api` is the system of record for permissions, workflows, state validation, and critical mutations.
- `apps/worker` may execute background tasks, but may not bypass domain rules.
- Shared code in `packages/*` must not create circular dependencies between apps.

---

## 4. Architectural interpretation

### 4.1 Why this stack is approved

This project is a CRM/ERP-style system with:
- role-separated workspaces
- strict server-side access control
- workflow/state machine validation
- audit logging
- financial operations
- inventory and fulfillment operations
- background processing
- deployment to VPS without over-engineered infrastructure

The approved stack optimizes for:
- predictable backend architecture
- explicit domain modules
- testability
- strong TypeScript tooling
- practical VPS deployment
- compatibility with Codex-driven implementation

### 4.2 Mandatory architectural boundary

The system must not be implemented as a frontend-only app.
Critical rules must live in the API/domain layer.

Mandatory server-side responsibilities:
- permission checks
- status transition validation
- idempotency enforcement
- audit event creation
- finance and inventory invariants
- reservation and return rules
- event emission and async job scheduling

---

## 5. Approved implementation constraints

### 5.1 What is approved for v1
- modular monorepo
- separate `web`, `api`, and `worker` apps
- PostgreSQL as the single primary transactional database
- Redis as cache and queue backing store
- REST API for internal product delivery speed
- Docker Compose deployment on VPS
- role-based backoffice UI

### 5.2 What is explicitly not approved for v1
- microservices
- GraphQL as primary API model
- MongoDB as primary database
- Kubernetes
- frontend-only permission enforcement
- business logic inside client-side components
- direct database access from frontend
- mixed runtime stacks inside the same product core

---

## 6. Security interpretation of the stack

This stack is approved only under these conditions:
- all sensitive actions are enforced server-side
- API responses must be role-aware and field-aware
- privileged roles use MFA
- audit logs are generated for critical mutations
- production secrets are never committed into repo
- background jobs use authenticated internal app configuration
- database access is restricted to application and admin channels only

---

## 7. Testing interpretation of the stack

The approved stack requires:
- unit coverage for domain services and policy rules
- integration coverage for API + DB flows
- permission tests for every critical role boundary
- Playwright coverage for critical business paths
- pre-merge checks for lint, typecheck, tests, and build

The stack is not considered fully adopted unless test infrastructure is wired into repo workflows.

---

## 8. Open items still marked TBD

These are intentionally unresolved and must not be guessed by Codex:
- VPS provider
- Linux distribution/version baseline
- backup tooling details
- external file storage provider
- SMTP provider
- SMS/WhatsApp provider if needed
- observability vendor stack
- CI platform choice

Until approved, references to these areas must use placeholders or interface abstractions.

---

## 9. Rules for Codex and contributors

When generating code, use these rules:
- do not switch frameworks
- do not introduce alternative ORMs
- do not add another queue system
- do not replace REST with GraphQL
- do not introduce a second database for transactional core
- do not implement business-critical mutations in frontend
- do not bypass Prisma migrations
- do not create generic "super admin bypass" logic without explicit approval

If a task requires a technology outside this stack:
1. stop
2. mark the item as `TBD`
3. propose ADR update instead of silently changing the stack

---

## 10. Start condition for implementation

Implementation may start under this stack if the repository contains:
- `AGENTS.md`
- `docs/` with canonical business logic
- this file
- updated decision log
- env example placeholders
- deploy baseline placeholders
- current Codex task file

This stack is approved for the first implementation cycle.
