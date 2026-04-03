# 14. API Contracts


## Статус документа

Канонический технический документ для проектирования API-контрактов системы.

Документ опирается на уже утверждённую доменную логику и не должен противоречить:
- `Lead -> Deal -> Order(s) -> Fulfillment(s)`
- `cashBasis`
- `ReturnRequest`
- `state machine`
- `idempotency`
- разделению источников истины по доменам

Документ **не фиксирует**:
- конкретный web framework
- конкретный transport beyond HTTP API
- конкретную схему auth provider
- websocket / queue / event-stream реализацию
- точную OpenAPI-спецификацию

Этот документ задаёт **канонический уровень ресурсов, команд, правил мутаций и форматов данных**.

---

## Приоритетные архитектурные поправки

При проектировании API этот документ обязан учитывать `08-architecture-fixes-and-critical-blockers.md`.
Обязательные последствия:
- idempotency проверяется до доменных сервисов
- confirm order не может оставлять частичный междоменный успех
- order может иметь несколько delivery task
- order delivery status агрегируется
- возвратный товар по умолчанию идёт в quarantine
- физические `DELETE` для `Order`, `Deal`, `Payment`, `ReturnRequest` запрещены
- live KPI читаются из агрегатов, а не инициируют тяжёлые runtime JOIN

## 1. Назначение API

API должно обеспечивать:
- работу UI и интеграций с единым источником правил
- разделение чтения и мутаций по доменам
- строгие переходы по state machine
- идемпотентность критических операций
- явную ссылочную связность между доменами
- возможность аудита и сверки

API не должно:
- скрыто смешивать домены
- менять статусы вне правил
- создавать финансовые, складские или логистические факты внутри случайных CRM-запросов

---

## 2. Общие принципы API

### 2.1 Ресурсная модель

Базовая модель — HTTP API с ресурсами и командными endpoint'ами для статусных переходов.

Подход:
- чтение через ресурсные endpoint'ы
- создание и частичное изменение через стандартные операции
- переходы state machine через явные команды

Пример принципа:
- `PATCH /orders/{id}` — редактирование разрешённых полей
- `POST /orders/{id}/confirm` — переход статуса

---

### 2.2 Версионирование

API должно быть версионируемым.

Форма префикса версии — `TBD`.
В примерах ниже версия опускается ради краткости.

---

### 2.3 Формат идентификаторов

Во внешнем API все идентификаторы рассматриваются как **opaque string**.
Конкретный внутренний тип ID не фиксируется этим документом.

---

### 2.4 Формат времени

Все даты и время в API должны передаваться в явном формате datetime/date.
Конкретный формат сериализации выбирается в OpenAPI-документе позже.

---

### 2.5 Формат денег и количеств

Денежные суммы и количества передаются отдельными полями.

Не допускается:
- кодировать бизнес-смысл знаком числа
- смешивать денежный статус и сумму в одном поле

---

## 3. Общий формат ответа

## 3.1 Базовая форма успешного ответа

```json
{
  "data": { ... },
  "meta": { ... }
}
```

`meta` может содержать:
- pagination
- filter echo
- warnings
- reconciliation hints

---

## 3.2 Базовая форма ошибки

```json
{
  "error": {
    "code": "ORDER_TRANSITION_NOT_ALLOWED",
    "message": "Transition is not allowed",
    "details": { ... },
    "traceId": "..."
  }
}
```

Обязательные свойства ошибки:
- `code`
- `message`

Желательные:
- `details`
- `traceId`

---

## 3.3 Коды ошибок верхнего уровня

Минимальный набор доменно значимых кодов:
- `VALIDATION_ERROR`
- `NOT_FOUND`
- `CONFLICT`
- `IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD`
- `TRANSITION_NOT_ALLOWED`
- `INSUFFICIENT_STOCK`
- `RESERVATION_NOT_ALLOWED`
- `PAYMENT_REFUND_REQUIRES_RETURN_REQUEST`
- `SOURCE_OF_TRUTH_VIOLATION`
- `ACCESS_DENIED`

Конкретные HTTP status codes фиксируются позже в OpenAPI.

