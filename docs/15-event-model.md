# 15. Event Model

## Статус документа

Канонический документ по событийным контрактам.
Согласован с текущей доменной логикой:
- `Lead -> Deal -> Order(s) -> Fulfillment(s)`
- `cash basis`
- `ReturnRequest` как обязательная точка входа для возвратов
- `Order -> DeliveryTask = 1:N`
- `OnControl/Problem` как overlay-контур контроля денег после отгрузки
- `idempotency`, `outbox`, `reconciliation`

Документ намеренно не фиксирует:
- конкретный message broker
- конкретный transport
- конкретный формат реализации outbox/inbox

---

## 1. Назначение событийной модели

Событийная модель нужна, чтобы:
- синхронизировать домены без жёсткой связности
- запускать вторичные реакции (KPI, уведомления, сверки)
- сохранять воспроизводимый журнал фактов
- обеспечить идемпотентную обработку и трассировку

Ключевой принцип:
событие фиксирует факт, но не подменяет источник истины.

---

## 2. Базовые принципы

### 2.1 Primary fact first
Сначала фиксируется первичный факт в доменной таблице, потом публикуется событие.

### 2.2 Domain boundaries
Событие одного домена не должно подменять факт другого домена.
Пример: `delivery_task.delivered` не равен денежному факту.

### 2.3 Idempotency required
Повтор доставки одного события не должен создавать повторный бизнес-эффект.

### 2.4 Delivery semantics
Допустима at-least-once доставка, consumer обязан быть идемпотентным.

### 2.5 Cross-domain safety
Критические междоменные мутации должны быть атомарны или компенсируемы.
Публикация после коммита первичного факта должна идти через outbox или эквивалент.

---

## 3. Канонический envelope

```json
{
  "eventId": "evt_...",
  "eventType": "order.shipped",
  "eventVersion": 1,
  "occurredAt": "2026-04-04T10:00:00Z",
  "producer": "orders",
  "entityType": "Order",
  "entityId": "ord_...",
  "correlationId": "corr_...",
  "causationId": "cmd_...",
  "idempotencyKey": "idem_...",
  "payload": {},
  "meta": {
    "schemaVersion": 1,
    "actorUserId": "usr_...",
    "traceId": "trc_...",
    "sourceRequestId": "req_..."
  }
}
```

Обязательные поля:
- `eventId`, `eventType`, `eventVersion`
- `occurredAt`, `producer`
- `entityType`, `entityId`
- `payload`

Рекомендуемые поля:
- `correlationId`, `causationId`, `idempotencyKey`, `meta`

---

## 4. Именование и версия

Формат имени:
`<aggregate>.<fact>`

Требования:
- имя описывает свершившийся факт, не UI-действие
- одно событие = один факт
- breaking-изменения только через новую `eventVersion`

---

## 5. Каталог событий

## 5.1 CRM

### `lead.created`
Когда: создан lead из АТС/сайта/Avito.
Минимальный payload: `leadId`, `source`, `status`.

### `lead.in_processing`
Когда: lead переведён в `InProcessing`.
Минимальный payload: `leadId`, `responsibleUserId`, `changedAt`.

### `lead.cancelled`
Когда: lead отменён с причиной.
Минимальный payload: `leadId`, `reason`, `cancelledAt`.

### `deal.created_from_lead`
Когда: из lead в `InProcessing` создан deal.
Минимальный payload: `dealId`, `leadId`, `clientId`, `responsibleUserId`.

### `deal.updated`
Когда: коммерческие данные deal обновлены (товары/суммы/участники/метаданные).
Минимальный payload: `dealId`, `changedFields`, `updatedAt`.

### `deal.follow_up_updated`
Когда: обновлён follow-up/next-contact контур сделки.
Минимальный payload: `dealId`, `nextContactAt`, `reminderAt`, `updatedAt`.

