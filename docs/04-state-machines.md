# 04. State Machines

## 1. Lead

Состояния:
- `New`
- `InProcessing`
- `Cancelled`

Правила:
- `New -> InProcessing` выполняется менеджером и запускает создание `Deal`
- `New -> Cancelled` требует обязательную причину
- отменённый lead не должен переходить в `Deal`
- точные причины отмены ведутся отдельно от статуса

---

## 2. Deal

Состояния:
- `InProgress`
- `ConvertedToOrder`
- `Cancelled`

Правила:
- `Deal` начинается после перевода lead в `InProcessing`
- `Deal` служит коммерческим заказом менеджера на первом этапе
- `ConvertedToOrder` фиксируется только после автоматического создания `Order`
- резерв, supply coverage и supplier request не должны подменяться свободным status patch без доменных правил

---

## 3. Order

Состояния:
- `Assembling`
- `ReadyForPartialShipment`
- `ReadyForShipment`
- `PartiallyShipped`
- `Shipped`

Правила:
- `Order` создаётся системой автоматически из `Deal`
- стартовый статус автосозданного заказа — `Assembling`
- `ReadyForShipment` допустим только когда весь товар физически есть на складе и поставлен в резерв
- `ReadyForPartialShipment` допустим, когда есть только частичный резерв
- частичная отгрузка из `ReadyForPartialShipment` разрешена
- `PartiallyShipped` означает, что часть позиций уже передана клиенту, а часть ещё нет
- `Shipped` означает, что товар передан клиенту и закрыты все связанные delivery / self-pickup операции

### 3.1 Control flags поверх `Order`
Это не основные статусы заказа.
Минимальные значения:
- `None`
- `OnControl`
- `Problem`

Правила:
- `OnControl` включается, если товар отгружен, но деньги ещё не подтверждены
- `Problem` включается автоматически, если деньги не подтверждены до следующего рабочего дня
- снять `Problem` можно только после поступления денег и подтверждения финансистом или исполнительным директором

---

## 4. SupplierRequest

Состояния:
- `Formed`
- `ConfirmedBySupplier`
- `Received`
- `ReceivedWithDiscrepancy`

Правила:
- инициатором supplier request могут быть продавец, кладовщик, исполнительный директор или админ
- изменение подтверждающего supply-статуса выполняют только роли с отдельным правом
- `ConfirmedBySupplier` обязан содержать ожидаемый срок поставки
- supplier request не должен напрямую менять остатки

---

## 5. DeliveryTask

Состояния:
- `Planned`
- `Assigned`
- `InTransit`
- `Delivered`
- `Failed`
- `Rescheduled`

Правила:
- `Delivered -> Planned` запрещён
- переходы вне схемы запрещены
- один `Order` может иметь несколько `DeliveryTask`

### 5.1 Агрегированный `Order.deliveryStatus`
Минимальные агрегированные значения:
- `NotScheduled`
- `Scheduled`
- `PartiallyDelivered`
- `Delivered`
- `Failed`

Правила:
- агрегированный статус вычисляется из связанных delivery task
- заказ не может считаться полностью доставленным, пока не закрыты все обязательные delivery task

---

## 6. Payment

Состояния:
- `Pending`
- `Completed`
- `Refunded`

Правила:
- `Completed -> Pending` запрещён
- частичный возврат отражается суммой возврата, а не свободным откатом статуса
- статус оплаты не должен подменять status/order control flags

---

## 7. ReturnRequest

Минимальная логика:
- `Draft`
- `Submitted`
- `Approved`
- `Rejected`
- `Processed`
- `Closed`

Правило:
- возврат не считается завершённым, пока не закрыты его последствия в нужных доменах
