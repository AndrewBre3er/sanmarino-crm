# 21. Testing Strategy


## Purpose

Документ фиксирует стратегию проверки проекта на ошибки до начала полноценной разработки.

## Принципы

- Сначала тестируется доменная логика, потом UI.
- Наивысший приоритет у денег, остатков, статусов, возвратов и прав доступа.
- Негативные тесты обязательны.
- Backend является источником истины для критичной логики.
- Тесты должны быть воспроизводимыми и пригодными для CI.

## Уровни проверки

### 1. Static checks
- format
- lint
- typecheck
- schema validation
- migration validation
- build validation

Инструменты: `TBD`.

### 2. Unit tests
Проверяют:
- расчёты
- validators
- status transition rules
- TTL reserve logic
- weighted average calculations
- reconciliation rules
- idempotency helpers

### 3. Integration tests
Проверяют:
- CRM -> Deal -> Order
- Lead -> start-processing -> Deal
- Lead cancel with reason
- Deal -> supplier coverage -> auto-created Order
- SupplierRequest stores `business source` linkage and line-level `source line ref`
- Deal reserve request -> atomic Order + Reservation
- Order -> Inventory reserve
- partial reserve -> `ReadyForPartialShipment`
- full reserve -> `ReadyForShipment`
- Order -> Fulfillment
- Payment -> Finance cash basis
- Shipped but unpaid -> `OnControl`
- next business day unpaid -> `Problem`
- ReturnRequest -> refund / return flow -> quarantine
- receipt flow keeps `supplier_id` / optional `supplier_request_id` linkage
- receipt items enforce explicit UOM from strict v1 list
- role checks on API
- audit logging критичных действий

### 4. API / contract tests
Проверяют:
- обязательные поля запросов и ответов
- ошибки валидации
- permission-denied responses
- idempotency behavior
- field visibility rules
- strict UOM validation (`шт`, `кв.м`, `п.м`, `услуга`)
- supplier request source-line linkage contracts

### 5. E2E tests
Проверяют через интерфейс:
- login
- workspace `seller` (UI: `Продавец`)
- перевод lead в `в обработке`
- коммерческий `Deal`
- supplier request
- auto-created order
- сценарий частичной доставки с несколькими delivery task
- регистрацию оплаты
- складское исполнение
- логистическое исполнение
- контроль денег от водителя
- возврат по `ReturnRequest` с попаданием в quarantine
- ограничения разных ролей

### 6. Manual smoke tests
Перед релизом вручную:
- login
- ключевые workspace
- один полный заказ
- одна оплата
- одно исполнение
- один возврат
- проверка аудита

## P0 сценарии

Не должны ломаться:
- auth и permissions
- order materialization/readiness invariants
- reserve rules
- fulfillment close rules
- payment registration
- refund rules
- cash basis recognition
- return flow through `ReturnRequest`
- audit logging
- idempotency critical mutations

## Карта покрытия по доменам

### CRM
- создание лида
- переходы статусов лида
- конверсия в сделку
- участник `монтажник/дизайнер`
- связь client/contact

### Orders
- auto-created order
- `Assembling -> ReadyForPartialShipment`
- `Assembling -> ReadyForShipment`
- `PartiallyShipped -> Shipped`
- control flags `OnControl` / `Problem`
- запрещённые переходы
- корректность totals

### Inventory
- durable reserve только вместе с Order
- TTL expiry
- reserve release
- movement correctness
- receipt with discrepancy
- write-off только по факту исполнения

### Payments
- регистрация оплаты
- защита от двойного submit
- регистрация возврата
- лимиты возврата
- разделение подтверждённых денег и денег у водителей

### Finance
- доход только по cash basis
- отсутствие accrual side effects
- права доступа

### Logistics
- assignment задачи
- driver visibility
- completion flow
- escalation flow для проблемного заказа

### Users and access
- login / logout
- роль и workspace access
- hidden fields absence in API

### Audit
- создание audit event для критичных действий
- actor identity
- before/after там, где требуется

## Обязательные негативные тесты

- durable reserve без order
- списание при одном только readiness/status переходе заказа
- признание дохода без оплаты
- возврат без `ReturnRequest`
- повторная оплата с тем же idempotency key
- возврат сверх оплаченной суммы
- status transition вне state machine
- доступ `seller` к finance-only полям
- доступ `driver` к чужим доставкам
- доступ `warehouse` к role administration
- снятие `Problem` без подтверждения финансиста/директора

## Concurrency and idempotency

Отдельно проверить:
- двойной submit одной операции
- параллельные изменения статуса
- race между payment и refund
- race между reserve release и fulfillment

## CI quality gate

Перед merge в `main` должны проходить:
- format / lint
- typecheck
- unit tests
- integration tests
- permission tests
- build
- migration validation

Перед production deploy:
- release candidate build
- smoke tests
- pre-release checklist
- backup confirmation
- rollback readiness

## Что ещё нужно утвердить

- unit/integration runner
- e2e tool
- CI provider
- coverage thresholds
- mock strategy


## v8 Architecture Overrides

Обязательные P0 сценарии:
- атомарность `Deal -> auto Order + Reservation`
- частичный резерв и частичная отгрузка
- один order с несколькими delivery task и `PartiallyDelivered`
- возвратный товар не попадает в `available` до выхода из `quarantine`
- повтор критичной мутации с тем же `Idempotency-Key` не создаёт второй результат
- `GET /kpi/live` не строит тяжёлый runtime JOIN
