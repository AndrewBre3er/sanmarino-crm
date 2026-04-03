# 26. Current Task for Codex


## Context

Проект находится в pre-start фазе.
Документация по логике, ролям, безопасности, тестированию и UI/UX уже подготовлена.

## Mandatory reading order

Перед любой работой агент обязан прочитать:
1. `README.md`
2. `AGENTS.md`
3. весь каталог `docs/`
4. в особенности:
   - `08-architecture-fixes-and-critical-blockers.md` — документ наивысшего приоритета для архитектурных конфликтов
   - `01-system-logic.md`
   - `04-state-machines.md`
   - `06-data-integrity-rules.md`
   - `13-database-architecture.md`
   - `14-api-contracts.md`
   - `15-event-model.md`
   - `17-ui-ux-architecture.md`
   - `18-role-based-workspaces.md`
   - `20-security-architecture.md`
   - `21-testing-strategy.md`
   - `23-tech-baseline-and-decision-log.md`
   - `24-mvp-scope-v1.md`
   - `25-development-standards.md`

## Current objective

Подготовить проект к безопасному старту разработки в выбранном стеке без нарушения доменной логики.

## What is allowed now

Допустимо:
- уточнять структуру репозитория
- добавлять безопасные каркасы каталогов и файлов
- подготавливать абстрактные интерфейсы
- подготавливать README / setup / bootstrap документы
- делать стек-специфичный старт только после утверждения tech baseline

## What is not allowed now

Запрещено:
- придумывать технологический стек без подтверждения
- смешивать несколько стеков в одном решении
- добавлять новые статусы, переходы и финансовые правила
- реализовывать доступы только на frontend
- реализовывать accrual вместо cash basis
- делать durable reservation на стадии draft вместо short-lived soft lock
- делать refund без `ReturnRequest`

## First coding step after stack approval

1. bootstrap проекта под выбранный стек
2. format/lint/typecheck/test scaffolding
3. app shell
4. auth skeleton
5. users/roles/permissions module
6. domain skeleton for core modules

## Acceptance criteria for current phase

Pre-start фаза закрыта, если:
- стек утверждён
- MVP v1 утверждён
- security/testing baseline утверждён
- структура репозитория готова
- Codex получает однозначный стартовый контекст


## v8 Architecture Overrides

Обязательный приоритет чтения: `08-architecture-fixes-and-critical-blockers.md`.

Запрещено:
- проектировать `Order -> DeliveryTask` как `1:1`
- оставлять частично успешное подтверждение заказа без rollback/compensation
- переводить return flow сразу в `available`, минуя `quarantine`
- делать физический `DELETE` для `Order`, `Deal`, `Payment`, `ReturnRequest`
- строить `GET /kpi/live` на тяжёлых runtime JOIN
