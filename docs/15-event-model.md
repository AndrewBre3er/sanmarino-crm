# 15. Event Model


## Статус документа

Канонический технический документ для проектирования событийной модели системы.

Документ опирается на уже утверждённые правила проекта и не должен им противоречить:
- `Lead -> Deal -> Order(s) -> Fulfillment(s)`
- `cashBasis`
- `ReturnRequest` как обязательная точка входа для возвратов
- `state machine`
- `idempotency`
- разделение доменов и источников истины
- ежедневная `reconciliation`

Документ **не фиксирует**:
- конкретный брокер сообщений
- конкретную очередь
- конкретный transport layer
- конкретный формат outbox/inbox реализации
- конкретную гарантию доставки уровня инфраструктуры

Этот документ задаёт **логическую событийную модель**: какие события существуют, когда они возникают, какие поля обязаны содержать и какие домены могут на них реагировать.

---

## Приоритетные архитектурные поправки

Событийная модель должна отражать `08-architecture-fixes-and-critical-blockers.md`.
Обязательные последствия:
- междоменные мутации подтверждения заказа публикуются через outbox
- частичный успех без compensating action запрещён
- должны существовать события по soft lock, reservation, delivery task, quarantine и KPI aggregation

## 1. Назначение событийной модели

Событийная модель нужна для того, чтобы система могла:
- синхронизировать домены без скрытой связности
- обеспечивать аудит критических действий
- запускать вторичные процессы без дублирования бизнес-логики
- поддерживать идемпотентную обработку
- строить уведомления, KPI и сверки на основе воспроизводимых фактов
- отделять первичный факт от производных реакций

Ключевой принцип:
**событие не заменяет источник истины.**
Источник истины остаётся в доменной таблице, а событие является зафиксированным фактом изменения или фактом завершения доменного действия.

---

## 2. Базовые принципы

### 2.1 Событие публикуется только после фиксации первичного факта

Сначала система должна зафиксировать первичный факт в домене.
Только после этого может публиковаться событие.

Примеры:
- сначала создаётся `payments.payment`, затем публикуется `payment.completed`
- сначала создаётся `inventory.inventory_movement`, затем публикуется `inventory.issue.recorded`
- сначала обновляется статус `orders.order`, затем публикуется `order.confirmed`

---

### 2.2 Событие не должно быть единственным местом хранения бизнес-смысла

Запрещено строить систему так, чтобы:
- факт оплаты существовал только в событии
- факт отгрузки существовал только в событии
- факт возврата существовал только в событии

Событие должно ссылаться на первичный объект.

---

### 2.3 События делятся на доменные и системные

Доменные события отражают бизнес-факты:
- `order.confirmed`
- `payment.completed`
- `return_request.approved`

Системные события отражают технические процессы:
- `reconciliation.completed`
- `idempotency.conflict_detected`
- `integration.delivery_export_failed`

Основной фокус этого документа — **доменные события** и их обязательные системные последствия.

---

### 2.4 Идемпотентность обязательна

Повторная доставка одного и того же события не должна приводить к повторному бизнес-эффекту.

Следствия:
- у каждого события должен быть уникальный `eventId`
- должен существовать `deduplication key` или эквивалентный механизм обработки
- consumer обязан уметь безопасно обрабатывать повтор

---

### 2.5 События не должны ломать source of truth

Нельзя:
- по событию `order.confirmed` считать заказ оплаченным
- по событию `deal.won` считать доставку исполненной
- по событию `delivery.delivered` напрямую рисовать доход без денежного факта

Каждый домен реагирует на событие только в пределах своей ответственности.

---

## 3. Базовая структура события

Минимальная каноническая форма:

```json
{
  "eventId": "evt_...",
  "eventType": "payment.completed",
  "eventVersion": 1,
  "occurredAt": "2026-04-03T10:00:00Z",
  "producer": "payments",
  "entityType": "Payment",
  "entityId": "pay_...",
  "correlationId": "corr_...",
  "causationId": "cmd_...",
  "idempotencyKey": "idem_...",
  "payload": { ... },
  "meta": { ... }
}
```

