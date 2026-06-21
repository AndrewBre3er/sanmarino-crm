# 22. QA Release Checklist


## Purpose

Документ фиксирует обязательный чеклист перед выпуском изменений в production.

## Перед релизом должно быть известно

- что изменилось
- какие домены затронуты
- есть ли миграции
- есть ли env changes
- кто отвечает за релиз
- какой rollback plan

## Mandatory technical gate

Обязательно:
- build проходит
- lint проходит
- typecheck проходит
- unit tests проходят
- integration tests проходят
- e2e smoke tests проходят
- permission tests проходят
- migration validation проходит

Если любой из пунктов не выполнен, релиз блокируется.

## Security gate

Проверить:
- новые действия покрыты permission checks
- лишние поля не утекли в API
- критичные действия пишутся в audit
- секреты не попали в репозиторий
- `.env.example` не содержит реальных значений

## Data and migration gate

Если есть миграции:
- они воспроизводимы
- проверены на тестовой базе
- есть rollback или безопасная стратегия исправления
- не ломают state machine и core сущности

## Business logic gate

Нужно отдельно перепроверить:
- `Lead -> Deal -> Order(s) -> Fulfillment(s)`
- cash basis logic
- reserve only after confirmation
- write-off only by execution fact
- refund only via `ReturnRequest`
- state machine restrictions
- idempotency critical mutations
- external payment intake/control (confirm/reject) без CRM-side payment creation
- `payment.rejected` не создаёт `cash operation` и `finance income`
- manual correction approval/apply workflow соблюдён
- KPI остаётся derived и не используется как source of truth
- `base purchase price` не доступен `seller`/`warehouse`/`logistics`

## Manual smoke-check

### Auth
- login
- logout
- denied access для запрещённой роли

### Sales
- открытие workspace
- просмотр core сущностей
- базовый сценарий заказа

### Payment / finance
- регистрация внешнего payment fact
- confirm/reject external payment fact
- отклонённый payment fact не создаёт cash/revenue side effects
- корректное отражение дохода по cash basis
- manual correction: submit -> approve/reject -> apply
- supplier payables и mismatch reports доступны finance/ceo контуру

### Inventory / fulfillment
- резерв появляется только после подтверждения
- исполнение создаёт складской факт
- нет списания по одному только order confirmation

### Return
- возврат идёт только через `ReturnRequest`
- нет обходного сценария возврата денег/товара вне `ReturnRequest`

### Audit
- критичное действие попадает в журнал

### Permissions
- роль не видит чужой раздел и запрещённые действия
- `base purchase price` не отображается ролям `seller`/`warehouse`/`logistics`
- notification routing не отправляет закрытые данные в нерелевантные роли/каналы

### KPI / reporting
- manager-entered department plans отображаются отдельно от factual KPI
- factual KPI берётся из доменных источников, а не из ручного KPI ввода
- live KPI refresh writes target only `analytics.live_kpi_metrics`
- live KPI refresh writes use durable idempotency scope `kpi.live_metric_refresh`
- live KPI refresh writes enqueue `kpi.live_aggregate_refreshed` through outbox atomically with the live KPI upsert
- live KPI refresh does not calculate formulas, infer source-domain event-to-metric mapping, write snapshots, mutate department plans, or mutate source-domain facts

## UI / UX gate

Проверить:
- navigation shell не сломан
- workspace видны только нужным ролям
- скрытые поля реально скрыты
- ошибки видны явно, без silent failure
- role home поддерживает saved filters и role notifications
- CRM productivity surface присутствует (follow-up, next contact, reminders, lost reason, communication history, stuck deals)
- Integration Inbound Inbox surface присутствует для `ATS`/`Avito`
- Notification Dispatch Log surface присутствует для `Telegram`/`MAX` со статусами `queued`/`sent`/`failed`
- deal supply summary показывает partial coverage/deficits/ETA/linked supplier request context

## Environment gate

Проверить:
- нужные env variables заданы
- новые secrets созданы вне git
- reverse proxy config не конфликтует
- background jobs config не потеряна

## Backup and rollback gate

Обязательно:
- backup создан
- известно, где он хранится
- понятна restore-процедура
- rollback plan зафиксирован

## Post-deploy verification

Сразу после выкладки проверить:
- приложение доступно
- login работает
- ключевой workspace открывается
- ключевой API отвечает
- нет всплеска 5xx
- нет явного роста 401 / 403
- логи не содержат массовых новых ошибок


## v8 Architecture Overrides

Перед релизом отдельно проверить:
- soft lock не превращается в durable reservation без confirm
- confirm не оставляет зависший reservation при падении логистики
- `Order.deliveryStatus` корректно агрегируется
- физический `DELETE` недоступен для `Order`, `Deal`, `Payment`, `ReturnRequest`
- live KPI endpoint'ы читают агрегаты
- live KPI refresh write contract is covered by schema/idempotency/outbox tests before enabling the worker adapter
- не появился CRM-side payment creation flow
- не появился bypass возврата вне `ReturnRequest`
- не произошла утечка `base purchase price` в UI/API для запрещённых ролей
- KPI слой не используется как источник истины для доменных мутаций

## Release candidate command gate

Для release candidate обязательно выполнить:
- `pnpm --filter @sanmarino/api prisma:validate`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm test:e2e`
