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

### 2.8 Current business alignment overrides

Если нижележащие секции этого документа конфликтуют с правилами ниже, для текущего v1-потока приоритет у этого раздела.

Зафиксированные правила:
- `Lead` — входящая заявка из `АТС`, сайта или `Avito`
- `Lead -> Deal` происходит при переводе заявки в `in_processing`
- отменённый lead не переходит в `Deal`
- `Deal` в текущем бизнес-контуре является коммерческим заказом менеджера на первом этапе
- отдельная сущность `Invoice` в v1 не создаётся; термин "счёт" допускается только как коммерческое представление
- CRM productivity в v1 включает `follow-up`, `next_contact_at`, reminders, lost reasons, communication history и контроль stuck deals
- client master в v1 включает адрес, dedup/merge workflow и явный referral context (`installer` / `designer`)
- `ClientParticipant` (`монтажник` / `дизайнер`) должен моделироваться отдельно от `Client` и `Contact`
- `Supplier` и `SupplierRequest` относятся к логике обеспечения товара и не должны напрямую менять складские остатки
- один `Product` в v1 может быть связан с несколькими `Supplier`
- связь `Product -> Supplier` должна хранить `supplier_priority` и `base_purchase_price`
- `base_purchase_price` относится к чувствительным полям и требует field-level ограничения видимости
- `SupplierRequest` обязан хранить трассируемую связку источника `business_source_type + business_source_id`
- строки `SupplierRequest` обязаны хранить `source_line_ref` как line-level linkage
- `PurchaseReceipt` должен хранить `supplier_id`; при связи с заявкой поставщику дополнительно хранится `supplier_request_id`
- жизненный цикл `SupplierRequest`: `formed -> confirmed_by_supplier -> paid -> stocked`
- durable reservation не живёт без `Order`; если резерв инициируется из `Deal`, система должна создавать `Order` и `Reservation` атомарно
- `Order` создаётся автоматически после клиентского подтверждения условий и обеспечения товара через резерв и/или подтверждённый `SupplierRequest`
- контрольные состояния `OnControl` и `Problem` являются overlay-флагами поверх `Order`, а не заменой его основного статуса
- жизненный цикл `ReturnRequest`: `created -> confirmed -> processed -> closed`
- payment-контур v1 работает как intake/control внешнего payment факта; CRM не инициирует создание оплаты
- финансы поддерживают manual correction с approval workflow
- KPI планы вводятся менеджером вручную, KPI факты остаются производными от доменных источников истины
- интеграции v1: inbound `ATS`/`Avito`, outbound уведомления `Telegram`/`MAX`
- для order-commercial flow v1 список единиц измерения фиксирован: `шт`, `кв.м`, `п.м`, `услуга`

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
- `address_text` — nullable
- `address_comment` — nullable
- `installer_referral_comment` — nullable
- `designer_referral_comment` — nullable
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

### 4.1.3a `crm.client_participant`

Назначение:
внешний участник клиентского контура, связанный с клиентом / сделкой / заказом.

Минимальные поля:
- `id`
- `client_id`
- `deal_id` — nullable
- `order_id` — nullable
- `role_type` — `installer` / `designer`
- `name`
- `phone` — optional
- `comment` — optional
- `created_at`
- `updated_at`

Правила:
- участник не заменяет `client` или `contact`
- связь участника должна быть трассируема минимум до `client` и при необходимости до `deal` / `order`

---

### 4.1.4 `crm.deal`

Назначение:
коммерческий заказ менеджера на первом этапе.

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
- `delivery_mode` — `delivery` / `pickup` / `TBD`
- `client_price_confirmed_at` — nullable/TBD
- `next_contact_at` — nullable
- `lost_reason_code` — nullable
- `stuck_reason_code` — nullable
- `created_at`
- `updated_at`

Статусы:
- `InProgress`
- `ConvertedToOrder`
- `Cancelled`

Связи:
- одна deal имеет много orders

Правило:
`crm.deal` не хранит первичные факты по оплате, доставке и остаткам, но может инициировать supply coverage и auto-order flow.

---

### 4.1.5 `crm.deal_follow_up`

Назначение:
операционный контур follow-up и напоминаний по сделке.