---

## 4. Обязательные поля события

### 4.1 Идентификация

- `eventId` — уникальный идентификатор события
- `eventType` — каноническое имя события
- `eventVersion` — версия контракта события

---

### 4.2 Время и источник

- `occurredAt` — момент возникновения бизнес-факта
- `producer` — домен-источник события

---

### 4.3 Привязка к объекту

- `entityType` — тип доменной сущности
- `entityId` — идентификатор сущности

---

### 4.4 Трассировка

- `correlationId` — связывает цепочку процессов
- `causationId` — указывает непосредственную причину
- `idempotencyKey` — передаётся, если операция была идемпотентной командой

---

### 4.5 Полезная нагрузка

`payload` должен содержать только те поля, которые нужны downstream-обработчикам для безопасной реакции без дополнительной догадки о смысле.

Нельзя:
- дублировать весь объект без необходимости
- отправлять поля, не подтверждённые как факт
- подменять ссылочную связность текстовыми описаниями

---

### 4.6 Метаданные

`meta` может содержать:
- `schemaVersion`
- `tenantId` — `TBD`, если мультиарендность будет утверждена
- `actorUserId`
- `traceId`
- `sourceRequestId`

---

## 5. Правила именования

Рекомендуемый формат:
`<aggregate>.<fact>`

Примеры:
- `lead.created`
- `deal.won`
- `order.confirmed`
- `reservation.created`
- `payment.completed`
- `delivery.delivered`
- `return_request.approved`
- `reconciliation.completed`

Требования:
- имя должно отражать **свершившийся факт**, а не намерение
- имя не должно описывать UI-действие
- имя не должно смешивать несколько фактов в одном событии

Нежелательно:
- `order_button_clicked`
- `payment_and_delivery_done`
- `manager_changed_everything`

---

## 6. Каталог доменных событий

## 6.1 CRM

### `lead.created`

Возникает когда:
- в системе создан новый lead

Источник истины:
- `crm.lead`

Минимальный payload:
- `leadId`
- `source`
- `status`
- `clientId` — nullable
- `contactId` — nullable
- `responsibleUserId`

Потребители:
- audit
- analytics
- notifications — опционально

---

### `lead.converted_to_deal`

Возникает когда:
- lead конвертирован в deal

Источник истины:
- `crm.deal`

Минимальный payload:
- `leadId`
- `dealId`
- `clientId`
- `responsibleUserId`

Потребители:
- analytics
- audit

---

### `deal.created`

Возникает когда:
- создана новая сделка

Источник истины:
- `crm.deal`

Минимальный payload:
- `dealId`
- `clientId`
- `status`
- `responsibleUserId`

Потребители:
- analytics
- audit

---

### `deal.won`

Возникает когда:
- сделка переведена в `Won`

Источник истины:
- `crm.deal`

Минимальный payload:
- `dealId`
- `clientId`
- `wonAt`
- `responsibleUserId`

Потребители:
- analytics
- audit

Ограничение:
- событие не создаёт оплату, отгрузку или доход

---

### `deal.lost`

Возникает когда:
- сделка переведена в `Lost`

Источник истины:
- `crm.deal`

Минимальный payload:
- `dealId`
- `lostAt`
- `reason` — optional / `TBD`

Потребители:
- analytics
- audit

---

## 6.2 Orders

### `order.created`

Возникает когда:
- создан order в состоянии `Draft`

Источник истины:
- `orders.order`

Минимальный payload:
- `orderId`
- `dealId`
- `clientId`
- `status`
- `fulfillmentMethod`
- `itemsSummary`

Потребители:
- audit
- analytics

Ограничение:
- событие не должно запускать резерв или списание

---

### `order.confirmed`

Возникает когда:
- order подтверждён

Источник истины:
- `orders.order`

Минимальный payload:
- `orderId`
- `dealId`
- `clientId`
- `confirmedAt`
- `reservationRequired`
- `deliveryPlanningRequired`
- `pickupPlanningRequired`

