# 13. Database Architecture


## Статус документа

Канонический технический документ для проектирования логической архитектуры БД.

Документ опирается на уже зафиксированные правила проекта:
- `Lead -> Deal -> Order(s) -> Fulfillment(s)`
- разделение доменов и источников истины
- `cashBasis`
- `ReturnRequest` как обязательная точка входа для возвратов
- `idempotency`
- `state machine`
- `TTL` резервов
- `weighted average`
- `reconciliation`

Документ **не фиксирует**:
- конкретный движок БД
- конкретный ORM
- конкретную стратегию шардирования
- конкретную миграционную библиотеку
- конкретный runtime-стек приложения

Этот документ задаёт **логическую модель данных**, границы доменов и обязательные инварианты.

---

## 1. Назначение логической архитектуры БД

Логическая БД проекта должна обеспечивать:
- хранение первичных фактов по доменам
- строгие границы между коммерческим, операционным, товарным, денежным и финансовым слоями
- транзакционную целостность критических операций
- воспроизводимость расчётов
- междоменную сверку
- прослеживаемость через аудит

Ключевой принцип:
**CRM не является универсальным хранилищем всех фактов.**
Каждый факт должен жить в своём домене.

---

## 2. Базовые принципы моделирования

### 2.1 Разделение по доменам

Логическая схема делится на следующие домены:
- `crm`
- `orders`
- `inventory`
- `payments`
- `logistics`
- `finance`
- `analytics`
- `users`
- `audit`
- `system`

`system` используется только для технических таблиц уровня платформы.

---

### 2.2 Источники истины

Источник истины по основным фактам:
- `crm` — `Lead`, `Client`, `Contact`, `Deal`
- `orders` — `Order`, `OrderItem`, `Fulfillment`, `ReturnRequest`
- `inventory` — остатки, резервы, движения, поступления
- `payments` — оплаты и возвраты денег
- `logistics` — слоты, задачи, исполнение доставки и самовывоза
- `finance` — доходы, расходы, корректировки
- `analytics` — производные KPI
- `audit` — журнал действий и вмешательств

---

### 2.3 Cash basis

Финансовый доход признаётся по факту оплаты.

Следствия для БД:
- `orders` не должен хранить признак признанного дохода как первичный факт
- `finance` отражает доход на основе факта из `payments`
- отгрузка и исполнение заказа не создают доход автоматически без денежного события

---

### 2.4 Fulfillment и расход товара

Расход товара создаётся только по подтверждённому факту исполнения:
- доставка исполнена
- самовывоз выдан
- иной подтверждённый факт исполнения

Следствия для БД:
- `orders.order` и `crm.deal` не создают товарный расход сами по себе
- расход должен быть привязан к `orders.fulfillment` и отражён в `inventory.inventory_movement`

---

### 2.5 ReturnRequest как обязательная точка входа

Возврат не может появиться напрямую через деньги или склад.

Следствия для БД:
- возврат денег должен ссылаться на `orders.return_request`
- возврат товара на склад или списание должны ссылаться на `orders.return_request`
- финансовая коррекция по возврату также должна ссылаться на `orders.return_request`

---

### 2.6 Идемпотентность

Все критические мутации должны быть защищены `idempotencyKey`.

Следствия для БД:
- должна существовать техническая таблица идемпотентности
- повтор операции с тем же ключом не должен создавать второй факт

---

### 2.7 State machine

Статусы не могут меняться произвольно.

Следствия для БД:
- каждое статусное поле хранит только допустимое значение
- переходы проверяются прикладным слоем
- вне схемы разрешён только `admin override` с обязательным событием в `audit`

---

## 3. Общие требования к таблицам

### 3.1 Обязательные системные поля

Для всех изменяемых сущностей должны существовать базовые технические поля:
- `id`
- `created_at`
- `updated_at`

Для сущностей с обязательным мягким удалением должны существовать поля:
- `deleted_at`
- `deleted_by` — optional/TBD
- `delete_reason` — optional/TBD

Обязательная soft delete policy применяется минимум к:
- `orders.order`
- `crm.deal`
- `payments.payment`
- `orders.return_request`