Минимальные поля:
- `id`
- `deal_id`
- `owner_user_id`
- `next_contact_at`
- `reminder_at` — nullable
- `status` — `open` / `done` / `cancelled`
- `comment` — optional
- `created_at`
- `updated_at`

Правила:
- follow-up не подменяет статус сделки, а дополняет CRM productivity слой
- для `lost`/`stuck` сценариев должна оставаться трассировка к `deal_id`

---

### 4.1.6 `crm.deal_communication`

Назначение:
история коммуникаций по клиенту/сделке.

Минимальные поля:
- `id`
- `deal_id`
- `client_id`
- `channel` — `call` / `chat` / `meeting` / `other`
- `direction` — `inbound` / `outbound`
- `summary`
- `occurred_at`
- `created_by_user_id`
- `created_at`
- `updated_at`

Правила:
- коммуникация должна быть привязана минимум к `deal` и `client`
- payload коммуникации не должен подменять факты заказа, оплаты, логистики или склада

---

### 4.1.7 `crm.client_dedup_case`

Назначение:
workflow дедупликации и merge клиентских карточек.

Минимальные поля:
- `id`
- `primary_client_id`
- `candidate_client_id`
- `status` — `open` / `merged` / `rejected`
- `reason` — optional
- `reviewed_by_user_id` — nullable
- `reviewed_at` — nullable
- `created_at`
- `updated_at`

Правила:
- merge допускается только через явный workflow-кейс
- после merge должна сохраняться трассировка исходных client-id для аудита и связанного контекста

---

## 4.2 `orders`

### 4.2.1 `orders.order`

Назначение:
операционный объект исполнения сделки, создаваемый системой автоматически из `Deal`.

Минимальные поля:
- `id`
- `deal_id`
- `client_id` — допускается как денормализованная ссылка для операционного доступа, если это будет утверждено; иначе `TBD`
- `status`
- `control_flag` — `none` / `on_control` / `problem`
- `control_due_at` — nullable
- `fulfillment_mode` — `delivery` / `pickup` / `TBD`
- `delivery_status` — агрегированное значение от delivery tasks
- `currency` — `TBD`, если включается мультивалютность
- `total_amount` — расчётное или фиксируемое поле, физическая стратегия расчёта = `TBD`
- `comment` — optional
- `ready_for_partial_shipment_at` — nullable
- `ready_for_shipment_at` — nullable
- `partially_shipped_at` — nullable
- `shipped_at` — nullable
- `created_at`
- `updated_at`

Статусы:
- `Assembling`
- `ReadyForPartialShipment`
- `ReadyForShipment`
- `PartiallyShipped`
- `Shipped`

Связи:
- один order имеет много order_items
- один order может иметь много payments
- один order может иметь много fulfillments
- один order может иметь много return_requests
- один order может иметь много reservations
- один order может иметь много delivery task

Правила:
- заказ создаётся системой автоматически после клиентского подтверждения условий и обеспечения товара
- durable reservation не существует без `Order`
- short-lived soft lock используется в pre-order/commercial preparation и не подменяет reservation
- если резерв инициируется из `Deal`, `Order + Reservation` должны появляться согласованно в одной логической операции
- `ReadyForShipment` означает, что весь товар есть на складе и поставлен в резерв
- `ReadyForPartialShipment` означает частичный резерв и допустимость частичной отгрузки
- `Shipped` требует и факт передачи товара, и закрытие всех связанных delivery/self-pickup операций
- `delivery_status` должен агрегироваться из связанных delivery task

### 4.2.1a `orders.deal_supply_summary`

Назначение:
read-model сводки обеспечения сделки для seller workflow.

Минимальные поля:
- `id`
- `deal_id`
- `coverage_status` — `none` / `partial` / `full`
- `covered_qty`
- `deficit_qty`
- `eta_from` — nullable
- `eta_to` — nullable
- `linked_supplier_request_count`
- `updated_at`

Правила:
- сводка формируется из фактов `reservation`, `supplier_request`, `purchase_receipt`
- сводка не является источником истины и не заменяет первичные складские/снабженческие факты
- для одного `deal` допускается максимум одна актуальная summary-запись (`0..1` по наличию)