Потребители:
- inventory
- logistics
- audit
- analytics

Ожидаемые реакции:
- inventory может создать `reservation`
- logistics может создать бронирование слота / задачу

Ограничение:
- само событие не должно считаться фактом резерва

---

### `order.cancelled`

Возникает когда:
- заказ отменён

Источник истины:
- `orders.order`

Минимальный payload:
- `orderId`
- `cancelledAt`
- `reason` — optional / `TBD`

Потребители:
- inventory
- logistics
- finance
- analytics
- audit

Ожидаемые реакции:
- снятие резерва
- освобождение слота
- финансовая проверка незавершённых денежных последствий

---

### `order.completed`

Возникает когда:
- исполнение заказа завершено

Источник истины:
- `orders.order`

Минимальный payload:
- `orderId`
- `completedAt`
- `fulfillmentCount`

Потребители:
- analytics
- audit

Ограничение:
- событие не признаёт доход автоматически

---

### `order.closed`

Возникает когда:
- заказ окончательно закрыт после урегулирования последствий

Источник истины:
- `orders.order`

Минимальный payload:
- `orderId`
- `closedAt`

Потребители:
- analytics
- audit

---

## 6.3 Fulfillment / Logistics

### `fulfillment.created`

Возникает когда:
- создано исполнение заказа

Источник истины:
- `orders.fulfillment`

Минимальный payload:
- `fulfillmentId`
- `orderId`
- `type`
- `status`
- `plannedDate`

Потребители:
- logistics
- audit

---

### `delivery.task_created`

Возникает когда:
- создана задача доставки

Источник истины:
- `logistics.delivery_task`

Минимальный payload:
- `deliveryTaskId`
- `orderId`
- `fulfillmentId` — nullable, если задача создана до финального исполнения
- `routeDayId` — nullable
- `slotId` — nullable
- `status`

Потребители:
- notifications
- analytics
- audit

---

### `delivery.assigned`

Возникает когда:
- доставка назначена водителю / маршруту

Источник истины:
- `logistics.delivery_task`

Минимальный payload:
- `deliveryTaskId`
- `orderId`
- `driverId`
- `vehicleId` — nullable
- `routeDayId`
- `assignedAt`

Потребители:
- notifications
- analytics
- audit

---

### `delivery.delivered`

Возникает когда:
- доставка подтверждена как исполненная

Источник истины:
- `logistics.delivery_task`
- связанный факт исполнения в `orders.fulfillment`

Минимальный payload:
- `deliveryTaskId`
- `orderId`
- `fulfillmentId`
- `deliveredAt`

Потребители:
- inventory
- analytics
- audit

Ожидаемые реакции:
- inventory фиксирует расход товара
- order/fulfillment может перейти к завершённому исполнению

Ограничение:
- inventory-расход — отдельный первичный факт, а не implicit часть события

---

### `pickup.issued`

Возникает когда:
- товар выдан при самовывозе

Источник истины:
- `orders.fulfillment` и/или `logistics`-сущность окна выдачи, если она выделена

Минимальный payload:
- `pickupWindowId` — nullable, если модель окна выдачи ещё не детализирована
- `orderId`
- `fulfillmentId`
- `issuedAt`

Потребители:
- inventory
- analytics
- audit

Ожидаемые реакции:
- inventory фиксирует расход

---

### `delivery.failed`

Возникает когда:
- доставка не исполнена

Источник истины:
- `logistics.delivery_task`

Минимальный payload:
- `deliveryTaskId`
- `orderId`
- `failedAt`
- `reason`

Потребители:
- orders
- notifications
- analytics
- audit

---

### `delivery.rescheduled`

Возникает когда:
- доставка перенесена

Источник истины:
- `logistics.delivery_task`

Минимальный payload:
- `deliveryTaskId`
- `orderId`
- `oldPlannedAt`
- `newPlannedAt`
- `reason` — optional

Потребители:
- notifications
- analytics
- audit

---

## 6.4 Inventory

### `reservation.created`

Возникает когда:
- резерв успешно создан

