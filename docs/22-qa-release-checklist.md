# 22. QA Release Checklist


## Purpose

Документ фиксирует обязательный чеклист перед выпуском изменений в production.

## Перед релизом должно быть известно

- что изменилось
- какие домены затронуты
- есть ли миграции
- есть ли env changes
- кто отвечает за релиз
- какой rollback plan

## Mandatory technical gate

Обязательно:
- build проходит
- lint проходит
- typecheck проходит
- unit tests проходят
- integration tests проходят
- permission tests проходят
- migration validation проходит

Если любой из пунктов не выполнен, релиз блокируется.

## Security gate

Проверить:
- новые действия покрыты permission checks
- лишние поля не утекли в API
- критичные действия пишутся в audit
- секреты не попали в репозиторий
- `.env.example` не содержит реальных значений

## Data and migration gate

Если есть миграции:
- они воспроизводимы
- проверены на тестовой базе
- есть rollback или безопасная стратегия исправления
- не ломают state machine и core сущности

## Business logic gate

Нужно отдельно перепроверить:
- `Lead -> Deal -> Order(s) -> Fulfillment(s)`
- cash basis logic
- reserve only after confirmation
- write-off only by execution fact
- refund only via `ReturnRequest`
- state machine restrictions
- idempotency critical mutations

## Manual smoke-check

### Auth
- login
- logout
- denied access для запрещённой роли

### Sales
- открытие workspace
- просмотр core сущностей
- базовый сценарий заказа

### Payment / finance
- регистрация оплаты
- корректное отражение дохода по cash basis

### Inventory / fulfillment
- резерв появляется только после подтверждения
- исполнение создаёт складской факт
- нет списания по одному только order confirmation

### Return
- возврат идёт только через `ReturnRequest`

### Audit
- критичное действие попадает в журнал

### Permissions
- роль не видит чужой раздел и запрещённые действия

## UI / UX gate

Проверить:
- navigation shell не сломан
- workspace видны только нужным ролям
- скрытые поля реально скрыты
- ошибки видны явно, без silent failure

## Environment gate

Проверить:
- нужные env variables заданы
- новые secrets созданы вне git
- reverse proxy config не конфликтует
- background jobs config не потеряна

## Backup and rollback gate

Обязательно:
- backup создан
- известно, где он хранится
- понятна restore-процедура
- rollback plan зафиксирован

## Post-deploy verification

Сразу после выкладки проверить:
- приложение доступно
- login работает
- ключевой workspace открывается
- ключевой API отвечает
- нет всплеска 5xx
- нет явного роста 401 / 403
- логи не содержат массовых новых ошибок


## v8 Architecture Overrides

Перед релизом отдельно проверить:
- soft lock не превращается в durable reservation без confirm
- confirm не оставляет зависший reservation при падении логистики
- `Order.deliveryStatus` корректно агрегируется
- физический `DELETE` недоступен для `Order`, `Deal`, `Payment`, `ReturnRequest`
- live KPI endpoint'ы читают агрегаты