### 4.3.0 `inventory.supplier`

Назначение:
справочник поставщиков.

Минимальные поля:
- `id`
- `name`
- `phone` — optional
- `email` — optional
- `comment` — optional
- `created_at`
- `updated_at`

### 4.3.0a `inventory.supplier_request`

Назначение:
заявка поставщику на недостающий товар.

Минимальные поля:
- `id`
- `supplier_id`
- `business_source_type` — `deal` / `order`
- `business_source_id`
- `status`
- `expected_supply_date`
- `requested_by_user_id`
- `confirmed_by_user_id` — nullable
- `paid_by_user_id` — nullable
- `paid_at` — nullable
- `stocked_by_user_id` — nullable
- `stocked_at` — nullable
- `supplier_document_ref` — optional
- `created_at`
- `updated_at`

Статусы:
- `formed`
- `confirmed_by_supplier`
- `paid`
- `stocked`

Правила:
- supplier request может быть инициирован из коммерческого или складского контура
- supplier request обязан хранить трассируемую связь с бизнес-источником через `business_source_type + business_source_id`
- supplier request не создаёт складской остаток напрямую
- `paid` выставляется только после фактической оплаты
- `stocked` выставляется только после фактического прихода по receipt flow
- поступление товара оформляется только через `purchase_receipt` и `inventory_movement`

### 4.3.0b `inventory.supplier_request_item`

Назначение:
позиция заявки поставщику с line-level трассировкой.

Минимальные поля:
- `id`
- `supplier_request_id`
- `product_id`
- `quantity`
- `unit` — одно из: `шт`, `кв.м`, `п.м`, `услуга`
- `source_line_ref` — обязательный идентификатор исходной строки
- `source_line_context` — optional structured payload для диагностики/аудита
- `created_at`
- `updated_at`

Правила:
- каждая позиция supplier request должна быть трассируема до исходной бизнес-строки
- `source_line_ref` не должен быть пустым
- `source_line_context` не должен подменять первичную ссылку `source_line_ref`

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
- `fulfilled_at` — nullable
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
- `realization_anchor_at` — nullable; фиксируется при `confirmed` как канонический момент реализации для 14-day правила
- `confirmed_at` — nullable
- `processed_at` — nullable
- `closed_at` — nullable
- `created_at`
- `updated_at`

Статусы:
- `created`
- `confirmed`
- `processed`
- `closed`

Правила:
- возврат денег без `return_request_id` запрещён
- возврат товара без `return_request_id` запрещён
- финансовая коррекция без `return_request_id` запрещена, если операция относится к возврату
- `confirmed` для кейсов старше 14 дней требует согласования `ceo` по правилу `confirmed_at - realization_anchor_at > 14 days`
- `realization_anchor_at` вычисляется как `MIN(orders.fulfillments.fulfilled_at)` по возвращаемым позициям (`return_request_items` через linkage к `orders.fulfillment_items`) и должен опираться только на подтверждённые execution-факты
- неканонично для этого правила: `orders.orders.shipped_at`, `orders.orders.partially_shipped_at`, любые timestamp планирования/маршрутизации в `logistics`
- `processed` не закрывает request автоматически без завершения обязательных последствий

### 4.2.4a `orders.return_request_item`

Назначение:
позиционный состав `ReturnRequest` для возврата денег/товара и вычисления `realization_anchor_at`.

Минимальные поля:
- `id`
- `return_request_id`
- `order_item_id`
- `qty`
- `resolution` — `return_to_quarantine` / `writeoff` / `refund_only`
- `created_at`
- `updated_at`

Правила:
- это обязательная дочерняя logical structure для `orders.return_request` (physical mapping: `orders.return_request_items`)
- anchor-вычисление использует linkage `orders.return_request_item.order_item_id -> orders.fulfillment_items.order_item_id -> orders.fulfillments.fulfilled_at`
- `realization_anchor_at` фиксируется как `MIN(orders.fulfillments.fulfilled_at)` только по fulfillment-фактам, связанным с возвращаемыми позициями

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

### 4.3.1a `inventory.product_supplier`