Источник истины:
- `inventory.reservation`

Минимальный payload:
- `reservationId`
- `orderId`
- `warehouseId`
- `expiresAt`
- `items`

Потребители:
- orders
- analytics
- audit

---

### `reservation.released`

Возникает когда:
- резерв снят вручную или автоматически

Источник истины:
- `inventory.reservation`

Минимальный payload:
- `reservationId`
- `orderId`
- `releasedAt`
- `releaseReason`

Потребители:
- orders
- analytics
- audit

---

### `inventory.receipt.recorded`

Возникает когда:
- на склад проведён приход

Источник истины:
- `inventory.purchase_receipt`
- `inventory.inventory_movement`

Минимальный payload:
- `receiptId`
- `warehouseId`
- `items`
- `recordedAt`

Потребители:
- finance
- analytics
- audit

Ожидаемые реакции:
- finance отражает закупочный расход на основании утверждённых правил учёта
- inventory пересчитывает среднюю себестоимость

---

### `inventory.issue.recorded`

Возникает когда:
- проведён расход товара

Источник истины:
- `inventory.inventory_movement`

Минимальный payload:
- `movementId`
- `warehouseId`
- `orderId`
- `fulfillmentId`
- `items`
- `recordedAt`

Потребители:
- finance
- analytics
- audit

Ожидаемые реакции:
- finance может отражать себестоимость, если это утверждено прикладной моделью

---

### `inventory.return_received`

Возникает когда:
- возвратный товар принят обратно на склад

Источник истины:
- `inventory.inventory_movement`
- связанный `orders.return_request`

Минимальный payload:
- `movementId`
- `returnRequestId`
- `warehouseId`
- `items`
- `receivedAt`

Потребители:
- finance
- analytics
- audit

---

### `inventory.writeoff.recorded`

Возникает когда:
- товар по возврату или иной причине списан, а не возвращён в остаток

Источник истины:
- `inventory.inventory_movement`

Минимальный payload:
- `movementId`
- `returnRequestId` — nullable
- `warehouseId`
- `items`
- `recordedAt`
- `reason`

Потребители:
- finance
- analytics
- audit

---

## 6.5 Payments / Finance

### `payment.completed`

Возникает когда:
- оплата успешно завершена

Источник истины:
- `payments.payment`
- `payments.cash_operation`

Минимальный payload:
- `paymentId`
- `orderId`
- `clientId`
- `amount`
- `currency` — `TBD`, если мультивалютность ещё не утверждена
- `completedAt`
- `paymentMethod` — optional / `TBD`

Потребители:
- finance
- orders
- analytics
- audit

Ожидаемые реакции:
- finance признаёт доход по `cashBasis`
- order UI может показать факт полученной оплаты как производный признак

Критично:
- именно это событие, а не `order.confirmed` и не `delivery.delivered`, является основанием для признания дохода от продажи

---

### `payment.refund_completed`

Возникает когда:
- возврат денег успешно проведён

Источник истины:
- `payments.payment` / `payments.refund` — точная модель `TBD`
- связанный `payments.cash_operation`

Минимальный payload:
- `refundId` — `TBD`, если сущность выделяется отдельно
- `paymentId`
- `orderId`
- `returnRequestId`
- `amount`
- `completedAt`

Потребители:
- finance
- orders
- analytics
- audit

Ограничение:
- событие допустимо только при наличии `ReturnRequest`

---

### `finance.revenue_recognized`

Возникает когда:
- finance зафиксировал доход на базе денежного события

Источник истины:
- `finance.finance_entry`

Минимальный payload:
- `financeEntryId`
- `paymentId`
- `orderId`
- `amount`
- `recognizedAt`

Потребители:
- analytics
- audit

Ограничение:
- это вторичный финансовый факт, а не исходное основание оплаты

---

### `finance.expense_recorded`

Возникает когда:
- finance зафиксировал расход

Источник истины:
- `finance.expense`
- или `finance.finance_entry`, в зависимости от финальной модели

