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
- SupplierRequest status flow: `formed -> confirmed_by_supplier -> paid -> stocked`
- SupplierRequest: only `finance`/`ceo` can set `paid`
- SupplierRequest: only `warehouse` can set `stocked`
- SupplierRequest: attachment upload allowed only for `warehouse`/`finance`/`ceo`
- SupplierRequest: attachment visibility allowed only for `warehouse`/`finance`/`ceo`
- Deal reserve request -> atomic Order + Reservation
- Order -> Inventory reserve
- partial reserve -> `ReadyForPartialShipment`
- full reserve -> `ReadyForShipment`
- Order -> Fulfillment
- Payment -> Finance cash basis
- Payment reject external fact -> terminal `rejected` without cash/finance income side effects
- Shipped but unpaid -> `OnControl`
- next business day unpaid -> `Problem`
- ReturnRequest -> refund / return flow -> quarantine
- ReturnRequest status flow: `created -> confirmed -> processed -> closed`
- ReturnRequest older than `14` days from canonical realization anchor requires `ceo` approval on `confirmed`
- ReturnRequest 14-day anchor uses `MIN(fulfillments.fulfilled_at)` across returned items (via fulfillment linkage), not order-level shipment timestamps
- receipt flow keeps `supplier_id` / optional `supplier_request_id` linkage
- receipt items enforce explicit UOM from strict v1 list
- low-stock alert generation and acknowledgement flow
- stale reservation alert generation and resolution flow
- receipt discrepancy lifecycle and escalation flow
- client dedup/merge workflow with audit-safe traceability
- manual correction workflow (`draft -> pending_approval -> approved/rejected -> applied`) with `0..1` final finance entry
- KPI plan/fact separation (manager-entered plans vs derived facts)
- ATS/Avito inbound idempotency and duplicate suppression before domain side effects
- Telegram/MAX outbound routing and permission-safe recipient filtering
- role checks on API
- audit logging критичных действий

### 4. API / contract tests
Проверяют:
- обязательные поля запросов и ответов
- ошибки валидации
- permission-denied responses
- idempotency behavior
- field visibility rules
- `base purchase price` must be hidden from `seller`/`warehouse`/`logistics`
- strict UOM validation (`шт`, `кв.м`, `п.м`, `услуга`)
- supplier request source-line linkage contracts
- supplier request status list and role-limited action contracts
- supplier request attachment ACL contracts
- return request status list contracts (`created`, `confirmed`, `processed`, `closed`)
- payment rejection contract (`POST /payments/{paymentId}/reject-external-fact`) -> terminal `rejected` + no cash/revenue side effects
- no public CRM-side payment creation contracts
- manual correction status/transition contracts and `0..1` applied finance entry cardinality
- KPI plan/fact read contracts keep KPI as derived layer only
- integration inbound contracts for `ATS`/`Avito` remain idempotent
- notification outbound contracts for `Telegram`/`MAX` preserve permission-safe routing

### 5. E2E tests
Проверяют через интерфейс:
- login
- workspace `seller` (UI: `Продавец`)
- перевод lead в `в обработке`
- коммерческий `Deal`
- supplier request
- supplier request statuses and role-limited actions
- auto-created order
- сценарий частичной доставки с несколькими delivery task
- регистрацию внешнего payment fact и confirm/reject control сценарии
- складское исполнение
- логистическое исполнение
- контроль денег от водителя
- возврат по `ReturnRequest` с попаданием в quarantine
- возврат старше `14` дней с обязательным `ceo` подтверждением
- mixed partial-delivery возврат: anchor берётся по минимальному `fulfillments.fulfilled_at` среди возвращаемых позиций
- client dedup/merge с сохранением linked deals/orders и audit trail
- purchase-price скрыт в UI/API для запрещённых ролей
- manual correction approval/apply flow
- role dashboards + saved filters + role notifications
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
- payment rejection terminal behavior (no cash-in / no finance income)
- refund rules
- cash basis recognition
- return flow through `ReturnRequest`
- manual correction approval/apply invariants
- purchase-price field-level visibility invariants
- KPI plan/fact separation (KPI not source of truth)
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
- перевод supplier request в `paid` ролью вне `finance`/`ceo`
- перевод supplier request в `stocked` ролью вне `warehouse`
- доступ к supplier request attachment ролью вне `warehouse`/`finance`/`ceo`
- `ReturnRequest.confirmed` без `ceo` при возрасте возврата более `14` дней
- расчёт 14-day CEO-gate от `orders.orders.shipped_at` / `orders.orders.partially_shipped_at` вместо канонического fulfillment-anchor

## Concurrency and idempotency

Отдельно проверить:
- двойной submit одной операции
- параллельные изменения статуса
- race между payment и refund
- race между reserve release и fulfillment
- race между duplicate ATS/Avito inbound events и первичной обработкой
- race между manual correction approval и apply

## Delta 0 supporting-doc coverage additions

Обязательные regression-проверки этой wave:
- payment rejection остаётся terminal (`rejected`) и не создаёт cash/revenue side effects
- CRM-side payment creation не появляется ни в API, ни в UI сценариях
- purchase price не утекает в API/UI для `seller`, `warehouse`, `logistics`
- client dedup/merge сохраняет audit trail и ссылки на связанные сущности
- manual correction workflow не допускает apply без approval и не нарушает `0..1` applied entry
- KPI dashboards используют plan/fact модель и не становятся источником истины
- ATS/Avito inbound обработка идемпотентна
- Telegram/MAX outbound routing подчинён permission boundaries
- warehouse alerts/discrepancy flow доступны и трассируются audit-событиями

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