Назначение:
матрица обеспечения `Product -> multiple Supplier` для sourcing-контуров.

Минимальные поля:
- `id`
- `product_id`
- `supplier_id`
- `supplier_priority` — чем меньше значение, тем выше приоритет
- `base_purchase_price`
- `currency` — `TBD` при мультивалютности
- `is_active`
- `created_at`
- `updated_at`

Правила:
- один product может иметь несколько supplier связей
- для одной пары `product_id + supplier_id` должна быть одна активная запись
- `base_purchase_price` является чувствительным полем и должен подчиняться field-level visibility rule
- `base_purchase_price` не должен отдаваться ролям `seller`, `warehouse`, `logistics`

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

### 4.3.4 `inventory.stock_lock`

Назначение:
краткоживущая предварительная блокировка для pre-order/commercial preparation.

Минимальные поля:
- `id`
- `deal_id` — nullable
- `order_id` — nullable
- `warehouse_id`
- `product_id`
- `quantity`
- `status` — `active` / `expired` / `released` / `promoted`
- `expires_at`
- `created_at`
- `updated_at`

Правила:
- используется только как защита от гонки наличия
- не является durable reservation
- не создаёт товарный расход
- должен автоматически истекать по TTL
- при materialization в durable reservation должен оставлять трассируемую ссылку на созданный reservation

---

### 4.3.5 `inventory.reservation`

Назначение:
durable reservation под `Order`.

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
- резерв создаётся только вместе с существующим `Order`
- резерв не может жить на `Deal` без materialized `Order`
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
- `supplier_id`
- `supplier_request_id` — nullable
- `received_at`
- `document_number` — optional/TBD
- `created_at`
- `updated_at`

Правила:
- после поступления должны создаваться движения `receipt`
- средняя себестоимость пересчитывается по правилу `weighted average`
- `supplier_request_id` используется, если поступление связано с конкретной заявкой поставщику
- если `supplier_request_id` задан, поставщик в receipt должен совпадать с поставщиком заявки

### 4.3.7a `inventory.purchase_receipt_item`

Назначение:
позиция поступления товара.

Минимальные поля:
- `id`
- `purchase_receipt_id`
- `product_id`
- `quantity`
- `unit` — одно из: `шт`, `кв.м`, `п.м`, `услуга`
- `unit_cost`
- `line_total`
- `supplier_request_item_id` — nullable
- `created_at`
- `updated_at`

Правила:
- для v1 `unit` обязателен в каждой строке поступления
- при наличии `supplier_request_item_id` должна соблюдаться line-level трассировка к заявке поставщику
- детализация поступления не может подменяться только summary-полями

---

## 4.4 `payments`

### 4.4.1 `payments.payment`

Назначение:
учёт внешнего payment факта и его контроль в CRM.

Минимальные поля:
- `id`
- `order_id`
- `status`
- `amount`
- `payment_method`
- `external_source` — `bank` / `acquiring` / `cash_register` / `manual_import` / `other` / `TBD`
- `external_event_id`
- `intake_at`
- `confirmed_at` — nullable
- `external_ref` — optional
- `created_at`
- `updated_at`

Статусы:
- `pending`
- `completed`
- `refunded`
- `rejected`

Правила:
- одна order может иметь много payments
- частичная оплата допустима
- частичный возврат отражается через сумму возврата, а не отдельным неутверждённым статусом
- `external_source` относится к платёжному провайдеру/каналу внешнего денежного факта
- `ATS` и `Avito` не являются payment-source в этом контуре и остаются только integration inbound контекстом
- отклонение внешнего payment факта должно переводить запись в статус `rejected` без генерации cash/finance последствий
- CRM не должна инициировать hosted checkout / payment-link creation в v1
- запись `payments.payment` создаётся через intake внешнего факта, а не из CRM-side сценария "создать оплату"

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

### 4.6.4 `finance.manual_correction`

Назначение:
ручная финансовая корректировка с обязательным approval workflow.

Минимальные поля:
- `id`
- `status` — `draft` / `pending_approval` / `approved` / `rejected` / `applied`
- `reason`
- `requested_by_user_id`
- `approved_by_user_id` — nullable
- `approved_at` — nullable
- `applied_entry_id` — nullable (ссылка на итоговую `finance_entry`)
- `created_at`
- `updated_at`

