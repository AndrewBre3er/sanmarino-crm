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
- CRM productivity baseline: follow-up, next contact date, reminders, lost reasons, communication history, stuck deals
- client master card baseline: address, contact, linked deals/orders, dedup + merge, explicit installer/designer referral context
- supplier coverage baseline: `Supplier`, `SupplierRequest`
- product-supplier sourcing baseline: `Product -> multiple suppliers` with priority and base purchase price
- orders core с автосозданием `Order` из `Deal`
- inventory soft lock/reservation/execution/quarantine baseline
- external payment intake/control baseline (без CRM-side создания оплаты)
- finance cash-basis reflection
- finance control baseline: supplier payables, mismatch reports, manual corrections with approval workflow
- logistics `DeliveryTask` baseline (`1 Order = 1..N DeliveryTask`)
- return flow через `ReturnRequest`
- KPI plan/fact baseline: manager-set plans + factual metrics
- workspace productivity baseline: role home dashboards, saved filters, role notifications
- integration baseline: ATS + Avito inbound events, Telegram + MAX outbound notifications
- audit + reconciliation baseline
- role-based UI workspaces

## Сквозной сценарий v1

`Lead -> Deal -> Reserve/SupplierRequest -> Auto Order(Assembling) -> ReadyForShipment/ReadyForPartialShipment -> Shipment -> External payment fact intake/control -> Finance reflection -> Audit/Reconciliation`

Оплата остаётся параллельным процессом:
- может произойти до, во время или после исполнения
- для отгруженных, но не подтверждённых по деньгам заказов используется `OnControl/Problem`
- CRM не создаёт сам платежный факт, а принимает и контролирует внешний подтверждённый payment fact

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
- field-level visibility rule: purchase price скрыта для `seller`, `warehouse`, `logistics`

### CRM
- lead intake (`АТС` / сайт / `Avito`)
- `Lead -> InProcessing` или `Lead -> Cancelled` с причиной
- auto-create `Deal` из lead в обработке
- client/contact linkage
- `ClientParticipant` (`монтажник` / `дизайнер`) linkage
- productivity baseline:
  - follow-up
  - next contact date
  - reminders
  - lost reasons
  - communication history
  - stuck deals
- client card baseline:
  - address
  - linked deals/orders
  - dedup + merge
  - explicit installer/designer referral context

### Orders + Deal Supply UX
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
- deal supply UX:
  - partial coverage
  - deficits
  - ETA
  - linked supplier request context

### Supply + Inventory
- short-lived soft lock / pre-reserve with TTL
- durable reservation only for `Order`
- product -> multiple suppliers
- supplier priority
- base purchase price
- supplier request status flow (`formed -> confirmed_by_supplier -> paid -> stocked`)
- supplier request создаёт менеджер (`seller`)
- список и статус supplier request видят все роли
- attach file к supplier request разрешён только `warehouse`, `finance`, `ceo`
- файл supplier request видят только `warehouse`, `finance`, `ceo`
- статус `paid` выставляют только `finance` или `ceo` после фактической оплаты
- статус `stocked` выставляет только `warehouse` после фактического прихода товара
- mandatory MVP screens: `Supplier Requests List` + `Supplier Request Card`
- purchase receipt + discrepancy handling
- inventory movement by execution fact
- quarantine flow for returns
- warehouse operational alerts:
  - low-stock alert
  - stale reservation alert
  - discrepancy on receipt

### Payments (External Fact Intake / Control)
- intake and linkage of external payment fact
- confirm/control flow for external payment fact
- payment status visibility
- idempotent critical mutation baseline
- explicitly out of scope in MVP v1:
  - CRM-side payment creation
  - checkout/acquiring initiation from CRM

### Finance
- cash-basis revenue reflection from confirmed external payment facts
- confirmed expenses reflection baseline
- finance visibility by role
- supplier payables
- mismatch reports
- manual corrections with approval workflow

### Logistics
- create and assign delivery task
- slots and route day baseline
- partial delivery baseline
- delivery execution status baseline
- aggregate order delivery status from tasks
- driver-money control baseline

### Returns
- create `ReturnRequest`
- status flow (`created -> confirmed -> processed -> closed`)
- список и статус return request видят все роли
- если прошло более `14` дней от канонического realization anchor, подтверждение требует согласования `ceo`
- канонический realization anchor: `MIN(orders.fulfillments.fulfilled_at)` по возвращаемым позициям (через linkage к `orders.fulfillment_items`)
- неканонично для этого правила: `orders.orders.shipped_at` и `orders.orders.partially_shipped_at`
- decision and processing baseline
- no direct refund bypass

### KPI + Reporting
- live/snapshot KPI from aggregated facts
- department plan/fact
- manager sets plans manually
- KPI remains a derived layer and is not a source of truth

### Workspace UX
- role-specific home dashboards
- saved filters / saved views
- role notifications

### Integrations
- ATS + Avito inbound events
- Telegram + MAX outbound notifications

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
- CRM-side payment creation / checkout-acquiring orchestration
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
- CRM productivity baseline работает (`follow-up`, reminders, lost reasons, communication history, stuck deals)
- client card поддерживает address + dedup/merge + referral context
- `Inventory` корректно ведёт soft lock/reservation/issue/quarantine
- product-supplier matrix поддерживает multiple suppliers + priority + base purchase price
- purchase price скрыта от `seller` / `warehouse` / `logistics`
- deal supply UX показывает partial coverage / deficits / ETA / linked supplier request
- warehouse alert baseline работает для low-stock / stale reservation / discrepancy
- payment flow использует intake/control внешнего payment fact и не создает платеж в CRM
- `finance` отражает доход по подтверждённой внешней оплате
- finance manual corrections проходят approval workflow
- `ReturnRequest` обязателен для возвратов
- supplier request и return request соблюдают role-limited action matrix
- возврат старше `14` дней не подтверждается без `ceo`
- 14-day rule для возврата рассчитывается по fulfillment-anchor, а не по order-level shipment timestamps
- `logistics` ведёт delivery task и агрегированный delivery status
- `logistics` и `finance` поддерживают driver-money control baseline
- отгруженные, но не подтверждённые по деньгам заказы попадают в `OnControl/Problem`
- KPI plan/fact работает с manager-set plan и factual metrics
- role dashboards / saved filters / role notifications работают для основных ролей
- ATS + Avito inbound и Telegram + MAX outbound integration baseline работает в рамках серверных правил
- критичные действия попадают в audit log
- ключевые сценарии проходят smoke-check и integration tests

## v8 Architecture Overrides

MVP v1 обязан включать:
- short-lived soft lock / pre-reserve baseline
- `1 Order = 1..* DeliveryTask`
- partial delivery baseline
- quarantine на товарном возврате
- money-control overlays (`OnControl` / `Problem`) после отгрузки
