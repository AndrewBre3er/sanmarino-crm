# 26. Current Task for Codex


## Context

Репозиторий находится не в исходной pre-start точке.
Фактическое состояние кода уже ушло дальше baseline-этапов `auth skeleton` и `users/roles/permissions`.

Текущая проблема — документационный drift:
- roadmap и MVP scope требуют синхронизации с revised MVP v1
- current-task framing отстаёт от фактического состояния repo
- security doc должен быть выровнен с accepted auth baseline

## Mandatory reading order

Перед любой работой агент обязан прочитать:
1. `README.md`
2. `AGENTS.md`
3. весь каталог `docs/`
4. в особенности:
   - `08-architecture-fixes-and-critical-blockers.md` — документ наивысшего приоритета для архитектурных конфликтов
   - `01-system-logic.md`
   - `04-state-machines.md`
   - `06-data-integrity-rules.md`
   - `13-database-architecture.md`
   - `14-api-contracts.md`
   - `15-event-model.md`
   - `17-ui-ux-architecture.md`
   - `18-role-based-workspaces.md`
   - `20-security-architecture.md`
   - `21-testing-strategy.md`
   - `23-tech-baseline-and-decision-log.md`
   - `24-mvp-scope-v1.md`
   - `25-development-standards.md`
   - `38-mvp-v1-functional-realignment.md`
   - `37-order-flow-pre-coding-requirements.md` (mandatory before coding extended order-commercial features)

## Current objective

Закрыть `Delta 0 — MVP v1 Realignment Gate`:
- синхронизировать управляющие docs с revised MVP v1 из `docs/38`
- убрать устаревший current-task framing
- закрыть inconsistency по auth baseline в security doc

## What is allowed now

Допустимо:
- синхронизировать roadmap/mvp/current-task/security документы под `docs/38`
- фиксировать обнаруженные документационные конфликты в рамках этого sync-gate
- уточнять implementation framing только после завершения doc-sync relevant packs

## What is not allowed now

Запрещено:
- продолжать coding wave, опираясь на устаревший auth/users-first framing этого файла
- запускать новый implementation slice до завершения doc-sync relevant packs
- придумывать новые доменные решения вне приоритетных docs и `docs/38`
- ослаблять state machine / idempotency / cash basis / ReturnRequest discipline

## Current implementation framing after repo progress

1. Завершить `Delta 0` documentation sync по capability-pack waves.
2. Явно закрыть drift между `docs/16`, `docs/20`, `docs/24`, `docs/26`, `docs/38`.
3. После закрытия gate сформулировать отдельный следующий coding task на базе синхронизированных docs.

Примечание:
- baseline этапы `auth skeleton` и `users/roles/permissions` больше не считаются "первыми ближайшими шагами" для этого репозитория.

## Acceptance criteria for current phase

`Delta 0` считается закрытым, если:
- roadmap и MVP scope синхронизированы с revised MVP v1 из `docs/38`
- security auth baseline согласован с accepted baseline из `docs/23` и `docs/28`
- текущий task framing больше не описывает устаревшую pre-start последовательность
- следующие implementation задачи формулируются только после этого sync-gate


## v8 Architecture Overrides

Обязательный приоритет чтения: `08-architecture-fixes-and-critical-blockers.md`.

Запрещено:
- проектировать `Order -> DeliveryTask` как `1:1`
- оставлять частично успешное подтверждение заказа без rollback/compensation
- переводить return flow сразу в `available`, минуя `quarantine`
- делать физический `DELETE` для `Order`, `Deal`, `Payment`, `ReturnRequest`
- строить `GET /kpi/live` на тяжёлых runtime JOIN