---

## 4. Идемпотентность API

### 4.1 Где обязательна

`Idempotency-Key` обязателен для критических мутаций минимум в операциях:
- создание оплаты
- проведение возврата денег
- подтверждение заказа, если операция создаёт резерв
- проведение складского прихода
- проведение складского расхода
- подтверждение исполнения
- критические переходы состояний

---

### 4.2 Поведение

Проверка `Idempotency-Key` должна выполняться middleware/guard/interceptor-слоем до входа в доменный сервис.

Если запрос с тем же `Idempotency-Key` уже был успешно обработан, API должно вернуть ранее созданный результат, а не создать новый.

Если с тем же ключом пришёл другой payload, API должно вернуть конфликт идемпотентности.

---

## 5. Правила мутаций

### 5.0 Soft delete policy

Для ресурсов `Order`, `Deal`, `Payment`, `ReturnRequest` запрещены физические `DELETE` endpoint'ы.
Допустимы только:
- archive / soft-delete
- cancel / void / reject
- read access для audit/reconciliation контуров по скрытым или архивным записям


### 5.1 State machine как command API

Статусные переходы запрещено делать произвольным `PATCH status=...`, если речь идёт о сущностях со state machine.

Правильный подход:
- отдельные командные endpoint'ы
- backend-валидация перехода
- запись в audit для override

---

### 5.2 Source-of-truth enforcement

API не должно разрешать:
- ставить `order` как оплаченный без факта в `payments`
- ставить `deal` как доставленную без факта в `logistics`
- менять остатки товара из CRM endpoint'ов
- записывать доход только через finance без денежного основания, если это доход от продажи

---

### 5.3 Возвраты

API не должно разрешать:
- прямой refund без `ReturnRequest`
- возврат товара на склад без `ReturnRequest`
- закрытие возврата, пока последствия в нужных доменах не обработаны

---

## 6. Базовые DTO и поля ресурса

Минимально рекомендуется, чтобы каждый внешний ресурс содержал:
- `id`
- `status`, если для сущности применимо
- `createdAt`
- `updatedAt`

Для связей:
- `...Id`
- при необходимости — вложенный `relationships` / `included`, но конкретный формат = `TBD`

Для доменных сумм:
- `amount`
- `currency` — если включена мультивалютность, иначе может отсутствовать до отдельного решения

---

## 7. Контракты по доменам

## 7.1 CRM API

## 7.1.1 Leads

### `POST /leads`
Создать lead.

Request:
```json
{
  "source": "...",
  "clientId": "...",
  "contactId": "...",
  "responsibleUserId": "...",
  "notes": "..."
}
```