### `deal.lost_reason_set`
Когда: сделка помечена как lost с причиной.
Минимальный payload: `dealId`, `lostReason`, `changedAt`.

### `deal.stuck_flag_changed`
Когда: сделка помечена как stuck/unstuck.
Минимальный payload: `dealId`, `isStuck`, `reason`, `changedAt`.

### `deal.communication_logged`
Когда: добавлена запись в communication history.
Минимальный payload: `dealId`, `clientId`, `channel`, `occurredAt`, `authorUserId`.

### `client.address_updated`
Когда: обновлён адрес клиента.
Минимальный payload: `clientId`, `updatedAt`.

### `client.merged`
Когда: выполнен dedup/merge клиентских карточек.
Минимальный payload: `targetClientId`, `mergedClientId`, `mergedAt`, `actorUserId`.

### `deal.cancelled`
Когда: deal отменён.
Минимальный payload: `dealId`, `reason`, `cancelledAt`.

### `deal.converted_to_order`
Когда: система автосоздала order из deal по правилам обеспечения товара.
Минимальный payload: `dealId`, `orderId`, `convertedAt`.

---

## 5.2 Supply + Inventory

### `stock_lock.created`
Когда: создан short-lived soft lock/pre-reserve.
Минимальный payload: `stockLockId`, `dealId`, `warehouseId`, `expiresAt`, `items`.

### `stock_lock.expired`
Когда: soft lock истёк.
Минимальный payload: `stockLockId`, `expiredAt`.

### `reservation.created`
Когда: создан durable reservation для `Order`.
Минимальный payload: `reservationId`, `orderId`, `warehouseId`, `expiresAt`, `items`.

### `reservation.released`
Когда: reservation снят (ручной/авто).
Минимальный payload: `reservationId`, `orderId`, `releasedAt`, `reason`.

### `supplier_request.created`
Когда: сформирована заявка поставщику.
Минимальный payload: `supplierRequestId`, `dealId`, `initiatorRole`, `items`.

### `supplier_request.confirmed_by_supplier`
Когда: поставщик подтвердил заявку.
Минимальный payload: `supplierRequestId`, `supplierId`, `expectedReceiptAt`.

### `supplier_request.paid`
Когда: заявка поставщику фактически оплачена.
Минимальный payload: `supplierRequestId`, `paidAt`, `paidByRole`.

### `supplier_request.stocked`
Когда: товар по заявке оприходован по receipt flow.
Минимальный payload: `supplierRequestId`, `purchaseReceiptId`, `stockedAt`.

### `product_supplier.matrix_updated`
Когда: обновлена связь `Product -> Supplier` (priority/base purchase price/active flag).
Минимальный payload: `productSupplierId`, `productId`, `supplierId`, `changedFields`, `updatedAt`.

### `inventory.receipt.recorded`
Когда: проведён приход на склад.
Минимальный payload: `movementId`, `warehouseId`, `items`, `recordedAt`.

### `inventory.receipt_discrepancy_detected`
Когда: при приходе зафиксировано расхождение.
Минимальный payload: `purchaseReceiptId`, `supplierRequestId`, `discrepancy`, `detectedAt`.

### `inventory.issue.recorded`
Когда: проведён расход по факту исполнения/отгрузки.
Минимальный payload: `movementId`, `orderId`, `warehouseId`, `items`, `recordedAt`.

### `inventory.returned_to_quarantine`
Когда: возврат зачислен в `quarantine`.
Минимальный payload: `movementId`, `returnRequestId`, `warehouseId`, `items`, `recordedAt`.

### `inventory.quarantine_released_to_available`
Когда: товар после дефектовки переведён из `quarantine` в `available`.
Минимальный payload: `movementId`, `warehouseId`, `items`, `recordedAt`.

---

## 5.3 Orders + Fulfillment

### `order.auto_created`
Когда: order автоматически создан из deal.
Минимальный payload: `orderId`, `dealId`, `status` (`Assembling`), `fulfillmentMethod`, `itemsSummary`.