Удаление фактов, влияющих на деньги, остатки, статусы исполнения и аудит, физическим `DELETE` запрещено.

---

### 3.2 Денежные поля

Все денежные суммы должны храниться отдельно от статусов и отдельно от вычисляемых витрин.

Минимальный набор:
- сумма операции
- валюта, если мультивалютность будет включена позже — `TBD`
- признак исходящей или входящей операции определяется доменом, а не знаком суммы

Если мультивалютность не утверждена, базовый режим проекта — одна операционная валюта.

---

### 3.3 Количественные поля

Количество товара хранится как отдельный факт на уровне:
- позиции заказа
- резерва
- движения товара
- возврата
- поступления

Производные остатки не должны заменять журнал движений.

---

### 3.4 Ссылки между доменами

Каждая междоменная связь должна быть явной.

Примеры:
- `orders.order.deal_id -> crm.deal.id`
- `orders.fulfillment.order_id -> orders.order.id`
- `inventory.reservation.order_id -> orders.order.id`
- `payments.payment.order_id -> orders.order.id`
- `finance.finance_entry.payment_id -> payments.payment.id`
- `logistics.delivery_task.fulfillment_id -> orders.fulfillment.id` или `order_id`, если задача создаётся на уровне заказа до факта исполнения

Точная обязательность отдельных внешних ключей зависит от стадии процесса, но логическая связность обязательна.

---

## 4. Логическая модель по доменам

## 4.1 `crm`

### 4.1.1 `crm.lead`

Назначение:
первичный входящий запрос.

Минимальные поля:
- `id`
- `source`
- `status` — `TBD`, так как отдельная state machine для lead пока не утверждена
- `client_id` — nullable, если клиент ещё не создан
- `contact_id` — nullable
- `responsible_user_id`
- `notes` — optional
- `created_at`
- `updated_at`

Связи:
- lead может быть связан с одним клиентом
- lead может быть конвертирован в deal

---

### 4.1.2 `crm.client`

Назначение:
контрагент / покупатель.

Минимальные поля:
- `id`
- `type` — `TBD` при необходимости детализировать физлицо / юрлицо
- `name`
- `primary_contact_id` — nullable
- `created_at`
- `updated_at`

Связи:
- один client имеет много contacts
- один client имеет много deals
- один client может фигурировать в нескольких orders через deal

---

### 4.1.3 `crm.contact`

Назначение:
контактное лицо клиента.

Минимальные поля:
- `id`
- `client_id`
- `name`
- `phone` — optional
- `email` — optional
- `comment` — optional
- `created_at`
- `updated_at`

---

### 4.1.4 `crm.deal`

Назначение:
коммерческий контейнер.

Минимальные поля:
- `id`
- `lead_id` — nullable
- `client_id`
- `contact_id` — nullable
- `responsible_user_id`
- `status` — один из утверждённых статусов deal
- `source`
- `commercial_terms` — structured/TBD
- `notes` — optional
- `created_at`
- `updated_at`

Статусы:
- `Draft`
- `Qualified`
- `Proposal`
- `Negotiation`
- `Won`
- `Lost`

Связи:
- одна deal имеет много orders

Правило:
`crm.deal` не хранит первичные факты по оплате, доставке и остаткам.

---

## 4.2 `orders`

### 4.2.1 `orders.order`

Назначение:
операционный объект исполнения сделки.

Минимальные поля:
- `id`
- `deal_id`
- `client_id` — допускается как денормализованная ссылка для операционного доступа, если это будет утверждено; иначе `TBD`
- `status`
- `fulfillment_mode` — `delivery` / `pickup` / `TBD`
- `currency` — `TBD`, если включается мультивалютность
- `total_amount` — расчётное или фиксируемое поле, физическая стратегия расчёта = `TBD`
- `comment` — optional
- `confirmed_at` — nullable
- `completed_at` — nullable
- `closed_at` — nullable
- `cancelled_at` — nullable
- `created_at`
- `updated_at`

Статусы:
- `Draft`
- `Confirmed`
- `Reserved`
- `InProgress`
- `Completed`
- `Closed`
- `Cancelled`
- `PartialReturn`
- `FullReturn`