Правила:
- корректировка не подменяет первичный денежный/складской факт
- применение корректировки допускается только после `approved`
- все переходы approval workflow должны попадать в `audit`

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

### 4.7.1a `analytics.department_plan`

Назначение:
ручные планы подразделений для plan/fact KPI контура.

Минимальные поля:
- `id`
- `department_id`
- `metric_key`
- `period_type`
- `period_start`
- `period_end`
- `plan_value`
- `set_by_user_id`
- `set_at`
- `created_at`
- `updated_at`

Правила:
- плановые значения вводятся менеджером вручную
- plan-таблица не может подменять фактические KPI из доменных источников истины

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
`snapshot/live` факты KPI остаются производными и должны строиться из первичных доменных фактов.

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

### 4.10.2 `system.integration_inbound_event`

Назначение:
inbox фактов из внешних источников (`ATS`, `Avito`) до доменной обработки.

Минимальные поля:
- `id`
- `source_system` — `ats` / `avito`
- `external_event_id`
- `payload`
- `received_at`
- `processed_at` — nullable
- `status` — `received` / `processed` / `rejected`
- `created_at`

Правила:
- inbound событие должно проходить server-side validation до доменных side effects
- обработка inbound event обязана быть идемпотентной

---

### 4.10.3 `system.notification_dispatch`

Назначение:
журнал outbound уведомлений по каналам `Telegram` и `MAX`.

Минимальные поля:
- `id`
- `channel` — `telegram` / `max`
- `event_type`
- `target_ref`
- `payload`
- `status` — `queued` / `sent` / `failed`
- `sent_at` — nullable
- `error` — nullable
- `created_at`
- `updated_at`

Правила:
- outbound уведомления не должны обходить permission boundaries при формировании контента
- критичные уведомления должны оставлять трассировку для аудита и отладки

---

## 5. Ключевые связи между сущностями

## 5.1 Коммерческий контур
- `crm.lead 1 -> N crm.deal`
- `crm.client 1 -> N crm.contact`
- `crm.client 1 -> N crm.deal`
- `crm.deal 1 -> N crm.deal_follow_up`
- `crm.deal 1 -> N crm.deal_communication`
- `crm.client 1 -> N crm.client_dedup_case` (как `primary` или `candidate`)
- `crm.deal 1 -> N orders.order`
- `crm.deal 1 -> 0..1 orders.deal_supply_summary`

## 5.2 Операционный контур
- `orders.order 1 -> N orders.order_item`
- `orders.order 1 -> N orders.fulfillment`
- `orders.order 1 -> N orders.return_request`
- `orders.return_request 1 -> N orders.return_request_item` (physical: `orders.return_request_items`)
- `orders.order_item 1 -> N orders.return_request_item`
- для 14-day anchor: `orders.return_request_item.order_item_id` связывается с `orders.fulfillment_items.order_item_id`, далее используется `orders.fulfillments.fulfilled_at`
- `orders.order 1 -> N inventory.reservation`
- `orders.order 1 -> N payments.payment`
- `orders.order 1 -> N logistics.delivery_task`

## 5.3 Складской контур
- `inventory.product 1 -> N inventory.stock_balance`
- `inventory.warehouse 1 -> N inventory.stock_balance`
- `inventory.product 1 -> N inventory.product_supplier`
- `inventory.supplier 1 -> N inventory.product_supplier`
- `inventory.product 1 -> N inventory.inventory_movement`
- `inventory.warehouse 1 -> N inventory.inventory_movement`
- `inventory.purchase_receipt 1 -> N inventory.inventory_movement` по ссылке источника

## 5.4 Денежный и финансовый контур
- `payments.payment 1 -> N payments.cash_operation`
- `payments.payment 1 -> N finance.finance_entry`
- `finance.expense 1 -> N finance.finance_entry` — если финансовая запись деталирует расход
- `finance.marketing_expense 1 -> N finance.finance_entry`
- `finance.manual_correction 1 -> 0..1 finance.finance_entry`
- `orders.return_request 1 -> N payments.cash_operation` для возвратов
- `orders.return_request 1 -> N finance.finance_entry` для корректировок

