# 09. KPI Model

## 1. Принцип

KPI строятся только из фактов.
Ручной ввод не должен быть основным источником ключевых показателей.
Live KPI не должны строиться тяжёлыми runtime JOIN по транзакционным таблицам.

---

## 2. Sales KPI

Источники:
- CRM
- Orders
- Payments

Примеры:
- leads count
- conversion lead -> deal
- conversion deal -> order
- paid revenue
- plan vs fact
- receivables in owned deals

---

## 3. Marketing KPI

Источники:
- CRM
- Finance / MarketingExpense
- Finance income

Примеры:
- leads by source
- CPL
- CAC
- ROMI
- revenue by channel

---

## 4. Finance KPI

Источники:
- Payments
- Finance
- Inventory

Примеры:
- income
- expenses
- gross profit
- period deviation
- procurement cost
- marketing cost

---

## 5. Logistics KPI

Источники:
- Logistics
- Orders

Примеры:
- deliveries per day
- slot load
- driver load
- on-time rate
- failed deliveries
- rescheduled deliveries

---

## 6. Warehouse KPI

Источники:
- Inventory
- Orders
- Finance

Примеры:
- stock levels
- stock turnover
- stale reservations
- out-of-stock attempts

---

## 7. Live и Snapshot

Поддерживаются два режима:
- LiveKPI
- SnapshotKPI

Правила:
- live пересчитывается при изменении фактов
- snapshot фиксируется на конец периода
- старый snapshot не переписывается задним числом
- при серьёзных расхождениях создаётся отдельная пометка о корректировке


## 7. Live KPI implementation rule

Обязательные правила:
- live-виджеты питаются из агрегированных таблиц, precomputed counters или cache
- обновление live-метрик выполняется асинхронно по событиям
- прямые тяжёлые JOIN между `CRM`, `Orders`, `Payments`, `Finance`, `Inventory` и `Logistics` для пользовательских виджетов запрещены

KPI остаётся read-layer и не может быть первичным бизнес-контуром.