Связи:
- один order имеет много order_items
- один order может иметь много payments
- один order может иметь много fulfillments
- один order может иметь много return_requests
- один order может иметь много reservations
- один order может иметь много delivery task

Правила:
- `Draft` не создаёт durable reservation, но может иметь soft lock
- `Confirmed` разрешает резерв и логистическое бронирование
- `Completed` не равен `Closed`
- `delivery_status` должен агрегироваться из связанных delivery task

---

### 4.2.2 `orders.order_item`

Назначение:
позиция заказа.

Минимальные поля:
- `id`
- `order_id`
- `product_id`
- `quantity`
- `catalog_price`
- `unit_price`
- `discount_amount` — optional/TBD
- `line_total`
- `cost_snapshot` — nullable/TBD
- `created_at`
- `updated_at`

Правила:
- позиции являются основой для резерва, исполнения, возврата и сверки
- `catalog_price` и `unit_price` не равны себестоимости
- себестоимость берётся из inventory-логики и не должна подменяться retail price
- изменение состава после подтверждения должно проходить через контролируемую бизнес-логику

---

### 4.2.3 `orders.fulfillment`

Назначение:
факт исполнения заказа полностью или частично.

Минимальные поля:
- `id`
- `order_id`
- `type` — `delivery` / `pickup` / `TBD`
- `status`
- `planned_at` — optional
- `executed_at` — nullable
- `logistics_task_id` — nullable
- `created_at`
- `updated_at`

Статус исполнения должен быть согласован с доменом логистики.
Точная state machine fulfillment как отдельной сущности пока не выделена. Для логистического исполнения применяется утверждённая state machine delivery.

Правило:
только подтверждённое исполнение может быть источником расходного движения товара.

---

### 4.2.4 `orders.return_request`

Назначение:
единая точка входа для возврата.

Минимальные поля:
- `id`
- `order_id`
- `status`
- `reason`
- `comment` — optional
- `submitted_at` — nullable
- `processed_at` — nullable
- `closed_at` — nullable
- `created_at`
- `updated_at`

Статусы:
- `Draft`
- `Submitted`
- `Approved`
- `Rejected`
- `Processed`
- `Closed`

Правила:
- возврат денег без `return_request_id` запрещён
- возврат товара без `return_request_id` запрещён
- финансовая коррекция без `return_request_id` запрещена, если операция относится к возврату

Дополнение:
состав возвращаемых позиций должен храниться в дочерней детализации `TBD`.
Если отдельная таблица нужна на физическом уровне, она должна ссылаться только на `orders.return_request`.

---

## 4.3 `inventory`

### 4.3.1 `inventory.product`

Назначение:
товарная единица.

Минимальные поля:
- `id`
- `sku` — optional/TBD
- `name`
- `status` — `TBD`
- `created_at`
- `updated_at`

---

### 4.3.2 `inventory.warehouse`

Назначение:
склад.

Минимальные поля:
- `id`
- `name`
- `status` — `TBD`
- `created_at`
- `updated_at`

---

### 4.3.3 `inventory.stock_balance`

Назначение:
агрегированное состояние товара на складе.

Ключ логической уникальности:
- `warehouse_id`
- `product_id`

Минимальные поля:
- `id`
- `warehouse_id`
- `product_id`
- `on_hand`
- `reserved`
- `available`
- `avg_cost`
- `updated_at`

Правила:
- `available = on_hand - reserved`
- `stock_balance` — производная оперативная сущность
- первичный источник истории изменений — `inventory.inventory_movement`

---

### 4.3.4 `inventory.soft_lock`

Назначение:
краткоживущая предварительная блокировка под draft order.

Минимальные поля:
- `id`
- `draft_order_id` — nullable/TBD
- `order_id` — nullable/TBD
- `warehouse_id`
- `product_id`
- `quantity`
- `status` — `active` / `expired` / `released`
- `expires_at`
- `created_at`
- `updated_at`

Правила:
- используется только как защита от гонки наличия
- не является durable reservation
- не создаёт товарный расход
- должен автоматически истекать по TTL

---

