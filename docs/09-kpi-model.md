# 09. KPI Model

## 1. Принцип

KPI строятся только из фактов.
Ручной ввод не должен быть основным источником ключевых показателей.
Live KPI не должны строиться тяжёлыми runtime JOIN по транзакционным таблицам.

Также обязательно разделять:
- денежные показатели
- отгрузочные показатели
- контрольные показатели по деньгам в пути

Дополнение revised MVP v1:
- планы подразделений вводятся менеджером вручную как `plan`-слой
- факт (`fact`) рассчитывается только из доменных source-of-truth контуров
- KPI не может выступать источником истины для изменения CRM/Orders/Inventory/Payments/Finance

### 1.1 Plan/Fact contract

Обязательная модель:
- `DepartmentPlan` (manual, manager-entered)
- `KPI facts` (derived, immutable by dashboard editing)
- `KPI PlanFact View` (read-model сравнения плана и факта)

Запрещено:
- подменять факт ручным KPI-редактированием
- проводить доменные мутации через KPI-экран

---

## 2. CEO / Executive KPI

### 2.1 Обязательный набор v1
- денежная выручка
- отгружено
- валовая прибыль
- чистая прибыль
- остаток денег
- pipeline продаж
- конверсия в продажу
- CAC
- оборачиваемость запасов
- ожидаемые деньги от водителей
- проблемные заказы
- кредиторская задолженность поставщикам

### 2.2 Формулы и источники

#### Денежная выручка
Источник:
- `Payments`
- `CashOperation`
- `Finance`

Правило:
- считаются только подтверждённые поступления денег
- `payment.rejected` и неподтверждённые факты не признаются денежной выручкой
- период по умолчанию: текущий месяц
- должен поддерживаться переключатель периодов

#### Отгружено
Источник:
- `Orders`
- `Logistics`
- `Fulfillment`

Правило:
- сумма отгруженных заказов показывается отдельно от денежной выручки

#### Валовая прибыль
Формула:
- `отгружено - закупочная себестоимость отгруженного товара`

Источник:
- `Orders`
- `Inventory`

#### Чистая прибыль
Формула:
- `денежная выручка - все подтверждённые расходы`

Подтверждённые расходы включают:
- закупку товара
- подтверждённые обязательства перед поставщиками
- рекламу
- аренду
- зарплаты
- другие подтверждённые расходы

Это управленческая чистая прибыль, а не попытка подменить полный бухгалтерский контур.

#### Остаток денег
Источник:
- касса
- счета

Правило:
- учитываются только подтверждённые деньги
- деньги у водителей сюда не входят

#### Ожидаемые деньги от водителей
Источник:
- `Orders` со статусом отгрузки
- `Payments`
- контрольные флаги
- логистический контур

Правило:
- это отдельная метрика контроля
- она не должна смешиваться с остатком денег

#### Проблемные заказы
Источник:
- `Orders`
- `Payments`
- `Logistics`

Правило:
- заказ становится проблемным, если деньги не подтверждены до следующего рабочего дня

#### Кредиторская задолженность поставщикам
Источник:
- `SupplierRequest`
- `PurchaseReceipt`
- `Finance`

Правило:
- это отдельный показатель и он не должен смешиваться с клиентскими деньгами в пути

#### Pipeline продаж
Стадии:
- `Lead`
- `Deal`
- `Reserve / Supplier coverage`
- `Order`
- `Shipment`
- `Payment`

Правило:
- pipeline для директора показывается и в количестве, и в сумме

#### Конверсия в продажу
Источник:
- `Lead`
- `Deal`
- `Order`
- `Shipment`

Правило:
- момент продажи для этой метрики = первая отгрузка

#### CAC
Источник:
- `MarketingExpense`
- источники `Lead`
- первая отгрузка клиента

Правило:
- в расходы входят только `реклама + AVITO`
- учитываются только клиенты из платных каналов
- новый клиент считается в CAC в момент первой отгрузки

#### Оборачиваемость запасов
Формула:
- `себестоимость реализованного товара за месяц / средний товарный запас за месяц`

Правило:
- метрика считается коэффициентом
- основной период = месяц

---

## 3. Sales KPI

Источники:
- CRM
- Orders
- Payments

Примеры:
- leads count
- conversion lead -> deal
- conversion deal -> shipment
- shipped amount in owned deals
- money received in owned deals
- supplier coverage backlog in owned deals
- overdue follow-up count
- deals without next contact date
- stuck deals count
- lost reasons distribution
- client dedup/merge queue count

---

## 4. Finance KPI

Источники:
- Payments
- Finance
- Inventory
- Supplier coverage context

Примеры:
- денежная выручка
- расходы
- чистая прибыль
- supplier payables
- деньги у водителей
- проблемные заказы

---

## 5. Logistics KPI

Источники:
- Logistics
- Orders
- Payments control

Примеры:
- deliveries per day
- slot load
- driver load
- money-on-control orders
- problem orders by driver / route

---

## 6. Warehouse KPI

Источники:
- Inventory
- Orders
- Supplier coverage

Примеры:
- stock levels
- stock turnover
- stale reservations
- out-of-stock attempts
- received with discrepancy count
- low-stock alert count
- supply deficit amount and ETA risk

---

## 7. Live и Snapshot

