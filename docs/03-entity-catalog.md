# 03. Entity Catalog

## 1. CRM Layer

### Lead
Первичный входящий запрос.

### Client
Контрагент / покупатель.

### Contact
Контактное лицо клиента.

### Deal
Коммерческий контейнер.
Может содержать несколько заказов.
Не хранит факты склада, денег и доставки.

---

## 2. Order Layer

### Order
Операционный объект исполнения сделки.

### OrderItem
Позиция заказа.

### Fulfillment
Факт исполнения заказа.
Создаёт последствия для склада и логистики.

### ReturnRequest
Единая точка входа для возврата.
Без этой сущности возвраты запрещены.

---

## 3. Inventory Layer

### Product
Товарная единица.

### Warehouse
Склад.

### StockBalance
Состояние товара на складе:
- onHand
- reserved
- available

### Reservation
Резерв под заказ с TTL.

### InventoryMovement
Любое движение товара:
- receipt
- issue
- return_to_stock
- writeoff
- adjustment
- reservation_create
- reservation_release

### PurchaseReceipt
Факт поступления товара.

---

## 4. Payments Layer

### Payment
Факт оплаты по заказу.

### CashOperation
Денежная операция:
- cash_in
- cash_out
- refund

---

## 5. Logistics Layer

### DeliverySlot
Временной интервал доставки.

### PickupWindow
Окно самовывоза.

### Driver
Исполнитель доставки.

### Vehicle
Транспорт.

### RouteDay
Контейнер задач водителя на день.

### DeliveryTask
Атомарная задача доставки по заказу.

---

## 6. Finance Layer

### FinanceEntry
Доход, расход или коррекция.

### Expense
Расход по статье.

### MarketingExpense
Маркетинговый расход, связанный с каналом.

---

## 7. Analytics Layer

### LiveKPI
Текущий показатель.

### SnapshotKPI
Зафиксированный показатель периода.

---

## 8. Control Layer

### AuditEvent
Событие аудита.

### ReconciliationReport
Отчёт междоменной сверки.