### 4.3.5 `inventory.reservation`

Назначение:
резерв под подтверждённый заказ.

Минимальные поля:
- `id`
- `order_id`
- `order_item_id` — nullable/TBD
- `warehouse_id`
- `product_id`
- `quantity`
- `status` — `active` / `released` / `expired` / `TBD`
- `expires_at`
- `released_at` — nullable
- `created_at`
- `updated_at`

Правила:
- резерв создаётся только для `Confirmed` order
- резерв не создаётся для `Draft`
- резерв должен иметь TTL
- просроченный резерв должен быть видим для reconciliation/операционного контроля

---

### 4.3.6 `inventory.inventory_movement`

Назначение:
журнал товарных движений.

Минимальные поля:
- `id`
- `warehouse_id`
- `product_id`
- `movement_type`
- `quantity`
- `unit_cost` — nullable для типов, где себестоимость ещё не применима
- `reference_type`
- `reference_id`
- `occurred_at`
- `created_at`

Допустимые типы:
- `receipt`
- `issue`
- `return_to_quarantine`
- `quarantine_release_to_available`
- `writeoff`
- `adjustment`
- `soft_lock_create`
- `soft_lock_release`
- `reservation_create`
- `reservation_release`

Правила:
- все агрегированные остатки должны быть воспроизводимы через движения
- каждое движение должно иметь ссылку на бизнес-источник
- `issue` по продаже должен ссылаться на исполнение заказа

---

### 4.3.7 `inventory.purchase_receipt`

Назначение:
факт поступления товара.

Минимальные поля:
- `id`
- `warehouse_id`
- `received_at`
- `supplier_ref` — optional/TBD
- `document_number` — optional/TBD
- `created_at`
- `updated_at`

Правила:
- после поступления должны создаваться движения `receipt`
- средняя себестоимость пересчитывается по правилу `weighted average`

Детализация состава поступления:
- физическая таблица позиций поступления = `TBD`
- до её фиксации нельзя подменять поступление только summary-полем, если теряется воспроизводимость

---

## 4.4 `payments`

### 4.4.1 `payments.payment`

Назначение:
факт оплаты по заказу.

Минимальные поля:
- `id`
- `order_id`
- `status`
- `amount`
- `payment_method`
- `paid_at` — nullable до завершения
- `external_ref` — optional
- `created_at`
- `updated_at`

Статусы:
- `Pending`
- `Completed`
- `Refunded`

Правила:
- одна order может иметь много payments
- частичная оплата допустима
- частичный возврат отражается через сумму возврата, а не отдельным неутверждённым статусом

---

### 4.4.2 `payments.cash_operation`

Назначение:
денежная операция.

Минимальные поля:
- `id`
- `payment_id` — nullable для операций не из платежного потока, если такие будут утверждены отдельно
- `operation_type`
- `amount`
- `occurred_at`
- `external_ref` — optional
- `return_request_id` — nullable, но обязателен для возврата
- `created_at`

Допустимые типы:
- `cash_in`
- `cash_out`
- `refund`

Правила:
- `refund` должен ссылаться на `orders.return_request`
- платежный и кассовый факты должны сверяться между собой

---

## 4.5 `logistics`

### 4.5.1 `logistics.delivery_slot`

Назначение:
временной интервал доставки.

Минимальные поля:
- `id`
- `date`
- `time_from`
- `time_to`
- `capacity` — optional/TBD
- `status` — `TBD`
- `created_at`
- `updated_at`

---

### 4.5.2 `logistics.pickup_window`

Назначение:
окно самовывоза.

Минимальные поля:
- `id`
- `date`
- `time_from`
- `time_to`
- `status` — `TBD`
- `created_at`
- `updated_at`

---

### 4.5.3 `logistics.driver`

Назначение:
исполнитель доставки.

Минимальные поля:
- `id`
- `user_id` — nullable/TBD
- `name`
- `status` — `TBD`
- `created_at`
- `updated_at`

---

### 4.5.4 `logistics.vehicle`

Назначение:
транспорт.

Минимальные поля:
- `id`
- `name`
- `status` — `TBD`
- `created_at`
- `updated_at`

