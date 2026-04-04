# 02. Domain Map

## 1. CRM
Ответственность:
- `Lead` (источник: АТС, сайт, Avito)
- `Client`
- `Contact`
- `ClientParticipant` (`монтажник` / `дизайнер`)
- `Deal` как коммерческий контур менеджера
- источник лида и ответственный менеджер

Источник истины:
- коммерческий контекст до операционного заказа

Не отвечает за:
- складской остаток
- денежный факт
- факт логистического исполнения

---

## 2. Orders
Ответственность:
- `Order` (автосоздание из `Deal` по правилам обеспечения)
- `OrderItem`
- `Fulfillment`
- `ReturnRequest`
- операционные статусы `Assembling -> ReadyForPartialShipment -> ReadyForShipment -> PartiallyShipped -> Shipped`
- overlay-флаги контроля `OnControl` / `Problem`

Источник истины:
- операционный жизненный цикл заказа и исполнения

---

## 3. Inventory + Supply
Ответственность:
- `Product`, `Warehouse`, `StockBalance`
- short-lived `StockLock` (soft lock / pre-reserve)
- durable `Reservation`
- `InventoryMovement`, `PurchaseReceipt`
- `Supplier`, `SupplierRequest`
- `quarantine` и дефектовка возвратов

Источник истины:
- товарный факт и факт обеспечения товаром

Модель себестоимости:
- `weighted average`

---

## 4. Payments
Ответственность:
- `Payment`
- `CashOperation`
- денежные возвраты
- контроль потока денег от водителя до подтверждения

Источник истины:
- денежный факт

---

## 5. Logistics
Ответственность:
- `DeliverySlot`
- `PickupWindow`
- `Driver`, `Vehicle`, `RouteDay`
- `DeliveryTask`
- факт доставки / самовывоза

Правило:
- связь `Order -> DeliveryTask = 1:N`, статус доставки заказа агрегируется

Источник истины:
- логистический факт исполнения

---

## 6. Finance
Ответственность:
- `FinanceEntry`
- `Expense`
- `MarketingExpense`
- `SupplierPayable`
- управленческое отражение доходов/расходов по `cash basis`

Источник истины:
- финансовое отражение денежных и подтверждённых расходных фактов

---

## 7. KPI / Analytics
Ответственность:
- `LiveKPI`
- `SnapshotKPI`
- `ExecutiveMetric`

Важно:
- не источник истины
- только производный read-layer
- live-расчёты через агрегаты/кэш, без тяжёлых runtime JOIN

---

## 8. Users / Roles / Permissions
Ответственность:
- пользователи
- роли
- матрица доступа
- ограничения на уровне страниц/блоков/полей/действий/API

Базовые роли v1:
- `Админ`
- `Продавец`
- `Кладовщик`
- `Логист`
- `Финансист`
- `Исполнительный директор`
- `Водитель` (опционально в раннем этапе)

---

## 9. Audit
Ответственность:
- кто/что/когда изменил
- ручные вмешательства
- `admin override`
- трассировка критических мутаций

---

## 10. Reconciliation
Ответственность:
- междоменная сверка (`Orders/Payments/Inventory/Logistics/Finance`)
- контроль расхождений по деньгам у водителей (`OnControl` / `Problem`)
- отчёты и эскалации

Важно:
- это сервисный контрольный контур
- это не замена `Audit`