### `order.status_changed`
Когда: изменён основной статус order.
Минимальный payload: `orderId`, `fromStatus`, `toStatus`, `changedAt`.

Поддерживаемые значения `toStatus`:
- `Assembling`
- `ReadyForPartialShipment`
- `ReadyForShipment`
- `PartiallyShipped`
- `Shipped`

### `order.partially_shipped`
Когда: order перешёл в частичную отгрузку.
Минимальный payload: `orderId`, `shippedItems`, `remainingItems`, `changedAt`.

### `order.shipped`
Когда: order полностью отгружен/выдан и закрыты связанные delivery/self-pickup операции.
Минимальный payload: `orderId`, `shippedAt`.

### `order.on_control_enabled`
Когда: order помечен `OnControl` (отгружено, но деньги не подтверждены).
Минимальный payload: `orderId`, `enabledAt`, `reason`.

### `order.problem_enabled`
Когда: order автоматически помечен `Problem` (деньги не подтверждены до следующего рабочего дня).
Минимальный payload: `orderId`, `enabledAt`, `escalationTargetRole`.

### `order.problem_cleared`
Когда: флаг `Problem` снят после подтверждения денег финансистом/директором.
Минимальный payload: `orderId`, `clearedAt`, `confirmedByRole`.

### `order.delivery_status_aggregated`
Когда: агрегированный delivery-статус order пересчитан из delivery task.
Минимальный payload: `orderId`, `deliveryStatus`, `changedAt`.

### `order.auto_creation_failed`
Когда: автосоздание order/supply-комбинации завершилось ошибкой и операция откатена/скомпенсирована.
Минимальный payload: `dealId`, `failureCode`, `failedAt`.

Примечание:
для совместимости может временно использоваться alias `order.confirmation_failed` (deprecated).

---

## 5.4 Logistics

### `delivery_task.created`
Когда: создана задача доставки.
Минимальный payload: `deliveryTaskId`, `orderId`, `status`, `plannedAt`.

### `delivery_task.assigned`
Когда: задача назначена водителю/маршруту.
Минимальный payload: `deliveryTaskId`, `driverId`, `routeDayId`, `assignedAt`.

### `delivery_task.in_transit`
Когда: задача перешла в доставку.
Минимальный payload: `deliveryTaskId`, `startedAt`.

### `delivery_task.delivered`
Когда: доставка подтверждена.
Минимальный payload: `deliveryTaskId`, `orderId`, `deliveredAt`.

### `delivery_task.failed`
Когда: доставка не исполнена.
Минимальный payload: `deliveryTaskId`, `orderId`, `reason`, `failedAt`.

### `delivery_task.rescheduled`
Когда: задача перенесена.
Минимальный payload: `deliveryTaskId`, `oldPlannedAt`, `newPlannedAt`, `reason`.

### `pickup.issued`
Когда: товар выдан клиенту при самовывозе.
Минимальный payload: `orderId`, `pickupWindowId`, `issuedAt`.

---

## 5.5 Payments + Finance

### `payment.external_fact_intaked`
Когда: внешний payment факт принят в CRM контур контроля.
Минимальный payload: `paymentId`, `orderId`, `externalSource`, `externalEventId`, `intakedAt`.

Правило:
`externalSource` описывает внешний платёжный канал/провайдера (`bank`, `acquiring`, `cash_register`, `manual_import`, `other`), а не inbound lead-интеграции `ATS`/`Avito`.

### `payment.external_fact_confirmed`
Когда: внешний payment факт подтверждён после контроля.
Минимальный payload: `paymentId`, `orderId`, `amount`, `confirmedAt`, `confirmedByRole`.

### `payment.external_fact_rejected`
Когда: внешний payment факт отклонён при контроле.
Минимальный payload: `paymentId`, `orderId`, `reason`, `rejectedAt`, `toStatus` (`rejected`).