---

### 4.5.5 `logistics.route_day`

Назначение:
контейнер задач водителя на день.

Минимальные поля:
- `id`
- `date`
- `driver_id`
- `vehicle_id` — nullable
- `status` — `TBD`
- `created_at`
- `updated_at`

---

### 4.5.6 `logistics.delivery_task`

Назначение:
атомарная задача доставки.

Минимальные поля:
- `id`
- `order_id`
- `fulfillment_id` — nullable до факта исполнения, если задача создаётся заранее
- `route_day_id` — nullable
- `delivery_slot_id` — nullable
- `status`
- `failure_reason` — nullable
- `planned_at` — nullable
- `started_at` — nullable
- `delivered_at` — nullable
- `created_at`
- `updated_at`

Статусы:
- `Planned`
- `Assigned`
- `InTransit`
- `Delivered`
- `Failed`
- `Rescheduled`

Правила:
- логистический статус является источником истины для факта доставки
- `Delivered -> Planned` запрещён

---

## 4.6 `finance`

### 4.6.1 `finance.finance_entry`

Назначение:
доход, расход или коррекция в финансовом контуре.

Минимальные поля:
- `id`
- `entry_type`
- `amount`
- `occurred_at`
- `payment_id` — nullable
- `cash_operation_id` — nullable
- `expense_id` — nullable
- `marketing_expense_id` — nullable
- `purchase_receipt_id` — nullable
- `return_request_id` — nullable
- `comment` — optional
- `created_at`

Допустимые классы записи:
- `income`
- `expense`
- `correction`

Правила:
- доход по продаже должен создаваться на основе события оплаты
- расходы должны быть воспроизводимы от первичного факта домена-источника
- финансовая запись не должна подменять первичный денежный или складской факт

---

### 4.6.2 `finance.expense`

Назначение:
расход по статье.

Минимальные поля:
- `id`
- `category`
- `amount`
- `occurred_at`
- `comment` — optional
- `created_at`
- `updated_at`

---

### 4.6.3 `finance.marketing_expense`

Назначение:
маркетинговый расход, связанный с каналом.

Минимальные поля:
- `id`
- `channel`
- `amount`
- `occurred_at`
- `comment` — optional
- `created_at`
- `updated_at`

Правило:
`marketing_expense` относится к финансовому домену и не выделяется в отдельный домен.

---

## 4.7 `analytics`

### 4.7.1 `analytics.live_kpi`

Назначение:
текущий показатель.

Минимальные поля:
- `id`
- `metric_key`
- `metric_scope` — optional/TBD
- `metric_value`
- `calculated_at`

Правило:
- live KPI обновляется асинхронно из фактов
- не является источником истины
- не должен собираться тяжёлыми runtime JOIN на запросе пользователя

---

### 4.7.2 `analytics.snapshot_kpi`

Назначение:
зафиксированный показатель периода.

Минимальные поля:
- `id`
- `metric_key`
- `period_type`
- `period_start`
- `period_end`
- `metric_value`
- `snapshot_at`
- `correction_note` — optional

Правило:
старый snapshot не переписывается задним числом без отдельной корректировочной логики.

---

## 4.8 `users`

### 4.8.1 `users.user`

Назначение:
сотрудник или учётная запись пользователя.

Минимальные поля:
- `id`
- `name`
- `email` — optional/TBD
- `status`
- `created_at`
- `updated_at`

---

### 4.8.2 `users.role`

Назначение:
роль доступа.

Минимальные поля:
- `id`
- `code`
- `name`
- `created_at`
- `updated_at`

---

### 4.8.3 `users.permission`

Назначение:
разрешение на чтение, изменение, экспорт, действие или API-вызов.

Минимальные поля:
- `id`
- `code`
- `name`
- `created_at`
- `updated_at`

---

### 4.8.4 `users.user_role`

Назначение:
связь пользователей и ролей.

Минимальные поля:
- `id`
- `user_id`
- `role_id`
- `created_at`

---

### 4.8.5 `users.role_permission`

Назначение:
связь ролей и разрешений.

Минимальные поля:
- `id`
- `role_id`
- `permission_id`
- `created_at`

