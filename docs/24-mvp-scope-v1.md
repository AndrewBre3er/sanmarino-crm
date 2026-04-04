# 24. MVP Scope v1

## Purpose

Документ фиксирует границы первой версии проекта.

## Принцип MVP

MVP v1 покрывает минимально достаточный рабочий цикл заказа с разграничением доступов и контролем денег/остатков/статусов.

Фокус:
- рабочий core process
- защита денег, остатков и статусов
- role-aware workspace основных ролей
- базовый audit + reconciliation

## Входит в v1

- users and roles
- technical authentication baseline (без полного policy-engine)
- CRM core: `Lead`, `Client`, `Contact`, `ClientParticipant`, `Deal`
- supplier coverage baseline: `Supplier`, `SupplierRequest`
- orders core с автосозданием `Order` из `Deal`
- inventory soft lock/reservation/execution/quarantine baseline
- payments core
- finance cash-basis reflection
- logistics `DeliveryTask` baseline (`1 Order = 1..N DeliveryTask`)
- return flow через `ReturnRequest`
- audit + reconciliation baseline
- role-based UI workspaces

## Сквозной сценарий v1

`Lead -> Deal -> Reserve/SupplierRequest -> Auto Order(Assembling) -> ReadyForShipment/ReadyForPartialShipment -> Shipment -> Payment confirmation -> Finance reflection -> Audit/Reconciliation`

Оплата остаётся параллельным процессом:
- может произойти до, во время или после исполнения
- для отгруженных, но не подтверждённых по деньгам заказов используется `OnControl/Problem`

Возврат:

`ReturnRequest -> decision -> money and/or goods return -> finance/inventory reflection -> audit trace`

## Роли v1

### Обязательные
- Админ (`admin`)
- Продавец (`seller`)
- Кладовщик (`warehouse`)
- Логист (`logistics`)
- Финансист (`finance`)
- Исполнительный директор (`ceo`)

### Опциональные
- Водитель (`driver`)
- Маркетинг (`marketing`)

Если ресурсов не хватает, `driver` и `marketing` переносятся на следующий этап.

## Что должно работать

### Users and access
- login baseline
- roles
- workspace visibility
- basic permission checks

### CRM
- lead intake (`АТС` / сайт / `Avito`)
- `Lead -> InProcessing` или `Lead -> Cancelled` с причиной
- auto-create `Deal` из lead в обработке
- client/contact linkage
- `ClientParticipant` (`монтажник` / `дизайнер`) linkage

### Orders
- auto-create `Order` from `Deal` by coverage rules
- line items
- status visibility:
  - `Assembling`
  - `ReadyForPartialShipment`
  - `ReadyForShipment`
  - `PartiallyShipped`
  - `Shipped`
- control overlays:
  - `OnControl`
  - `Problem`

### Supply + Inventory
- short-lived soft lock / pre-reserve with TTL
- durable reservation only for `Order`
- supplier request status flow
- mandatory MVP screens: `Supplier Requests List` + `Supplier Request Card`
- purchase receipt + discrepancy handling
- inventory movement by execution fact
- quarantine flow for returns

### Payments
- register/confirm payment
- payment status visibility
- idempotent critical mutation baseline

### Finance
- cash-basis revenue reflection
- confirmed expenses reflection baseline
- finance visibility by role

### Logistics
- create and assign delivery task
- delivery execution status baseline
- aggregate order delivery status from tasks

### Returns
- create `ReturnRequest`
- decision and processing baseline
- no direct refund bypass

### Audit + Reconciliation
- critical mutations in audit log
- admin override trace
- daily reconciliation baseline

## Вне scope v1

По умолчанию не входят:
- advanced BI
- complex marketing attribution
- full purchasing automation
- supplier portal
- route optimization
- mobile app
- public client portal
- advanced forecasting
- non-critical dashboards
- inventory optimization engine
- finance ledger/postings engine
- advanced analytics facts layer

## Критерии готовности MVP

MVP v1 готов, если:
- роли видят только свои разделы
- `Продавец` проходит `Lead -> Deal -> Order` path
- `Inventory` корректно ведёт soft lock/reservation/issue/quarantine
- `finance` отражает доход по подтверждённой оплате
- `ReturnRequest` обязателен для возвратов
- `logistics` ведёт delivery task и агрегированный delivery status
- отгруженные, но не подтверждённые по деньгам заказы попадают в `OnControl/Problem`
- критичные действия попадают в audit log
- ключевые сценарии проходят smoke-check и integration tests

## v8 Architecture Overrides

MVP v1 обязан включать:
- short-lived soft lock / pre-reserve baseline
- `1 Order = 1..* DeliveryTask`
- partial delivery baseline
- quarantine на товарном возврате
- money-control overlays (`OnControl` / `Problem`) после отгрузки
