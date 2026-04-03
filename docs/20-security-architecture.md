# 20. Security Architecture


## Purpose

Документ фиксирует обязательный baseline безопасности проекта до начала реализации.

## Ключевые правила

- Все проверки доступа выполняются на backend.
- UI скрывает лишнее, но не является источником безопасности.
- Доступы строятся по принципу least privilege.
- Если доступ не описан явно, он запрещён.
- Критичные действия обязаны попадать в audit log.
- Секреты не хранятся в репозитории.
- Production и local окружения строго разделены.

## Что защищаем

- пользователи, роли и права
- лиды, сделки, клиенты, контакты
- заказы и статусы
- остатки, резервы, списания
- оплаты, возвраты, финансы
- логистические задачи и адресные данные
- audit log
- env secrets, ключи, backup
- VPS и deploy-процесс

## Минимальная модель угроз

- доступ к чужим данным через подмену ID
- получение скрытых полей через API
- обход role restrictions прямым вызовом endpoint
- недопустимые status transition
- повторная обработка критичной операции
- двойная оплата, возврат или списание
- утечка `.env` или ключей
- неаудируемые административные изменения
- brute force login
- небезопасный deploy на VPS

## Authentication

- Только персональные аккаунты.
- Общие логины отделов запрещены.
- Пароли хранятся только в виде hash.
- Для CEO, admin, finance и production-access ролей требуется MFA.
- Нужны rate limit и временная блокировка при brute force.
- При смене пароля должна быть возможность отзыва активных сессий.

Конкретная auth-модель: `TBD`.

## Authorization

Проверки доступа должны существовать на уровнях:
1. route / handler
2. service / use case
3. object-level access
4. field-level visibility
5. critical mutation guard

Доступ описывается через:
- role
- workspace
- entity
- action
- status constraint
- field visibility
- ownership / assignment

## Видимость данных по ролям

- Sales не должен видеть лишние finance-only поля.
- Warehouse не должен менять финансовые документы.
- Logistics и Driver видят только нужные для доставки данные.
- Finance не должен менять складские факты исполнения.
- CEO видит сквозную картину, но его действия тоже логируются.
- Если поле роли не нужно, оно не должно приходить из API.

## Критичные мутации

Для следующих операций обязательны permission check, audit log, business validation и, где нужно, idempotency:
- регистрация оплаты
- возврат денег
- release reserve
- закрытие fulfillment
- изменение цены после подтверждения
- отмена подтверждённого заказа
- изменение ролей и прав
- admin override статуса

## Защита state machine

Backend обязан:
- валидировать допустимость перехода
- валидировать право на переход
- логировать переход
- логировать admin override отдельно
- отклонять переходы вне state machine

## Связь безопасности и бизнес-инвариантов

Сервер обязан запрещать:
- резерв на стадии draft
- списание по факту одного только подтверждения заказа
- признание дохода не по cash basis
- возврат без `ReturnRequest`
- повторную обработку критичных запросов без идемпотентности

## Audit log

Обязательно логировать:
- вход и выход пользователя
- неуспешные попытки входа
- изменение ролей и прав
- критичные статусы заказа
- оплаты и возвраты
- создание и release резервов
- списания и возвраты товара
- admin override

Минимальные поля события:
- eventId
- occurredAt
- actorUserId
- actorRole
- entityType
- entityId
- action
- before
- after
- reason
- requestId / correlationId

## Secrets

- `.env.example` содержит только placeholders.
- Реальные `.env` не коммитятся.
- Production secrets хранятся вне git.
- Нужна процедура ротации DB credentials, app secrets и VPS access credentials.

## VPS baseline

Минимально нужно:
- отдельный deploy user
- SSH по ключам
- ограничение повседневной работы под root
- firewall
- HTTPS
- reverse proxy
- backup
- мониторинг доступности
- логи приложения и системы

Конкретные инструменты: `TBD`.

## Обязательные security tests

Нужны тесты на:
- role-based access
- object-level access
- field visibility
- запрет недопустимых status transition
- идемпотентность критичных мутаций
- запрет возврата без `ReturnRequest`
- запрет списания до факта исполнения

## Что ещё нужно утвердить

- auth model
- MFA implementation
- session model
- secret management mechanism
- monitoring stack
- backup toolchain


## v8 Architecture Overrides

- `Idempotency-Key` должен проверяться до входа в доменный сервис.
- Физический `DELETE` для `Order`, `Deal`, `Payment`, `ReturnRequest` запрещён.
- Операции выхода товара из `quarantine` требуют отдельного permission gate и audit trail.
- Частично успешное подтверждение заказа без rollback/compensation запрещено.