---

## 4.9 `audit`

### 4.9.1 `audit.audit_event`

Назначение:
журнал действий и ручных вмешательств.

Минимальные поля:
- `id`
- `actor_user_id` — nullable для системных событий
- `event_type`
- `entity_type`
- `entity_id`
- `before_state` — optional
- `after_state` — optional
- `reason` — optional
- `created_at`

Правила:
- `admin override` обязан отражаться в audit
- ручное снятие резерва должно отражаться в audit
- критические ручные изменения финансовых и складских фактов должны отражаться в audit

---

### 4.9.2 `audit.reconciliation_report`

Назначение:
отчёт междоменной сверки.

Минимальные поля:
- `id`
- `scope`
- `period_start`
- `period_end`
- `status`
- `mismatch_count`
- `details` — structured/TBD
- `created_at`

Примеры scope:
- `crm_payments`
- `crm_inventory`
- `inventory_finance`
- `logistics_orders`

---

## 4.10 `system`

### 4.10.1 `system.idempotency_record`

Назначение:
техническая защита критических мутаций от повторного создания результата.

Минимальные поля:
- `id`
- `idempotency_key`
- `operation_name`
- `request_fingerprint` — optional/TBD
- `result_reference_type`
- `result_reference_id`
- `created_at`

Правила:
- ключ должен быть уникален в пределах операции или иного утверждённого скоупа
- повтор с тем же ключом должен возвращать уже созданный результат

---

## 5. Ключевые связи между сущностями

## 5.1 Коммерческий контур
- `crm.lead 1 -> N crm.deal`
- `crm.client 1 -> N crm.contact`
- `crm.client 1 -> N crm.deal`
- `crm.deal 1 -> N orders.order`

## 5.2 Операционный контур
- `orders.order 1 -> N orders.order_item`
- `orders.order 1 -> N orders.fulfillment`
- `orders.order 1 -> N orders.return_request`
- `orders.order 1 -> N inventory.reservation`
- `orders.order 1 -> N payments.payment`
- `orders.order 1 -> N logistics.delivery_task`

## 5.3 Складской контур
- `inventory.product 1 -> N inventory.stock_balance`
- `inventory.warehouse 1 -> N inventory.stock_balance`
- `inventory.product 1 -> N inventory.inventory_movement`
- `inventory.warehouse 1 -> N inventory.inventory_movement`
- `inventory.purchase_receipt 1 -> N inventory.inventory_movement` по ссылке источника

## 5.4 Денежный и финансовый контур
- `payments.payment 1 -> N payments.cash_operation`
- `payments.payment 1 -> N finance.finance_entry`
- `finance.expense 1 -> N finance.finance_entry` — если финансовая запись деталирует расход
- `finance.marketing_expense 1 -> N finance.finance_entry`
- `orders.return_request 1 -> N payments.cash_operation` для возвратов
- `orders.return_request 1 -> N finance.finance_entry` для корректировок

## 5.5 Логистический контур
- `logistics.route_day 1 -> N logistics.delivery_task`
- `logistics.delivery_slot 1 -> N logistics.delivery_task`
- `logistics.driver 1 -> N logistics.route_day`
- `logistics.vehicle 1 -> N logistics.route_day`

---

## 6. Транзакционные границы

## 6.1 Подтверждение заказа

Одна логическая операция должна обеспечивать согласованность как минимум между:
- `orders.order`
- `inventory.reservation` и/или reservation movements
- логистическим бронированием, если оно создаётся сразу
- `audit.audit_event`
- `system.idempotency_record`

Если единая транзакция между доменами физически не используется, компенсационная логика должна быть зафиксирована отдельным документом. Пока это `TBD`.

---

## 6.2 Подтверждение оплаты

Одна логическая операция должна обеспечивать согласованность как минимум между:
- `payments.payment`
- `payments.cash_operation`
- `finance.finance_entry`
- `audit.audit_event`
- `system.idempotency_record`

---

## 6.3 Подтверждение исполнения