### `payment.completed`
Когда: подтверждено поступление денег.
Минимальный payload: `paymentId`, `orderId`, `amount`, `completedAt`, `paymentMethod`.

Критично:
именно это событие (или alias `payment.external_fact_confirmed`) является основанием для cash-basis выручки, а не `order.shipped`.

### `payment.refund_completed`
Когда: подтверждён возврат денег.
Минимальный payload: `paymentId`, `returnRequestId`, `orderId`, `amount`, `completedAt`.

Ограничение:
допустимо только при наличии `ReturnRequest`.

### `finance.revenue_recognized`
Когда: в finance отражена выручка по денежному факту.
Минимальный payload: `financeEntryId`, `paymentId`, `orderId`, `amount`, `recognizedAt`.

### `finance.expense_recorded`
Когда: подтверждён расход.
Минимальный payload: `expenseId`, `expenseType`, `amount`, `recordedAt`.

### `finance.correction_created`
Когда: создана ручная финансовая корректировка.
Минимальный payload: `correctionId`, `reason`, `requestedByUserId`, `createdAt`.

### `finance.correction_submitted_for_approval`
Когда: корректировка отправлена на согласование.
Минимальный payload: `correctionId`, `submittedAt`.

### `finance.correction_approved`
Когда: корректировка согласована.
Минимальный payload: `correctionId`, `approvedAt`, `approvedByUserId`.

### `finance.correction_rejected`
Когда: корректировка отклонена.
Минимальный payload: `correctionId`, `rejectedAt`, `reason`.

### `finance.correction_applied`
Когда: корректировка применена и связана с `finance_entry`.
Минимальный payload: `correctionId`, `financeEntryId`, `appliedAt`.

---

## 5.6 Returns

### `return_request.created`
Минимальный payload: `returnRequestId`, `orderId`, `reason`, `items`, `status`.

### `return_request.confirmed`
Минимальный payload: `returnRequestId`, `confirmedAt`, `realizationAnchorAt`, `realizationAnchorType`, `requiresCeoApproval`, `confirmedByRole`.

Правило anchor для 14-day gating:
- `realizationAnchorType = min_fulfillment_fulfilled_at_for_return_items`
- `realizationAnchorAt` строится от `MIN(orders.fulfillments.fulfilled_at)` по возвращаемым позициям через `orders.fulfillment_items`
- `orders.orders.shipped_at` / `orders.orders.partially_shipped_at` не используются как anchor для этого правила

### `return_request.processed`
Минимальный payload: `returnRequestId`, `processedAt`, `inventoryHandled`, `paymentHandled`.

### `return_request.closed`
Минимальный payload: `returnRequestId`, `closedAt`.

---

## 5.7 System / Audit / Reconciliation / KPI

### `audit.override_performed`
Минимальный payload: `auditEventId`, `entityType`, `entityId`, `actorUserId`, `reason`, `performedAt`.

### `idempotency.conflict_detected`
Минимальный payload: `idempotencyKey`, `entityType`, `entityId`, `detectedAt`.

### `reconciliation.completed`
Минимальный payload: `reportId`, `periodStart`, `periodEnd`, `mismatchCount`, `completedAt`.

### `reconciliation.mismatch_detected`
Минимальный payload: `reportId`, `pair`, `leftEntityRef`, `rightEntityRef`, `actualDifference`, `recommendedAction`, `detectedAt`.

Допустимые значения `pair` (v1 baseline):
- `orders_payments`
- `orders_driver_money`
- `orders_inventory`
- `inventory_finance`
- `logistics_orders`

### `kpi.live_aggregate_refreshed`
Минимальный payload: `metricKey`, `period`, `refreshedAt`.

### `kpi.department_plan_set`
Минимальный payload: `planId`, `departmentId`, `metricKey`, `periodStart`, `periodEnd`, `planValue`, `setByUserId`, `setAt`.