Минимальный payload:
- `expenseId`
- `relatedEntityType` — optional
- `relatedEntityId` — optional
- `amount`
- `recordedAt`
- `expenseType`

Потребители:
- analytics
- audit

---

## 6.6 Returns

### `return_request.created`

Возникает когда:
- создан запрос на возврат

Источник истины:
- `orders.return_request`

Минимальный payload:
- `returnRequestId`
- `orderId`
- `clientId`
- `reason`
- `items`
- `status`

Потребители:
- payments
- inventory
- finance
- analytics
- audit

---

### `return_request.submitted`

Возникает когда:
- возврат отправлен на рассмотрение

Источник истины:
- `orders.return_request`

Минимальный payload:
- `returnRequestId`
- `orderId`
- `submittedAt`

Потребители:
- notifications
- analytics
- audit

---

### `return_request.approved`

Возникает когда:
- возврат одобрен

Источник истины:
- `orders.return_request`

Минимальный payload:
- `returnRequestId`
- `orderId`
- `approvedAt`
- `decisionScope`

Потребители:
- inventory
- payments
- finance
- analytics
- audit

Ожидаемые реакции:
- inventory готовит возврат на склад или списание
- payments может инициировать возврат денег
- finance готовит корректировку

---

### `return_request.rejected`

Возникает когда:
- возврат отклонён

Источник истины:
- `orders.return_request`

Минимальный payload:
- `returnRequestId`
- `orderId`
- `rejectedAt`
- `reason`

Потребители:
- notifications
- analytics
- audit

---

### `return_request.processed`

Возникает когда:
- все обязательные последствия возврата обработаны

Источник истины:
- `orders.return_request`

Минимальный payload:
- `returnRequestId`
- `orderId`
- `processedAt`
- `inventoryHandled`
- `paymentHandled`
- `financeHandled`

Потребители:
- analytics
- audit

---

### `return_request.closed`

Возникает когда:
- возврат окончательно закрыт

Источник истины:
- `orders.return_request`

Минимальный payload:
- `returnRequestId`
- `orderId`
- `closedAt`

Потребители:
- analytics
- audit

---

## 6.7 Audit / Reconciliation / System

### `audit.override_performed`

Возникает когда:
- выполнен `admin override`

Источник истины:
- `audit.audit_event`

Минимальный payload:
- `auditEventId`
- `entityType`
- `entityId`
- `actorUserId`
- `reason`
- `performedAt`

Потребители:
- security
- analytics

---

### `reconciliation.completed`

Возникает когда:
- ежедневная сверка завершена

Источник истины:
- `audit.reconciliation_report` или выделенный домен `reconciliation` — `TBD`

Минимальный payload:
- `reportId`
- `periodStart`
- `periodEnd`
- `status`
- `mismatchCount`
- `completedAt`

Потребители:
- notifications
- analytics
- audit

---

### `reconciliation.mismatch_detected`

Возникает когда:
- сверка нашла расхождение вне допуска

Источник истины:
- `reconciliation report`

Минимальный payload:
- `reportId`
- `pair`
- `tolerance`
- `actualDifference`
- `detectedAt`

Потребители:
- notifications
- operations
- finance
- audit

---

## 7. Матрица реакций по доменам

## 7.1 Order confirmed

Событие:
- `order.confirmed`

Типичные реакции:
- `inventory` -> попытка создать резерв
- `logistics` -> подготовка слота/задачи
- `audit` -> журналирование
- `analytics` -> обновление воронки

Нельзя:
- признавать доход
- списывать товар

---

## 7.2 Delivery delivered / Pickup issued

События:
- `delivery.delivered`
- `pickup.issued`

Типичные реакции:
- `inventory` -> создать расход
- `orders` -> обновить прогресс исполнения
- `analytics` -> обновить показатели исполнения

Нельзя:
- считать событие расходом само по себе без `inventory_movement`
- признавать доход

---

## 7.3 Payment completed

Событие:
- `payment.completed`

Типичные реакции:
- `finance` -> признать доход по cash basis
- `orders` -> показать оплаченный объём как производную информацию
- `analytics` -> обновить выручку и денежные KPI