Response:
```json
{
  "data": {
    "id": "lead_...",
    "source": "...",
    "status": "TBD",
    "clientId": "...",
    "contactId": "...",
    "responsibleUserId": "...",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### `GET /leads/{leadId}`
Получить lead.

### `GET /leads`
Список lead с фильтрами `source`, `responsibleUserId`, `createdFrom`, `createdTo` и др. — точный набор фильтров `TBD`.

### `PATCH /leads/{leadId}`
Изменить разрешённые поля lead.

Lead state machine пока отдельно не утверждена, поэтому статус lead не фиксируется этим документом.

---

## 7.1.2 Clients

### `POST /clients`
Создать client.

### `GET /clients/{clientId}`
Получить client.

### `GET /clients`
Список clients.

### `PATCH /clients/{clientId}`
Изменить client.

---

## 7.1.3 Contacts

### `POST /contacts`
Создать contact.

### `GET /contacts/{contactId}`
Получить contact.

### `GET /contacts`
Список contacts.

### `PATCH /contacts/{contactId}`
Изменить contact.

---

## 7.1.4 Deals

### `POST /deals`
Создать deal.

Request:
```json
{
  "leadId": "...",
  "clientId": "...",
  "contactId": "...",
  "responsibleUserId": "...",
  "source": "...",
  "commercialTerms": {},
  "notes": "..."
}
```

Response содержит `status = Draft` по умолчанию, если иное не утверждено отдельно.

### `GET /deals/{dealId}`
Получить deal.

### `GET /deals`
Список deals.

### `PATCH /deals/{dealId}`
Изменить только разрешённые редактируемые поля deal.

### Command endpoints для deal
- `POST /deals/{dealId}/qualify`
- `POST /deals/{dealId}/propose`
- `POST /deals/{dealId}/negotiate`
- `POST /deals/{dealId}/win`
- `POST /deals/{dealId}/lose`
- `POST /deals/{dealId}/return-to-proposal`

Правила:
- `Won` назад не переводится
- переход вне схемы возможен только через отдельный admin override endpoint с audit

Пример ответа:
```json
{
  "data": {
    "id": "deal_...",
    "status": "Negotiation",
    "clientId": "...",
    "responsibleUserId": "...",
    "updatedAt": "..."
  }
}
```

---

## 7.2 Orders API

## 7.2.1 Orders

### `POST /orders`
Создать order.

Request:
```json
{
  "dealId": "...",
  "fulfillmentMode": "delivery",
  "items": [
    {
      "productId": "...",
      "quantity": 2,
      "unitPrice": "1000.00"
    }
  ],
  "comment": "..."
}
```

Response:
```json
{
  "data": {
    "id": "order_...",
    "dealId": "...",
    "status": "Draft",
    "fulfillmentMode": "delivery",
    "items": [
      {
        "id": "item_...",
        "productId": "...",
        "quantity": 2,
        "unitPrice": "1000.00",
        "lineTotal": "2000.00"
      }
    ],
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### `GET /orders/{orderId}`
Получить order.

### `GET /orders`
Список orders с фильтрами: `dealId`, `status`, `clientId`, `createdFrom`, `createdTo`, `fulfillmentMode` и др. — точный перечень `TBD`.

### `PATCH /orders/{orderId}`
Изменить order в пределах разрешённых полей.

Правило:
после подтверждения изменение состава должно быть контролируемым. Свободный `PATCH` для критических полей после подтверждения запрещён.

---

## 7.2.2 Order status commands

### `POST /orders/{orderId}/confirm`
Подтвердить заказ.

Эффекты:
- перевод в `Confirmed`
- разрешение на резерв
- разрешение на логистическое бронирование

Не создаёт:
- доход
- товарный расход

Требования:
- `Idempotency-Key`
- валидация состава заказа
- предварительная проверка доступности и логистики

### `POST /orders/{orderId}/reserve`
Создать или подтвердить резерв по заказу.

Правила:
- запрещено для `Draft`
- при нехватке товара возвращается `INSUFFICIENT_STOCK`

### `POST /orders/{orderId}/start-processing`
Перевести заказ в `InProgress`.

### `POST /orders/{orderId}/complete`
Отметить order как исполненный по факту.

Правило:
этот endpoint не должен сам по себе подменять логистический факт и складское движение. Он должен использовать факты исполнения как основание.

### `POST /orders/{orderId}/close`
Закрыть order после урегулирования последствий.

### `POST /orders/{orderId}/cancel`
Отменить order.

Эффекты:
- снятие активных резервов
- фиксация audit

---

## 7.2.3 Fulfillments

### `POST /orders/{orderId}/fulfillments`
Создать fulfillment для заказа.

Request:
```json
{
  "type": "delivery",
  "plannedAt": "..."
}
```

### `GET /fulfillments/{fulfillmentId}`
Получить fulfillment.

### `GET /orders/{orderId}/fulfillments`
Список fulfillment по заказу.

### `POST /fulfillments/{fulfillmentId}/confirm-execution`
Подтвердить факт исполнения.

Эффекты:
- подтверждение исполнения
- инициирование складского расхода
- синхронизация с логистическим фактом

Требование:
- `Idempotency-Key`

---

## 7.2.4 Return requests

### `POST /return-requests`
Создать возврат.

Request:
```json
{
  "orderId": "...",
  "reason": "...",
  "comment": "...",
  "items": [
    {
      "orderItemId": "...",
      "quantity": 1
    }
  ]
}
```

Позиционный состав возврата обязателен логически, даже если физическая структура ещё дорабатывается.

### `GET /return-requests/{returnRequestId}`
Получить возврат.

### `GET /orders/{orderId}/return-requests`
Список возвратов по заказу.

### Command endpoints для return request
- `POST /return-requests/{returnRequestId}/submit`
- `POST /return-requests/{returnRequestId}/approve`
- `POST /return-requests/{returnRequestId}/reject`
- `POST /return-requests/{returnRequestId}/process`
- `POST /return-requests/{returnRequestId}/close`

Правила:
- `Processed` не означает автоматическое `Closed`
- `Closed` возможно только после завершения последствий в нужных доменах

---

## 7.3 Inventory API

## 7.3.1 Products
- `POST /products`
- `GET /products/{productId}`
- `GET /products`
- `PATCH /products/{productId}`

---

## 7.3.2 Warehouses
- `POST /warehouses`
- `GET /warehouses/{warehouseId}`
- `GET /warehouses`
- `PATCH /warehouses/{warehouseId}`

---

## 7.3.3 Stock balances

### `GET /stock-balances`
Получить агрегированные остатки.

Фильтры:
- `warehouseId`
- `productId`
- `availableGt`
- и др. — `TBD`

Response example:
```json
{
  "data": [
    {
      "warehouseId": "...",
      "productId": "...",
      "onHand": 10,
      "reserved": 3,
      "available": 7,
      "avgCost": "500.00",
      "updatedAt": "..."
    }
  ]
}
```

---

## 7.3.4 Reservations

### `POST /reservations`
Создать резерв.

Request:
```json
{
  "orderId": "...",
  "warehouseId": "...",
  "items": [
    {
      "productId": "...",
      "quantity": 2
    }
  ]
}
```

Правила:
- запрещено для `Draft` order
- должна проверяться доступность
- резерв должен иметь TTL

### `GET /reservations/{reservationId}`
Получить резерв.

### `GET /reservations`
Список резервов.

### `POST /reservations/{reservationId}/release`
Снять резерв вручную или системно.

Правило:
ручное снятие должно попадать в audit.

---

## 7.3.5 Inventory movements

### `GET /inventory-movements`
Получить журнал движений товара.

Фильтры:
- `warehouseId`
- `productId`
- `movementType`
- `referenceType`
- `referenceId`
- период

### `POST /inventory-receipts`
Провести приход.

Требования:
- `Idempotency-Key`
- после прихода должна обновляться средняя себестоимость

### `POST /inventory-issues`
Провести расход.

Правило:
для продажного расхода request должен ссылаться на факт исполнения, а не на простое подтверждение заказа.

Этот endpoint допустим как системный/внутренний, но не должен использоваться UI для обхода бизнес-процесса.

---

## 7.4 Payments API

## 7.4.1 Payments

### `POST /payments`
Создать payment.

Request:
```json
{
  "orderId": "...",
  "amount": "2000.00",
  "paymentMethod": "cash",
  "externalRef": "..."
}
```

Требования:
- `Idempotency-Key`

Response example:
```json
{
  "data": {
    "id": "payment_...",
    "orderId": "...",
    "status": "Pending",
    "amount": "2000.00",
    "paymentMethod": "cash",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### `GET /payments/{paymentId}`
Получить payment.

### `GET /payments`
Список payments.

### `POST /payments/{paymentId}/complete`
Подтвердить оплату.

Эффекты:
- перевод `payment` в `Completed`
- создание `cash operation`
- создание `finance income entry` по `cashBasis`

Требования:
- `Idempotency-Key`

---

## 7.4.2 Refunds

### `POST /payments/{paymentId}/refunds`
Провести возврат денег.

Request:
```json
{
  "returnRequestId": "...",
  "amount": "500.00",
  "reason": "..."
}
```

Правила:
- без `returnRequestId` endpoint должен возвращать ошибку
- частичный возврат допустим
- статус `payment` и сумма возврата должны быть согласованы с доменной логикой

Эффекты:
- создание `cash operation` типа `refund`
- создание финансовой корректировки

Требования:
- `Idempotency-Key`

---

## 7.4.3 Cash operations

### `GET /cash-operations`
Получить список денежных операций.

Фильтры:
- `paymentId`
- `operationType`
- период
- `returnRequestId`

---

## 7.5 Logistics API

## 7.5.1 Delivery slots
- `POST /delivery-slots`
- `GET /delivery-slots/{slotId}`
- `GET /delivery-slots`
- `PATCH /delivery-slots/{slotId}`

## 7.5.2 Pickup windows
- `POST /pickup-windows`
- `GET /pickup-windows/{pickupWindowId}`
- `GET /pickup-windows`
- `PATCH /pickup-windows/{pickupWindowId}`

## 7.5.3 Drivers / Vehicles / Route days
- `POST /drivers`
- `GET /drivers/{driverId}`
- `GET /drivers`
- `PATCH /drivers/{driverId}`

- `POST /vehicles`
- `GET /vehicles/{vehicleId}`
- `GET /vehicles`
- `PATCH /vehicles/{vehicleId}`

- `POST /route-days`
- `GET /route-days/{routeDayId}`
- `GET /route-days`
- `PATCH /route-days/{routeDayId}`

---

## 7.5.4 Delivery tasks

### `POST /delivery-tasks`
Создать задачу доставки.

Request:
```json
{
  "orderId": "...",
  "fulfillmentId": "...",
  "deliverySlotId": "...",
  "routeDayId": "...",
  "plannedAt": "..."
}
```

### `GET /delivery-tasks/{taskId}`
Получить delivery task.

### `GET /delivery-tasks`
Список delivery tasks.

### Command endpoints для delivery task
- `POST /delivery-tasks/{taskId}/assign`
- `POST /delivery-tasks/{taskId}/start-transit`
- `POST /delivery-tasks/{taskId}/deliver`
- `POST /delivery-tasks/{taskId}/fail`
- `POST /delivery-tasks/{taskId}/reschedule`

Правила:
- статусы должны соответствовать delivery state machine
- `Delivered -> Planned` запрещён
- логистический факт доставки должен быть первичным источником истины для исполнения доставки

---

## 7.6 Finance API

## 7.6.1 Finance entries

### `GET /finance-entries`
Получить финансовые записи.

Фильтры:
- `entryType`
- `paymentId`
- `expenseId`
- `marketingExpenseId`
- `purchaseReceiptId`
- `returnRequestId`
- период

### `GET /finance-entries/{financeEntryId}`
Получить одну финансовую запись.

Создание финансовых записей по доходу от продажи предпочтительно должно происходить системно от денежных фактов, а не прямым ручным публичным endpoint'ом.

---

## 7.6.2 Expenses
- `POST /expenses`
- `GET /expenses/{expenseId}`
- `GET /expenses`
- `PATCH /expenses/{expenseId}`

## 7.6.3 Marketing expenses
- `POST /marketing-expenses`
- `GET /marketing-expenses/{marketingExpenseId}`
- `GET /marketing-expenses`
- `PATCH /marketing-expenses/{marketingExpenseId}`

---

## 7.7 KPI / Analytics API

## 7.7.1 Live KPI
### `GET /kpi/live`
Получить текущие показатели.

Фильтры:
- `metricKey`
- `scope`
- `date`

## 7.7.2 Snapshot KPI
### `GET /kpi/snapshots`
Получить зафиксированные показатели.

Фильтры:
- `metricKey`
- `periodType`
- `periodStart`
- `periodEnd`

Правило:
KPI — только read-поверхность для пользователей и систем. KPI не должен использоваться как первичный мутирующий контур бизнес-фактов.

---

## 7.8 Users / Roles / Permissions API

Минимальный набор:
- `GET /users`
- `GET /users/{userId}`
- `POST /users`
- `PATCH /users/{userId}`

- `GET /roles`
- `GET /permissions`
- `POST /users/{userId}/roles/{roleId}`
- `DELETE /users/{userId}/roles/{roleId}`

RBAC-поверхность должна контролировать:
- страницы
- блоки
- поля
- действия
- экспорт
- API-method permissions

Детальная security-модель фиксируется отдельным документом позже.

---

## 7.9 Audit API

### `GET /audit-events`
Получить журнал аудита.

Фильтры:
- `actorUserId`
- `entityType`
- `entityId`
- `eventType`
- период

`POST /audit-events` как публичный endpoint не рекомендуется. Audit должен формироваться системой автоматически.

---

## 7.10 Reconciliation API

### `GET /reconciliation-reports`
Получить отчёты сверки.

### `GET /reconciliation-reports/{reportId}`
Получить конкретный отчёт.

### `POST /reconciliation-runs`
Запустить сверку.

Этот endpoint должен быть ограничен по доступу и обычно использоваться системно или администраторами.

---

## 8. Правила связности между endpoint'ами

## 8.1 Deal -> Order

API должно поддерживать явную связь order с deal.
Создание order без `dealId` не должно считаться каноническим путём, если иное не утверждено отдельно.

---

## 8.2 Order -> Reservation

Подтверждение заказа может открывать путь к резерву, но:
- не должно создавать товарный расход
- не должно создавать доход

---

## 8.3 Payment -> Finance

Подтверждение оплаты должно создавать последствия в finance по `cashBasis`.

---

## 8.4 Delivery / Fulfillment -> Inventory

Подтверждение исполнения должно быть основанием для расхода товара.

---

## 8.5 ReturnRequest -> Refund / Inventory / Finance

Все возвратные последствия должны опираться на `ReturnRequest`.

---

## 9. Минимальные правила фильтрации и списков

Для коллекций API должно поддерживаться:
- пагинация
- сортировка
- фильтрация
- периодные фильтры для операционных и отчётных сущностей

Конкретный формат параметров пагинации и сортировки — `TBD`, но он должен быть единым во всех доменах.

---

## 10. Минимальные правила доступа

API должно учитывать RBAC на уровне:
- ресурса
- поля
- действия
- отчёта

Примеры:
- sales видит свои сделки и заказы, но не полную финансовую отчётность
- marketing видит каналы, лиды по источникам, CPL/CAC/ROMI
- finance видит доходы и расходы
- logistics видит логистические сущности
- warehouse видит складские сущности
- management / CEO видит сквозную картину

---

## 11. Операции, которые не должны проектироваться как свободные CRUD

Следующие действия нельзя сводить к произвольному изменению поля через `PATCH`:
- подтверждение заказа
- резервирование
- проведение оплаты
- возврат денег
- проведение складского прихода
- проведение складского расхода
- подтверждение исполнения
- перевод return request по стадиям
- критические логистические переходы
- admin override статусов

Для них должны быть отдельные command endpoint'ы.

---

## 12. Открытые вопросы, которые пока остаются TBD

Следующие решения нельзя дорисовывать без отдельного утверждения:
- точный auth механизм
- точный OpenAPI-формат
- форматы enum serialization
- webhooks / event contracts
- пакетные bulk-операции
- attach/file API
- адресная модель клиента и доставки
- налоговые поля и фискальные интеграции
- public API vs internal API split
- async process contracts

---

## 13. Минимальный вывод для реализации

Перед проектированием OpenAPI и backend endpoints должны соблюдаться правила:
- API должно быть доменным, а не монолитным набором случайных методов
- status transitions должны быть command-based
- критические мутации должны поддерживать `Idempotency-Key`
- доход по продаже должен появляться только из денежного факта
- расход товара по продаже должен появляться только из факта исполнения
- возвраты должны идти только через `ReturnRequest`
- KPI должен оставаться производным read-layer
- audit и reconciliation должны иметь собственную API-поверхность чтения



## v8 Architecture Overrides

- `Idempotency-Key` проверяется до доменных сервисов.
- Для `Order`, `Deal`, `Payment`, `ReturnRequest` физические `DELETE` endpoint'ы запрещены.
- API должно поддерживать short-lived soft lock для draft order.
- `POST /orders/{orderId}/confirm` обязан явно обрабатывать `OutOfStockError` и логистический конфликт.
- Один заказ может иметь несколько delivery task.
- Возврат товара должен вести в `quarantine`.
- `GET /kpi/live` должен читать агрегаты, а не запускать тяжёлые runtime JOIN.