Одна логическая операция должна обеспечивать согласованность как минимум между:
- `orders.fulfillment`
- `logistics.delivery_task` или `pickup`-фактом
- `inventory.inventory_movement` типа `issue`
- обновлением агрегированных остатков
- `audit.audit_event`
- `system.idempotency_record`

---

## 6.4 Обработка возврата

Одна логическая операция или контролируемая цепочка операций должна обеспечивать согласованность между:
- `orders.return_request`
- возвратными складскими движениями и/или списанием
- `payments.cash_operation` типа `refund`
- `finance.finance_entry`
- `audit.audit_event`
- `system.idempotency_record`

---

## 7. Инварианты данных

## 7.1 Заказ и резерв
- у `Draft` order не может существовать активный резерв
- активный резерв допустим только для подтверждённого заказа
- просроченный резерв не должен оставаться невидимым для контроля

## 7.2 Заказ и товарный расход
- order в `Confirmed` или `Reserved` не создаёт расход автоматически
- расход по продаже должен иметь ссылку на исполнение заказа

## 7.3 Оплата и доход
- доход от продажи не должен появляться без денежного факта
- денежный факт не должен храниться только внутри order

## 7.4 Возвраты
- refund без `return_request_id` запрещён
- складской возврат без `return_request_id` запрещён

## 7.5 KPI
- KPI не может служить основанием для первичного финансового, складского или логистического факта

## 7.6 Audit
- операции `admin override` и ручные критические вмешательства обязаны оставлять audit trail

---

## 8. Reconciliation как обязательная часть модели

БД должна поддерживать периодическую сверку по минимальным направлениям:

### CRM ↔ Payments
Сумма оплат по заказам должна совпадать с суммой денежных операций.

### CRM / Orders ↔ Inventory
Исполненные позиции должны совпадать с расходными движениями товара.

### Inventory ↔ Finance
Приходы должны быть сопоставимы с закупочными расходами за период.

### Logistics ↔ Orders
Доставленные задачи должны соответствовать исполненным доставкам по заказам.

Результат сверки должен сохраняться в `audit.reconciliation_report`.

---

## 9. Открытые вопросы, которые нельзя заполнять догадками

Следующие решения пока должны оставаться `TBD`, пока не будут утверждены отдельно:
- точные типы идентификаторов
- точные SQL-типы полей
- мультивалютность
- soft delete policy по конкретным сущностям
- физическая детализация поступлений и возвратов по позициям
- модель адресов клиента и доставки
- налоговые поля
- модель документов и файловых вложений
- стратегия распределённых транзакций и компенсаций
- event/outbox модель, если она будет нужна

---

## 10. Минимальный вывод для реализации

До начала физического проектирования БД должны быть соблюдены следующие правила:
- проектировать БД по доменам, а не вокруг одной общей CRM-таблицы
- не смешивать cash basis и accrual basis в базовой модели
- не делать расход товара на подтверждении заказа
- не обходить `ReturnRequest`
- не хранить KPI как первичный факт
- не допускать критические мутации без `idempotency`
- не разрешать произвольные статусы вне state machine



## v8 Architecture Overrides

- В `Draft` допускается `inventory.soft_lock` с коротким TTL.
- Durable reservation создаётся только в confirm-операции.
- `orders.order` должен поддерживать агрегированный `delivery_status`.
- Связь `orders.order -> logistics.delivery_task` обязательна как `1:N`.
- Для `Order`, `Deal`, `Payment`, `ReturnRequest` обязателен soft delete.
- Возвратный товар по умолчанию идёт в `quarantine`, а не в `available`.
- Live KPI должны читаться из агрегатов.
- Для междоменных подтверждений должен существовать `system.outbox_event` или эквивалентный механизм rollback/compensation.


### 4.10.2 `system.outbox_event`

Назначение:
надёжная публикация междоменных событий после фиксации первичного факта.

Минимальные поля:
- `id`
- `event_type`
- `aggregate_type`
- `aggregate_id`
- `payload`
- `status` — `pending` / `published` / `failed`
- `created_at`
- `published_at` — nullable

Правила:
- используется для Transactional Outbox
- запись создаётся в той же транзакции, что и первичный факт
- публикация события не должна требовать повторной бизнес-мутации