Нельзя:
- трактовать это как факт доставки
- менять складские остатки

---

## 7.4 Return request approved

Событие:
- `return_request.approved`

Типичные реакции:
- `inventory` -> обработка возвратного товара
- `payments` -> возврат денег
- `finance` -> корректировка
- `analytics` -> обновление возвратных метрик

Нельзя:
- закрывать возврат до обработки обязательных последствий

---

## 8. Правила версионирования событий

### 8.1 Версия обязательна

Каждое событие должно иметь `eventVersion`.

---

### 8.2 Эволюция контракта

Разрешено:
- добавлять новые необязательные поля
- добавлять новые метаданные

Требует новой версии:
- удаление обязательного поля
- изменение смысла существующего поля
- изменение структуры payload так, что старый consumer не сможет безопасно обработать событие

---

### 8.3 Параллельная поддержка

Если событие критично для нескольких интеграций, при миграции должна поддерживаться параллельная совместимость на период перехода.

---

## 9. Требования к доставке и обработке

Этот раздел логический, не инфраструктурный.

Обязательные свойства системы обработки:
- at-least-once обработка допустима
- consumer должен быть идемпотентным
- публикация событий не должна теряться после успешной фиксации первичного факта
- ошибки downstream не должны откатывать уже зафиксированный первичный факт задним числом

Рекомендуемый паттерн реализации:
- `outbox` для producer
- `inbox` / deduplication registry для consumer

Конкретная реализация — `TBD`.

---

## 10. Связь с аудитом

Не каждое доменное событие заменяет полноценный аудит.

Аудит должен отдельно уметь фиксировать:
- кто выполнил действие
- какие поля были изменены
- был ли это override
- откуда пришла команда
- был ли системный retry

Доменные события и аудит связаны, но не тождественны.

---

## 11. Что нельзя делать

Запрещено:
- строить критическую бизнес-логику на неканонических именах событий
- публиковать событие до фиксации первичного факта
- обрабатывать одно и то же событие без идемпотентной защиты
- использовать событие одного домена как замену первичного факта другого домена
- смешивать в одном событии несколько независимых бизнес-фактов
- признавать доход по событиям исполнения без денежного факта
- проводить refund event без `ReturnRequest`

---

## 12. Минимальный MVP-набор событий

Если проект запускается поэтапно, минимально обязательный набор:
- `lead.created`
- `deal.created`
- `deal.won`
- `order.created`
- `order.confirmed`
- `order.cancelled`
- `delivery.task_created`
- `delivery.delivered`
- `pickup.issued`
- `reservation.created`
- `reservation.released`
- `inventory.receipt.recorded`
- `inventory.issue.recorded`
- `payment.completed`
- `payment.refund_completed`
- `return_request.created`
- `return_request.approved`
- `return_request.closed`
- `reconciliation.completed`
- `reconciliation.mismatch_detected`

Этот набор достаточен, чтобы:
- держать связность между доменами
- поддерживать cash basis
- обеспечить возвраты
- сделать аудит и сверку воспроизводимыми

---

## 13. Связь с другими документами

Этот документ должен использоваться совместно с:
- `01-system-logic.md`
- `04-state-machines.md`
- `05-process-flows.md`
- `06-data-integrity-rules.md`
- `13-database-architecture.md`
- `14-api-contracts.md`

Если между документами возникает конфликт, приоритет такой:
1. `01-system-logic.md`
2. `06-data-integrity-rules.md`
3. `04-state-machines.md`
4. этот документ
5. API и инфраструктурные документы


## v8 Architecture Overrides

Обязательные дополнительные события:
- `draft_order.soft_lock_created`
- `draft_order.soft_lock_expired`
- `order.confirmation_failed`
- `delivery_task.created`
- `order.delivery_status_aggregated`
- `inventory.returned_to_quarantine`
- `inventory.quarantine_released_to_available`
- `kpi.live_aggregate_refreshed`

Публикация междоменных событий должна идти через outbox или эквивалентную надёжную схему.
