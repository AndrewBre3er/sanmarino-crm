# Users / Roles / Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перевести проект с bootstrap-auth на каноническую модель `users/roles/permissions` с backend-enforced access baseline после обязательного `Prisma schema alignment`.

**Architecture:** Этот этап начинается только после выполнения отдельного плана [2026-04-05-prisma-schema-alignment.md](/C:/Users/USER/sanmarino-crm/docs/superpowers/plans/2026-04-05-prisma-schema-alignment.md). После schema alignment auth переводится с in-memory bootstrap accounts на Prisma-backed users, затем добавляется минимальный permission vocabulary и route/service guards без full policy engine. Web меняется только там, где это нужно для чтения реального current user и admin users shell.

**Tech Stack:** NestJS, Prisma ORM, PostgreSQL schemas, Next.js 16, Vitest, existing auth skeleton.

---

## Prerequisite

- Сначала выполнить план [2026-04-05-prisma-schema-alignment.md](/C:/Users/USER/sanmarino-crm/docs/superpowers/plans/2026-04-05-prisma-schema-alignment.md)
- Не начинать этот этап поверх legacy Prisma schema

## Guardrails

- Не трогать доменные статусы и бизнес-логику `orders/inventory/payments`.
- Не строить безопасность только на frontend.
- Не делать full RBAC/policy engine на этом этапе.
- Не ломать уже сделанный auth skeleton.
- Prisma-схема по другим доменам всё ещё содержит legacy-хвосты; в этом этапе менять только то, что нужно для `users.*` и для безопасной интеграции auth.

## Current Starting Point

- Ветка: `codex/auth-skeleton`
- Auth skeleton уже есть и закоммичен: `6de7b92`
- Рабочее дерево на момент планирования чистое
- Есть старый stash, его не трогать:
  - `stash@{0}: On codex/auth-skeleton: wip/pre-auth-alignment-before-docs-auth-flow`

## File Map

### Likely API files to create or modify

- Modify: `C:\Users\USER\sanmarino-crm\apps\api\prisma\schema.prisma`
- Modify: `C:\Users\USER\sanmarino-crm\apps\api\prisma\seed.ts`
- Modify: `C:\Users\USER\sanmarino-crm\apps\api\src\app.module.ts`
- Modify: `C:\Users\USER\sanmarino-crm\apps\api\src\modules\auth\auth.service.ts`
- Modify: `C:\Users\USER\sanmarino-crm\apps\api\src\modules\auth\auth.controller.ts`
- Modify: `C:\Users\USER\sanmarino-crm\apps\api\src\modules\auth\auth.contract.ts`
- Create: `C:\Users\USER\sanmarino-crm\apps\api\src\modules\users\users.module.ts`
- Create: `C:\Users\USER\sanmarino-crm\apps\api\src\modules\users\users.repository.ts`
- Create: `C:\Users\USER\sanmarino-crm\apps\api\src\modules\users\users.service.ts`
- Create: `C:\Users\USER\sanmarino-crm\apps\api\src\modules\users\users.controller.ts`
- Create: `C:\Users\USER\sanmarino-crm\apps\api\src\modules\users\roles.repository.ts`
- Create: `C:\Users\USER\sanmarino-crm\apps\api\src\modules\users\permissions.repository.ts`
- Create: `C:\Users\USER\sanmarino-crm\apps\api\src\modules\users\access.guard.ts`
- Create: `C:\Users\USER\sanmarino-crm\apps\api\src\modules\users\access.decorator.ts`
- Create: `C:\Users\USER\sanmarino-crm\apps\api\src\modules\users\access.contract.ts`
- Create: `C:\Users\USER\sanmarino-crm\apps\api\tests\unit\users.*.spec.ts`
- Create: `C:\Users\USER\sanmarino-crm\apps\api\tests\integration\users.*.spec.ts`

### Likely web files to create or modify later in this stage