### `kpi.department_plan_updated`
Минимальный payload: `planId`, `changedFields`, `updatedAt`, `updatedByUserId`.

### `integration.ats_event_received`
Минимальный payload: `integrationEventId`, `externalEventId`, `receivedAt`.

### `integration.avito_event_received`
Минимальный payload: `integrationEventId`, `externalEventId`, `receivedAt`.

### `notification.telegram_sent`
Минимальный payload: `notificationId`, `eventType`, `targetRef`, `sentAt`, `status`.

### `notification.max_sent`
Минимальный payload: `notificationId`, `eventType`, `targetRef`, `sentAt`, `status`.

---

## 6. Матрица обязательных реакций

### `order.shipped` / `delivery_task.delivered` / `pickup.issued`
Разрешённые реакции:
- обновление исполнения заказа
- создание `inventory.issue.recorded`
- обновление KPI исполнения

Запрещено:
- признавать выручку без `payment.completed`

### `payment.external_fact_confirmed` / `payment.completed`
Разрешённые реакции:
- `finance.revenue_recognized`
- снятие денежных блоков контроля при выполнении условий
- обновление денежных KPI

Запрещено:
- изменять складские остатки

### `payment.external_fact_rejected`
Разрешённые реакции:
- аудит/trace отклонения
- уведомления ответственным ролям

Запрещено:
- `finance.revenue_recognized`
- создание `cash_in` операции

### `return_request.confirmed`
Разрешённые реакции:
- возвратный поток inventory/payments/finance
- quarantine-обработка

Запрещено:
- закрывать возврат до обработки обязательных последствий
- использовать order-level shipment timestamps как anchor для 14-day CEO-gate

---

## 7. Минимальный обязательный набор v1

- `lead.created`
- `lead.in_processing`
- `lead.cancelled`
- `deal.created_from_lead`
- `deal.converted_to_order`
- `stock_lock.created`
- `stock_lock.expired`
- `supplier_request.created`
- `supplier_request.confirmed_by_supplier`
- `supplier_request.paid`
- `supplier_request.stocked`
- `reservation.created`
- `reservation.released`
- `order.auto_created`
- `order.status_changed`
- `order.partially_shipped`
- `order.shipped`
- `order.on_control_enabled`
- `order.problem_enabled`
- `delivery_task.created`
- `delivery_task.delivered`
- `pickup.issued`
- `inventory.receipt.recorded`
- `inventory.receipt_discrepancy_detected`
- `inventory.issue.recorded`
- `inventory.returned_to_quarantine`
- `payment.external_fact_intaked`
- `payment.external_fact_confirmed`
- `payment.external_fact_rejected`
- `payment.completed`
- `payment.refund_completed`
- `return_request.created`
- `return_request.confirmed`
- `return_request.processed`
- `return_request.closed`
- `finance.correction_approved`
- `finance.correction_applied`
- `reconciliation.completed`
- `reconciliation.mismatch_detected`
- `kpi.live_aggregate_refreshed`
- `kpi.department_plan_set`
- `integration.ats_event_received`
- `integration.avito_event_received`
- `notification.telegram_sent`
- `notification.max_sent`

---

## 8. Явно отложено (TODO)

- конкретный broker/transport и QoS-конфигурация
- schema registry политика
- детальная payload-схема и подписи провайдеров для inbound adapters
- детальный SLA retry/backoff по каждому consumer

---

## 9. Связь с другими документами

Использовать вместе с:
- `01-system-logic.md`
- `04-state-machines.md`
- `05-process-flows.md`
- `06-data-integrity-rules.md`
- `08-architecture-fixes-and-critical-blockers.md`
- `13-database-architecture.md`
- `14-api-contracts.md`

Если возникает конфликт:
1. `08-architecture-fixes-and-critical-blockers.md`
2. `01-system-logic.md`
3. `06-data-integrity-rules.md`
4. `04-state-machines.md`
5. этот документ
