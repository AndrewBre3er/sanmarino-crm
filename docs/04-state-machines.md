# 04. State Machines

## 1. Deal

Состояния:
- Draft
- Qualified
- Proposal
- Negotiation
- Won
- Lost

Правила:
- допустим обратный переход `Negotiation -> Proposal`
- переход из `Won` назад запрещён
- вне схемы возможен только admin override с аудитом

---

## 2. Order

Состояния:
- Draft
- Confirmed
- Reserved
- InProgress
- Completed
- Closed
- Cancelled
- PartialReturn
- FullReturn

Правила:
- `Draft` не создаёт durable reservation, но может иметь short-lived soft lock
- `Confirmed` разрешает резерв и бронирование логистики
- `Reserved` означает подтверждённый резерв
- `Completed` означает факт исполнения
- `Closed` означает завершение после урегулирования всех последствий
- `PartialReturn` и `FullReturn` допустимы только после исполнения
- `Draft -> Confirmed` должен быть защищён от гонки наличия и частичного междоменного отказа

---

## 3. DeliveryTask

Состояния:
- Planned
- Assigned
- InTransit
- Delivered
- Failed
- Rescheduled

Правила:
- `Delivered -> Planned` запрещён
- переходы вне схемы запрещены
- один order может иметь несколько delivery task

### 3.1 Агрегированный `Order.deliveryStatus`
Минимальные агрегированные значения:
- NotScheduled
- Scheduled
- PartiallyDelivered
- Delivered
- Failed

Правила:
- агрегированный статус вычисляется из связанных delivery task
- заказ не может считаться полностью доставленным, пока не закрыты все обязательные delivery task

---

## 4. Payment

Состояния:
- Pending
- Completed
- Refunded

Правила:
- `Completed -> Pending` запрещён
- частичный возврат отражается как `Refunded` с частичной суммой
- статус оплаты не должен быть встроен в статус исполнения заказа

---

## 5. ReturnRequest

Минимальная логика:
- Draft
- Submitted
- Approved
- Rejected
- Processed
- Closed

Правило:
- возврат не считается завершённым, пока не закрыты его последствия в нужных доменах