- Modify: `C:\Users\USER\sanmarino-crm\apps\web\src\lib\auth\auth-session.ts`
- Modify: `C:\Users\USER\sanmarino-crm\apps\web\src\lib\auth\server-auth.ts`
- Modify: `C:\Users\USER\sanmarino-crm\apps\web\src\contracts\backoffice-shell.contract.ts`
- Create: `C:\Users\USER\sanmarino-crm\apps\web\src\app\backoffice\users\page.tsx`
- Create: `C:\Users\USER\sanmarino-crm\apps\web\src\app\backoffice\roles\page.tsx`
- Create: `C:\Users\USER\sanmarino-crm\apps\web\src\lib\auth\current-user.ts`
- Create/Modify tests under `C:\Users\USER\sanmarino-crm\apps\web\tests\`

---

### Task 1: Seed Baseline for Roles, Permissions, Users

**Goal:** Добавить безопасный dev seed для ролей, разрешений и персональных учёток.

- [ ] Обновить `prisma/seed.ts`
- [ ] Засидить:
  - departments baseline
  - canonical roles
  - minimal permission vocabulary
  - dev users for required roles
- [ ] Seed должен быть идемпотентным
- [ ] Реальные секреты не хранить в git
- [ ] Для dev users использовать documentable bootstrap credentials strategy
- [ ] Прогнать:
  - `pnpm db:seed`
  - `pnpm --filter @sanmarino/api test`

**Minimal permission vocabulary for this stage:**
- `users.read`
- `users.manage_roles`
- `users.manage_permissions`
- `auth.read_me`
- `crm.read`
- `orders.read`
- `payments.read`
- `inventory.read`
- `logistics.read`
- `returns.read`

---

### Task 2: Replace Bootstrap Accounts with Prisma-Backed Auth

**Goal:** Перевести auth skeleton с in-memory bootstrap accounts на реальных пользователей из БД.

- [ ] Сначала написать/обновить failing unit/integration tests на:
  - login from seeded user
  - `GET /auth/me` returns DB-backed user + roles
  - disabled/inactive user cannot login
- [ ] Заменить `AuthBootstrapAccountsService` на Prisma-backed account lookup
- [ ] Оставить session/token skeleton как есть, если это не мешает users stage
- [ ] Вернуть из `/auth/me` достаточно данных для web shell:
  - `userId`
  - `login`
  - `displayName`
  - `roleCodes`
  - `allowedWorkspaces`
- [ ] Прогнать:
  - `pnpm --filter @sanmarino/api test`
  - `pnpm --filter @sanmarino/api typecheck`

**Acceptance check:**
- login идёт по seeded DB users
- auth больше не зависит от hardcoded bootstrap accounts
- web может получить current user из реального user store

---

### Task 3: Backend Access Baseline

**Goal:** Добавить минимальные backend guards/decorators для role/permission checks без full RBAC engine.

- [ ] Создать access contract
- [ ] Добавить decorator для required roles/permissions
- [ ] Добавить guard, который читает current session user и применяет least-privilege checks
- [ ] Защитить минимум:
  - admin users endpoints
  - role/permission management endpoints
  - чувствительные attachment/finance-only mutation entry points, если они уже есть
- [ ] Зафиксировать, что UI не является источником безопасности
- [ ] Прогнать:
  - `pnpm --filter @sanmarino/api test`
  - targeted permission-denied tests

**Out of scope here:**
- object-level ownership engine
- field-level redaction engine for all domains
- policy DSL

---

### Task 4: Users / Roles API Surface

**Goal:** Добавить минимальный административный API для пользователей и ролей.

- [ ] Реализовать базовые endpoints:
  - `GET /users`
  - `GET /users/:id`
  - `PATCH /users/:id/roles`
  - `GET /roles`
  - `GET /permissions`
- [ ] Сразу покрыть permission tests:
  - `admin` allowed
  - non-admin denied
- [ ] Не реализовывать пока полный CRUD прав
- [ ] Прогнать:
  - `pnpm --filter @sanmarino/api test`
  - `pnpm --filter @sanmarino/api typecheck`

---

### Task 5: Minimal Web Integration

**Goal:** Перевести web auth/session на новые данные current user и показать минимальный admin shell.

- [ ] Обновить web current-user readers под новый `/auth/me`
- [ ] Обновить role/home logic, если user теперь может иметь несколько roles
- [ ] Выбрать deterministic rule для primary role в shell:
  - на этом этапе использовать один primary role для role-home
- [ ] Добавить shell-only screens:
  - `/backoffice/users`
  - `/backoffice/roles`
- [ ] Ограничить их видимость `admin`
- [ ] Прогнать:
  - `pnpm --filter @sanmarino/web exec next typegen`
  - `pnpm --filter @sanmarino/web typecheck`
  - `pnpm --filter @sanmarino/web test`

---

### Task 6: Final Verification and Commit

- [ ] Прогнать финальный набор:
  - `pnpm --filter @sanmarino/api prisma:validate`
  - `pnpm --filter @sanmarino/api typecheck`
  - `pnpm --filter @sanmarino/api test`
  - `pnpm --filter @sanmarino/web exec next typegen`
  - `pnpm --filter @sanmarino/web typecheck`
  - `pnpm --filter @sanmarino/web test`
- [ ] Проверить `git status --short`
- [ ] Сделать один итоговый коммит этапа

---

## Recommended Execution Order for Codex Prompts

1. `Prisma Alignment Step 1 — core enums`
2. `Prisma Alignment Step 2 — users models`
3. `Prisma Alignment Step 3 — user relations`
4. `Prisma Alignment Step 4 — supply/return contracts`
5. `Prisma Alignment Step 5 — seed/tests`
6. `Users Step 1 — seed roles/permissions/users`
7. `Users Step 2 — Prisma-backed auth`
8. `Users Step 3 — backend access baseline`
9. `Users Step 4 — admin users/roles API`
10. `Users Step 5 — minimal web integration`
11. `Users Step 6 — final verification`

## Key Risks

- Prisma alignment может затронуть много schema/test surface; поэтому он вынесен в отдельный prerequisite stage.
- MFA для `admin/finance/ceo` уже требуется docs, но полная реализация MFA остаётся следующим security slice.
- Если сразу делать multi-role UX в web, этап сильно расползётся; на этом этапе лучше зафиксировать primary-role shell rule.

## Done Criteria

- Auth использует реальных пользователей из БД
- Canonical roles seeded and queryable
- Basic backend permission checks работают
- Admin может увидеть пользователей/роли
- Web читает current user из DB-backed `/auth/me`
- Этап не ломает текущий auth flow и не влезает в full policy engine
