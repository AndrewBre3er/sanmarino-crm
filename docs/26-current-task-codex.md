# 26. Current Task for Codex


## Context

Репозиторий находится не в исходной pre-start точке.
Фактическое состояние кода уже ушло дальше baseline-этапов `auth skeleton` и `users/roles/permissions`.
Stage 7 `Returns + Reconciliation + Audit hardening` закрыт как backend baseline после final verification.

Текущая задача — открыть следующий major stage без потери границ:
- следующий major stage: Stage 8 `KPI / Reporting / Automation layer`
- Stage 7 deferrable gaps должны идти в целевые этапы, а не переоткрывать backend baseline
- новый coding slice должен начинаться только из отдельного narrow task-файла

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

Зафиксировать переход после Stage 7:
- Stage 7 `Returns + Reconciliation + Audit hardening` закрыт как backend baseline
- deferrable gaps сохранены с target stages
- следующий major stage — Stage 8 `KPI / Reporting / Automation layer`
- первая Stage 8 работа должна быть отдельным narrow task на базе accepted docs и repo state

## What is allowed now

Допустимо:
- синхронизировать status/navigation docs после Stage 7 final verification
- формулировать следующий narrow task для Stage 8
- фиксировать deferrable gaps без изменения доменных правил

## What is not allowed now

Запрещено:
- переоткрывать Stage 7 backend baseline без нового принятого blocker
- запускать Stage 8 implementation slice без отдельного task-файла
- придумывать новые доменные решения вне приоритетных docs и `docs/38`
- ослаблять state machine / idempotency / cash basis / ReturnRequest discipline

## Current implementation framing after repo progress

1. Stage 7 закрыт как backend baseline.
2. Deferrable gaps:
   - live reconciliation worker-to-API transport/scheduler -> Stage 8 automation hardening
   - Telegram/MAX providers and broad notification routing -> MVP integrations / Delta 0 Wave D
   - reconciliation resolution workflow -> Stage 8 reporting/control
   - external payment intake/control realignment -> Delta 0 Wave A before MVP release
   - UI/e2e coverage for returns/reconciliation/corrections -> MVP release hardening
3. Следующий major stage: Stage 8 `KPI / Reporting / Automation layer`.
4. Первый следующий шаг: сформулировать narrow Stage 8 status/task file before coding.

Примечание:
- baseline этапы `auth skeleton` и `users/roles/permissions` больше не считаются "первыми ближайшими шагами" для этого репозитория.

## Acceptance criteria for current phase

Текущая status-sync фаза считается закрытой, если:
- Stage 7 closure status записан в navigation/current-task docs
- deferrable gaps имеют target stages
- Stage 8 обозначен как следующий major stage
- docs не добавляют новых доменных правил


## v8 Architecture Overrides

Обязательный приоритет чтения: `08-architecture-fixes-and-critical-blockers.md`.

Запрещено:
- проектировать `Order -> DeliveryTask` как `1:1`
- оставлять частично успешное подтверждение заказа без rollback/compensation
- переводить return flow сразу в `available`, минуя `quarantine`
- делать физический `DELETE` для `Order`, `Deal`, `Payment`, `ReturnRequest`
- строить `GET /kpi/live` на тяжёлых runtime JOIN
