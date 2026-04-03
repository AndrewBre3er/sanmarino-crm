# 06. Data Integrity Rules

## 1. Idempotency

Каждая критическая мутация должна иметь `idempotencyKey`.
Проверка ключа должна выполняться до входа запроса в доменный сервис.

Минимум:
- payment create
- refund create
- inventory receipt
- inventory issue
- finance entry create
- delivery close
- critical order transition

Правило:
- повтор с тем же ключом не должен создавать второй результат

---

## 2. Soft lock и reservation TTL

Short-lived soft lock:
- допускается для `Draft`
- используется для защиты от race condition
- имеет короткий TTL, ориентир `5-10 минут`
- не заменяет durable reservation

Durable reservation:
- создаётся только для confirmed order
- имеет срок жизни
- снимается при отмене заказа
- контролируется регулярной задачей
- ручное снятие попадает в audit

## 3. State Machine Enforcement

Любой переход статуса:
- валидируется на backend
- не должен зависеть только от UI
- вне схемы разрешён только через admin override с audit

---

## 4. Source of Truth Rule

Нельзя:
- считать факт оплаты из order без payments
- считать факт доставки из deal без logistics
- считать остаток из CRM
- считать KPI первичным фактом

---

## 5. Междоменная атомарность и компенсация

Критические операции, затрагивающие несколько доменов:
- должны выполняться в одной БД-транзакции с rollback
- либо через Saga / Transactional Outbox + compensating actions

Нельзя оставлять:
- активный reservation без согласованной логистики
- частично подтверждённый заказ без компенсирующего статуса
- незавершённые междоменные мутации без следа в audit/system events

---

## 6. Soft delete

Следующие сущности не удаляются физически:
- `Order`
- `Deal`
- `Payment`
- `ReturnRequest`

Для них допустимы только:
- `deleted_at`
- `is_deleted`
- архивный/отменённый статус, если применимо

---

## 7. Возвратный quarantine

Любой товарный возврат:
- по умолчанию зачисляется в `quarantine`
- не увеличивает `available` автоматически
- переводится в доступный остаток только после ручной дефектовки

---

## 8. Live KPI

Live KPI:
- не должны строиться тяжёлыми runtime JOIN по транзакционным таблицам
- должны обновляться асинхронно по событиям
- должны читаться из агрегированных таблиц, materialized views или cache

---

## 9. Price source of truth

В `OrderItem` должны быть разделены:
- retail price
- скидка
- line total
- cost

Себестоимость не может храниться как retail price и не должна подменять ценовую логику заказа.

---

## 10. Reconciliation

Ежедневно должна запускаться сверка:

### CRM ↔ Payments
Сумма оплат по заказам = сумма денежных операций.

### CRM ↔ Inventory
Отгруженные позиции = расходные движения товара.

### Inventory ↔ Finance
Сумма приходов = закупочные расходы за период.

### Logistics ↔ CRM / Orders
Доставленные задачи = исполненные доставки по заказам.

Результат:
- reconciliation report
- алерт ответственному при выходе за допуск
