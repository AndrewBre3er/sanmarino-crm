# 03. Entity Catalog

## 1. CRM Layer

### Lead
Первичный входящий запрос из `АТС`, самописного сайта или `Avito`.
Живёт до решения менеджера:
- перевести заявку в `в обработке`
- отменить заявку с обязательной причиной

### Client
Покупатель / контрагент.
Client card v1 обязательно включает:
- address
- contact context
- linked deals/orders
- installer/designer referral context
- dedup/merge workflow context

### Contact
Основное контактное лицо клиента.

### ClientParticipant
Связанный участник клиентского контура.
Поддерживаемые типы v1:
- `монтажник`
- `дизайнер`

`ClientParticipant` не заменяет `Client` или `Contact`.
Он используется как отдельная структурированная связь в коммерческом контуре.

### Deal
Коммерческий заказ менеджера на первом этапе.
Содержит:
- клиента
- контактные данные
- ответственного менеджера
- связанных участников (`монтажник` / `дизайнер`)
- товарный состав
- единицы измерения
- цены
- итоговую сумму
- выбранный способ исполнения
- контекст резерва и обеспечения товаром
- follow-up / next contact / reminders
- lost reason
- communication history
- stuck-deal marker

`Deal` не хранит первичные факты:
- оплаты
- товарного расхода
- логистического исполнения

### FollowUp
Операционный контур следующего контакта и напоминаний по сделке.

### CommunicationRecord
Факт коммуникации с клиентом по сделке:
- канал
- направление
- краткий итог
- timestamp

### ClientMergeCase
Явный dedup/merge workflow кейс для клиентских карточек с audit-safe трассировкой.

---

## 2. Order Layer

### Order
Операционный заказ, создаваемый системой автоматически из `Deal`.
Заказ создаётся, когда клиент подтвердил намерение купить, согласованы сроки и цена, а товар обеспечен через:
- резерв полностью или частично
- и/или подтверждённую заявку поставщику с известным сроком поставки

### OrderItem
Позиция операционного заказа.
Содержит товарный snapshot, количество, единицу измерения, цену и сумму строки.

### DealSupplySummary
Derived summary read-model по обеспечению сделки:
- partial/full coverage
- deficits
- ETA
- linked supplier request context

Для каждой сделки допускается максимум один актуальный summary-объект (`0..1`).

### OrderControlFlag
Контрольный overlay-слой поверх состояния заказа.
Минимальные флаги:
- `on_control` — товар отгружен, но деньги ещё не подтверждены
- `problem` — деньги не подтверждены до следующего рабочего дня

### Fulfillment
Факт исполнения заказа полностью или частично.
Используется как основание для складского расхода.

### ReturnRequest
Единая точка входа для возврата.
Без этой сущности возвраты запрещены.
Lifecycle v1:
- `created`
- `confirmed`
- `processed`
- `closed`

---

## 3. Inventory and Supply Layer

### Product
Товарная единица.
Для order-commercial flow v1 единицы измерения ограничены списком:
- `шт`
- `кв.м`
- `п.м`
- `услуга`

### ProductSupplierLink
Матрица обеспечения товара:
- один `Product` -> несколько `Supplier`
- `supplier priority`
- `base purchase price`

`base purchase price` — чувствительное поле.
Не показывается ролям `seller`, `warehouse`, `logistics`.

### Warehouse
Склад.

### StockBalance
Состояние товара на складе:
- `on_hand`
- `reserved`
- `available`
- `quarantine`

### StockLock
Краткоживущая soft lock / pre-reserve под коммерческую подготовку.
Используется до создания durable reservation.

### Reservation
Durable reservation под операционный заказ.
Не существует без `Order`.

### Supplier
Справочник поставщиков.

### SupplierRequest
Заявка поставщику на недостающий товар.
Не меняет остатки напрямую.
Инициируется из коммерческого или складского контура.

Lifecycle v1:
- `formed`
- `confirmed_by_supplier`
- `paid`
- `stocked`

Обязательная трассировка v1:
- `business_source_type` = `deal` / `order`
- `business_source_id`
- line-level `source_line_ref` для каждой позиции заявки
- optional `source_line_context` для диагностики/аудита

### PurchaseReceipt
Факт поступления товара от поставщика.

Обязательные связи v1:
- `supplier_id` обязателен
- `supplier_request_id` опционален для приёмки, связанной с конкретной заявкой
- в строках поступления `unit` обязателен и ограничен списком `шт`, `кв.м`, `п.м`, `услуга`

### InventoryMovement
Любое движение товара:
- `receipt`
- `issue`
- `return_to_stock`
- `writeoff`
- `adjustment`
- `reservation_create`
- `reservation_release`
- `transfer_to_quarantine`
- `release_from_quarantine`

### LowStockAlert
Операционный алерт по низкому остатку.

### StaleReservationAlert
Операционный алерт по stale reservation.

### ReceiptDiscrepancyCase
Контур обработки расхождений при приёмке поставки.

---

## 4. Payments Layer

### Payment
Факт внешней оплаты по заказу в модели intake/control.

Lifecycle v1:
- `pending`
- `completed`
- `refunded`
- `rejected`

`rejected` — terminal result для отклонённого external payment fact.
При `rejected` не создаются `cash_in` и `finance income`.

### CashOperation
Денежная операция:
- `cash_in`
- `cash_out`
- `refund`

Деньги от водителя являются отдельным контролируемым потоком и не должны автоматически считаться подтверждённой выручкой без подтверждения.

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
Один заказ может иметь несколько delivery task.

### DriverMoneyControlCase
Контур контроля денег у водителя:
- ожидаемая сумма
- подтверждённая сумма
- статус эскалации (`OnControl` / `Problem` контекст)

---

## 6. Finance Layer

### FinanceEntry
Доход, расход или коррекция.

### Expense
Подтверждённый расход по статье.

### MarketingExpense
Маркетинговый расход, участвующий в расчётах `CAC`.

### SupplierPayable
Управленческий контур обязательств перед поставщиками.
Физическая модель может быть реализована через поставщика, supplier request, purchase receipt и finance records, но в управленческой логике это отдельный обязательный показатель.

### FinanceMismatchReport
Отчёт о междоменных финансовых невязках для контроля и reconciliation.

### ManualCorrection
Ручная финансовая корректировка с approval workflow:
- `draft`
- `pending_approval`
- `approved`
- `rejected`
- `applied`

Одна correction ссылается максимум на одну итоговую `FinanceEntry` (`0..1`).

---

## 7. Analytics Layer

### LiveKPI
Текущий показатель, рассчитанный из агрегатов.

### SnapshotKPI
Зафиксированный показатель периода.

### DepartmentPlan
Ручной план подразделения, задаваемый менеджером.

### KPIPlanFactView
View-модель plan/fact:
- plan — manager-entered
- fact — derived from source domains

KPI слой не является источником истины.

### ExecutiveMetric
Управленческий показатель для исполнительного директора.
Минимальный набор v1:
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

---

## 8. Control Layer

### AuditEvent
Событие аудита.

### ReconciliationReport
Отчёт междоменной сверки.

---

## 9. Integration and Notification Layer

### IntegrationInboundEvent
Входящее интеграционное событие (`ATS`, `Avito`) с идемпотентной обработкой.

### NotificationDispatch
Исходящее уведомление по каналам:
- `Telegram`
- `MAX`

Маршрутизация уведомлений должна быть permission-safe и основанной на доменных фактах.
