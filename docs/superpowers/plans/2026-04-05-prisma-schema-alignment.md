# Prisma Schema Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Привести `apps/api/prisma/schema.prisma` к текущим canonical docs до начала Prisma-backed `users/roles/permissions`.

**Architecture:** Сначала выравниваются enums и минимальные физические модели под актуальные docs, затем чинятся Prisma-связи на пользователя там, где сейчас временные string refs, и только после этого обновляются seed и тесты схемы. Этап не реализует бизнес-модули, а только подготавливает физическую схему и infra-контракты к следующему этапу users.

**Tech Stack:** Prisma ORM, PostgreSQL schemas, NestJS API, Vitest, existing repo scripts.

---

## Guardrails

- Не добавлять бизнес-реализацию CRM/Orders/Inventory поверх schema alignment.
- Не менять web.
- Не реализовывать `users/roles/permissions` API в этом плане.
- Следовать приоритету: `docs/08`, `docs/20`, `docs/24`, `docs/32`.
- Любое изменение схемы должно быть оправдано текущими docs, а не предположением.

## Starting Problem

Сейчас `apps/api/prisma/schema.prisma` расходится с актуальными docs:

- `DealStatus` legacy (`draft`, `qualified`, ...)
- `OrderStatus` legacy (`draft`, `confirmed`, ...)
- `ReturnRequestStatus` legacy (`draft`, `submitted`, ...)
- часть user references хранится как `String`, а не relation на `users.users`
- `users.*` таблицы в Prisma отсутствуют, хотя зафиксированы в `docs/32`

## File Map

- Modify: `C:\Users\USER\sanmarino-crm\apps\api\prisma\schema.prisma`
- Modify: `C:\Users\USER\sanmarino-crm\apps\api\prisma\seed.ts`
- Modify: `C:\Users\USER\sanmarino-crm\apps\api\tests\unit\prisma.infra-schema.spec.ts`
- Modify: `C:\Users\USER\sanmarino-crm\apps\api\tests\unit\persistence.prisma-conventions.spec.ts`
- Modify: `C:\Users\USER\sanmarino-crm\docs\32-physical-database-schema.md` only if a concrete mismatch is found during implementation

---

### Task 1: Align Core Enums

- [ ] Обновить Prisma enums под current docs:
  - `lead_status`: `new`, `in_processing`, `cancelled`
  - `deal_status`: `in_progress`, `converted_to_order`, `cancelled`
  - `order_status`: `assembling`, `ready_for_partial_shipment`, `ready_for_shipment`, `partially_shipped`, `shipped`
  - `return_request_status`: `created`, `confirmed`, `processed`, `closed`
  - `supplier_request_status`: `formed`, `confirmed_by_supplier`, `paid`, `stocked`
  - `product_unit`: `шт`, `кв.м`, `п.м`, `услуга`
- [ ] Не втаскивать лишние enums вне scope users-alignment readiness
- [ ] Прогнать:
  - `pnpm --filter @sanmarino/api prisma:validate`
  - `pnpm --filter @sanmarino/api typecheck`

---

### Task 2: Add `users.*` Physical Models

- [ ] Добавить в Prisma модели:
  - `users.departments`
  - `users.roles`
  - `users.permissions`
  - `users.role_permissions`
  - `users.users`
  - `users.user_roles`
- [ ] Зафиксировать canonical role codes из docs
- [ ] Не добавлять ещё policy-engine tables beyond docs
- [ ] Прогнать:
  - `pnpm --filter @sanmarino/api prisma:validate`

---

### Task 3: Replace Temporary User String Refs with Relations Where Safe

- [ ] Пройти по полям вроде:
  - `responsibleUserId`
  - `createdBy`
  - `deletedBy`
  - `requestedBy`
- [ ] Заменить string refs на relation to `users.users` там, где это уже явно описано в docs и не ломает scope
- [ ] Если какой-то relation тянет слишком большой cross-domain rewrite, оставить точечную техническую отсрочку, но минимизировать такие исключения
- [ ] Прогнать:
  - `pnpm --filter @sanmarino/api prisma:validate`
  - `pnpm --filter @sanmarino/api typecheck`

---

### Task 4: Add Missing Supply / Return Physical Contracts

- [ ] Проверить, что в Prisma отражены current physical contracts для:
  - `Supplier`
  - `SupplierRequest`
  - `SupplierRequestItem`
  - `PurchaseReceipt`
  - `PurchaseReceiptItem`
  - `ReturnRequest.requires_ceo_approval`
  - receipt linkage `supplier_id` / optional `supplier_request_id`
  - explicit `unit`
- [ ] Если этих моделей нет или они legacy, привести к `docs/32`
- [ ] Не реализовывать business logic поверх них
- [ ] Прогнать:
  - `pnpm --filter @sanmarino/api prisma:validate`

---

### Task 5: Seed + Schema Tests Alignment

- [ ] Обновить `prisma/seed.ts` под новую физическую схему
- [ ] Обновить schema-focused unit tests
- [ ] При необходимости добавить тест, что canonical enums и `users.*` модели присутствуют
- [ ] Прогнать:
  - `pnpm db:seed`
  - `pnpm --filter @sanmarino/api test`

---

### Task 6: Final Verification

- [ ] Прогнать:
  - `pnpm --filter @sanmarino/api prisma:validate`
  - `pnpm --filter @sanmarino/api typecheck`
  - `pnpm --filter @sanmarino/api test`
  - `git status --short`
- [ ] Сделать отдельный коммит schema alignment before users

---

## Done Criteria

- `schema.prisma` согласован с актуальными docs по статусам и `users.*`
- текущие user refs больше не живут как временные string-поля там, где relation уже обязателен
- seed и schema tests проходят
- этап подготовил базу для Prisma-backed `users/roles/permissions`
