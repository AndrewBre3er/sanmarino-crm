# 24. MVP Scope v1


## Purpose

Документ фиксирует границы первой версии проекта.

## Принцип MVP

MVP v1 должен покрыть минимально достаточный рабочий цикл заказа с разграничением доступов.

Фокус:
- рабочий core process
- защита денег, остатков и статусов
- отдельные workspace основных ролей
- базовый аудит

## Входит в v1

- users and roles
- authentication baseline
- CRM core: lead, client, contact, deal
- orders core
- inventory reserve and execution facts
- payments core
- finance cash basis reflection
- logistics task baseline
- audit log baseline
- role-based UI workspaces

## Сквозной сценарий v1

`Lead -> Deal -> Order -> Confirmation -> Reserve -> Payment -> Fulfillment -> Delivery/Execution -> Finance reflection -> Audit trace`

Возврат:

`ReturnRequest -> decision -> money and/or goods return -> finance/inventory reflection -> audit trace`

## Роли v1

### Обязательные
- Admin
- Sales
- Warehouse
- Logistics
- Finance
- CEO

### Опциональные
- Driver
- Marketing

Если ресурсов не хватает, Driver и Marketing можно перенести на следующий этап.

## Что должно работать

### Users and access
- login
- roles
- workspace visibility
- basic permission checks

### CRM
- lead CRUD baseline
- conversion lead -> deal
- client/contact linkage

### Orders
- draft order
- confirm order
- cancel order
- line items
- status visibility

### Inventory
- reserve after confirmation
- reserve release
- inventory movement by execution fact

### Payments
- register payment
- payment status visibility
- idempotent critical mutation baseline

### Finance
- cash basis revenue reflection
- finance visibility by role

### Logistics
- create and assign logistics task
- limited delivery execution status

### Returns
- create `ReturnRequest`
- decision and processing baseline
- no direct refund bypass

### Audit
- critical mutations
- auth-critical events
- admin override

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

## Критерии готовности MVP

MVP v1 готов, если:
- роли видят только свои разделы
- Sales проходит lead-to-order path
- Inventory корректно резервирует и фиксирует исполнение
- Finance отражает доход по оплате
- возврат не проходит мимо `ReturnRequest`
- критичные действия попадают в audit log
- ключевые сценарии проходят smoke-check и integration tests


## v8 Architecture Overrides

MVP v1 обязан включать:
- short-lived soft lock / pre-reserve baseline
- `1 Order = 1..* DeliveryTask`
- partial delivery baseline
- quarantine на товарном возврате