Поддерживаются два режима:
- `LiveKPI`
- `SnapshotKPI`

Правила:
- live пересчитывается при изменении фактов
- snapshot фиксируется на конец периода
- старый snapshot не переписывается задним числом
- при серьёзных расхождениях создаётся отдельная пометка о корректировке

## 7.1 Live KPI implementation rule

Обязательные правила:
- live-виджеты питаются из агрегированных таблиц, precomputed counters или cache
- обновление live-метрик выполняется асинхронно по событиям
- прямые тяжёлые JOIN между `CRM`, `Orders`, `Payments`, `Finance`, `Inventory` и `Logistics` для пользовательских виджетов запрещены

KPI остаётся read-layer и не может быть первичным бизнес-контуром.

## 7.2 Stage 8E refresh write contract

This section defines the first accepted write contract for refreshing the KPI read layer.

Accepted first write target:
- `analytics.live_kpi_metrics`

Not authorized by this contract:
- writes to `analytics.snapshot_kpi_metrics`
- writes to `analytics.department_plans`
- source-domain mutations from KPI/reporting/automation
- formula calculation inside the persistence adapter

Live refresh write semantics:
- a future worker persistence adapter may upsert one current live KPI row by `(metric_code, scope_type, scope_id)`
- `metric_code` maps from `metricKey`
- `metric_value` is an already-computed input to the persistence adapter
- the adapter must not compute `metric_value`, read transactional source tables for formulas, or map source-domain events to metrics
- `metric_payload` is optional and may be `null`; its detailed shape is `TBD`
- formula ownership, source-domain event-to-metric mapping, and the source of each `metric_value` remain `TBD`

Accepted refresh write inputs:
- `metricKey` is required and must be one of the accepted shared KPI metric keys
- `period` is required as a non-empty grouping string for the refresh command, event, and idempotency boundary
- `scopeType` is required
- `scopeId` is nullable
- `refreshedAt` is required and must be a timestamp accepted by the worker boundary
- `idempotencyKey` is required

First accepted scope convention:
- `scopeType = "global"`
- `scopeId = null`

No department, user, warehouse, driver, channel, or other scoped KPI dimensions are accepted for refresh writes until docs define them explicitly.
The first implementation task must verify that the current Prisma/PostgreSQL mapping can enforce one live row for the nullable global scope. If it cannot, stop for schema/index alignment before implementing writes.

Period mapping:
- live refresh writes store `as_of = refreshedAt`
- `period` does not map to a column in `analytics.live_kpi_metrics`
- for live KPI, `period` is only an event/idempotency grouping value
- `period_start` and `period_end` belong to snapshot KPI and department plans; they are out of scope for the live refresh write contract
- calendar parsing, fiscal periods, timezone rules, and snapshot closing rules remain `TBD`

Durable idempotency:
- KPI refresh writes must use `system.idempotency_records`
- accepted idempotency scope: `kpi.live_metric_refresh`
- a repeated `idempotencyKey` with the same normalized request hash returns the prior completed result and must not write a second live row or enqueue a second outbox event
- a repeated `idempotencyKey` with a different normalized request hash is an idempotency conflict
- the normalized request hash includes `metricKey`, `period`, `scopeType`, `scopeId`, `refreshedAt`, `metricValue`, and `metricPayload` when present
- an in-progress record with an active lock must not run the write a second time
- a failed record is terminal for that `idempotencyKey`; retry requires a new `idempotencyKey` until a broader retry coordination policy is accepted

Transaction and outbox:
- the idempotency record claim/read, `analytics.live_kpi_metrics` upsert, `system.outbox_events` enqueue, and idempotency completion must commit atomically in one database transaction
- the outbox event type is `kpi.live_aggregate_refreshed`
- the outbox aggregate type is `analytics.live_kpi_metrics`
- the outbox aggregate id is the affected live KPI row id
- the event payload remains the accepted minimal payload: `metricKey`, `period`, `refreshedAt`
- `scopeType`, `scopeId`, and `idempotencyKey` stay outside the event payload until the shared event contract explicitly expands

Implementation readiness:
- a next narrow implementation task may implement only this live refresh persistence adapter contract for already-computed `metricValue`
- formulas, source-domain event-to-metric mapping, snapshot writes, department plan mutations, schedulers, API enqueue behavior, reporting UI, and notification/provider delivery remain out of scope

## 8. Workspace and integration control metrics (v1)

### 8.1 Deal supply visibility metrics
Источники:
- CRM + Orders supply summary read-model

Примеры:
- deals with partial coverage
- deficits amount by manager
- ETA breach risk
- linked supplier request backlog

### 8.2 Finance control metrics
Источники:
- Payments + Finance + Reconciliation

Примеры:
- external payment intake pending/rejected ratio
- supplier payables aging
- mismatch reports open/closed
- manual correction lifecycle throughput (`draft/pending_approval/approved/rejected/applied`)

### 8.3 Integration and notification health metrics
Источники:
- Integration inbound logs
- Notification dispatch logs

Примеры:
- ATS inbound idempotency duplicates prevented
- Avito inbound processing latency
- Telegram routing success/fail ratio
- MAX routing success/fail ratio

KPI этих контуров служит мониторингу и приоритизации действий, но не заменяет первичные доменные факты и журналы аудита.