## 5.5 Логистический контур
- `logistics.route_day 1 -> N logistics.delivery_task`
- `logistics.delivery_slot 1 -> N logistics.delivery_task`
- `logistics.driver 1 -> N logistics.route_day`
- `logistics.vehicle 1 -> N logistics.route_day`

## 5.6 Интеграции, уведомления и KPI планирование
- `system.integration_inbound_event` связывается с доменными фактами через `correlationId`/`entity references`
- `system.notification_dispatch` связывается с доменными фактами через `event_type + target_ref`
- `analytics.department_plan.department_id` должен ссылаться на утверждённый справочник подразделений (конкретный FK источник = `TBD`)

---

## 6. Транзакционные границы

## 6.1 Materialization `Order + Reservation`

Одна логическая операция должна обеспечивать согласованность как минимум между:
- `orders.order` (auto-created from `crm.deal`)
- `inventory.reservation` и/или reservation movements
- логистическим бронированием, если оно создаётся сразу
- `audit.audit_event`
- `system.idempotency_record`

Если единая транзакция между доменами физически не используется, компенсационная логика должна быть зафиксирована отдельным документом. Пока это `TBD`.

---

## 6.2 Подтверждение внешнего payment факта

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
- у `Deal` без materialized `Order` не может существовать активный durable reservation
- активный durable reservation допустим только для существующего `Order`
- просроченный резерв не должен оставаться невидимым для контроля

## 7.2 Заказ и товарный расход
- order в `Assembling` / `ReadyForPartialShipment` / `ReadyForShipment` не создаёт расход автоматически
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

## 7.7 Purchase price visibility
- `inventory.product_supplier.base_purchase_price` не должен отдаваться ролям `seller`, `warehouse`, `logistics`
- запрет видимости должен применяться на серверном field-level permission слое

## 7.8 KPI plan/fact separation
- ручной `department_plan` не может подменять KPI fact-агрегаты
- KPI факт должен вычисляться из первичных доменных фактов, а не из вручную введённых планов

## 7.9 External payment intake/control
- CRM не должна создавать оплату как первичный денежный факт
- подтверждение денег и признание дохода должно опираться на intake/control внешнего payment факта

## 7.10 Integrations and notifications
- inbound события `ATS`/`Avito` должны быть валидированы и идемпотентно обработаны до доменных side effects
- outbound уведомления `Telegram`/`MAX` должны иметь трассируемый статус доставки (`queued/sent/failed`)

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
- детальная нормализация адресов клиента и доставки
- налоговые поля
- модель документов и файловых вложений
- стратегия распределённых транзакций и компенсаций
- SLA/retry политика для outbox/inbox и notification dispatch

---

## 10. Минимальный вывод для реализации

До начала физического проектирования БД должны быть соблюдены следующие правила:
- проектировать БД по доменам, а не вокруг одной общей CRM-таблицы
- не смешивать cash basis и accrual basis в базовой модели
- не делать расход товара на materialization/readiness-переходах заказа
- не обходить `ReturnRequest`
- не возвращать lifecycle `ReturnRequest` и `SupplierRequest` к устаревшим статусным цепочкам
- не проектировать CRM-side создание оплаты; для v1 допустим только intake/control внешнего payment факта
- не хранить KPI как первичный факт
- не допускать критические мутации без `idempotency`
- не разрешать произвольные статусы вне state machine



## v8 Architecture Overrides

- В pre-order/commercial preparation допускается `inventory.stock_lock` с коротким TTL.
- Durable reservation создаётся только для materialized `Order`.
- `orders.order` должен поддерживать агрегированный `delivery_status`.
- Связь `orders.order -> logistics.delivery_task` обязательна как `1:N`.
- Для `Order`, `Deal`, `Payment`, `ReturnRequest` обязателен soft delete.
- Возвратный товар по умолчанию идёт в `quarantine`, а не в `available`.
- Live KPI должны читаться из агрегатов.
- Для междоменных критичных операций должен существовать `system.outbox_event` или эквивалентный механизм rollback/compensation.


### 4.10.4 `system.outbox_event`

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
