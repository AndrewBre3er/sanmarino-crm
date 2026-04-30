# 18. Role-Based Workspaces and Access-Aware UX

## 1. Назначение документа

Документ фиксирует рабочие пространства по ролям и переводит модель доступов в интерфейсные правила.

Цель:
- определить, что видит каждый отдел
- определить, что может менять каждый отдел
- определить, какие разделы должны скрываться полностью
- зафиксировать поведение UI при недостатке прав

Этот документ дополняет `07-roles-and-access.md` и применяет его к экранной архитектуре.

---

## 2. Канонический набор ролей

Технические role codes:
- `admin`
- `seller`
- `warehouse`
- `logistics`
- `finance`
- `ceo`
- optional: `driver`
- optional: `marketing`

UI labels (русские названия):
- `admin` -> `Админ`
- `seller` -> `Продавец`
- `warehouse` -> `Кладовщик`
- `logistics` -> `Логист`
- `finance` -> `Финансист`
- `ceo` -> `Исполнительный директор`
- `driver` -> `Водитель` (optional)
- `marketing` -> `Маркетинг` (optional)

`marketing` не считается обязательным стартовым workspace.

---

## 3. Общие правила ролевого интерфейса

### 3.1 Не показывать лишнее

Если раздел не нужен роли, он не должен отображаться в сайдбаре.

Исключение для v1:
- список и статус `Supplier Requests` и `Return Requests` доступны всем ролям (read-only visibility)

### 3.2 Не подменять архитектуру запретами

Нельзя строить общий интерфейс, где все видят всё, но почти везде получают "Access denied".

### 3.3 Разделять видимость данных и право действия

Пользователь может:
- не видеть объект
- видеть объект частично
- видеть объект целиком, но без права редактирования
- видеть объект и выполнять разрешённые действия

### 3.4 Ограничивать междоменный просмотр

Даже если объект связан с другим доменом, роль получает только релевантный для неё срез.

Пример:
- `seller` видит статус оплаты заказа, но не полный финансовый журнал компании
- `logistics` видит состав доставки и адрес, но не видит финансовые статьи
- `warehouse` видит резерв и фактический расход, но не видит маркетинговый источник лида
- `seller` / `warehouse` / `logistics` не видят `base purchase price` в product-supplier matrix

---

## 4. Матрица рабочих пространств

### 4.1 Продавец Workspace (`seller`)

#### Основная задача
Вести лид, переводить его в коммерческий `Deal`, сопровождать клиента до обеспечения товара и отслеживать auto-created `Order`.

#### Видит разделы
- Home
- Leads
- Deals
- Orders
- Clients
- Supplier Requests (mandatory MVP screen)
- Return Requests (status visibility)
- Follow-up Queue
- My KPI

#### Не видит разделы
- Finance Reports
- Expenses
- Reconciliation
- Full Audit
- Inventory Costing
- Management Dashboard

#### Видит в карточке order
- клиент
- состав заказа
- статус резерва в агрегированном виде
- статус оплаты
- статус доставки
- возвраты по своему заказу
- timeline по своему заказу
- deal supply summary: partial coverage, deficits, ETA, linked supplier request context

#### Не видит в карточке order
- средневзвешенную себестоимость
- скрытую маржу компании
- закрытые финансовые статьи
- системную сверку по кассе
- `base purchase price` из product-supplier matrix

#### Может делать
- создавать lead
- обновлять lead
- переводить lead в deal
- оформлять supplier request
- запускать коммерческий сценарий обеспечения товара
- оставлять комментарии и follow-up
- ставить next contact date и reminders
- фиксировать lost reason и communication history
- инициировать dedup/merge workflow для client card
- инициировать запрос на возврат

#### Не может делать
- проводить оплату вручную вне своих правил
- делать расход товара
- менять складские движения
- закрывать финансовые периоды
- менять логистические факты задним числом

---

### 4.2 Финансист Workspace (`finance`)

#### Основная задача
Фиксировать поступления, возвраты, расходы и проводить сверку.

#### Видит разделы
- Home
- Payments
- Supplier Requests (status visibility)
- Return Requests (status visibility)
- Refunds
- Expenses
- Reconciliation
- Finance Reports

#### Не видит разделы
- `seller` pipeline as primary workspace
- `warehouse` operational screens
- `driver` screens

#### Видит
- payment ledger
- refund ledger
- расходы
- cash basis доход
- supplier payables
- деньги у водителей
- сверку по доменам
- проблемные финансовые операции
- external payment intake/control queue (pending/completed/rejected)
- mismatch reports
- manual correction workflow queue

#### Видит ограниченно
- карточку order только в части финансового контекста
- deal только в части привязки оплаты

#### Может делать
- регистрировать внешний payment fact intake/linkage в рамках доступных каналов
- подтверждать или отклонять external payment fact (`completed` / `rejected`)
- подтверждать или отклонять проведение
- оформлять возврат денег в рамках процесса
- вести расходы
- прикреплять файл к supplier request
- переводить supplier request в `paid` (UI: `Оплачено`) после фактической оплаты
- создавать/отправлять на согласование manual corrections
- применять approved manual corrections
- запускать и закрывать сверку

#### Не может делать
- менять состав заказа
- менять складские движения
- закрывать доставку как выполненную
- изменять маркетинговую атрибуцию вне согласованной логики

---

### 4.3 Логист Workspace (`logistics`)

#### Основная задача
Планировать доставку и фиксировать исполнение логистики.

#### Видит разделы
- Home
- Delivery Calendar
- Tasks
- Supplier Requests (status visibility)
- Return Requests (status visibility)
- Drivers
- Route Days
- Incidents

#### Не видит разделы
- Finance Reports
- Marketing Analytics
- Inventory Costing
- Full `seller` CRM

#### Видит
- delivery tasks
- слоты
- route day
- адреса
- контакты доставки
- статус заказа в части готовности к отгрузке
- заказы `OnControl` / `Problem`
- причины срывов
- контекст денег от водителя (без доступа к полному финансовому журналу)

#### Не видит
- закрытые финансовые данные
- маркетинговый источник
- управленческую маржу
- `base purchase price`

#### Может делать
- назначать задачу на слот
- менять водителя
- переносить доставку в рамках правил
- фиксировать исход доставки
- фиксировать partial delivery исход по своим delivery task
- регистрировать проблему доставки
- быть ответственным за проблемный заказ при просроченных деньгах от водителя

#### Не может делать
- подтверждать оплату
- менять order items
- делать складской расход напрямую
- оформлять финансовый возврат

---

### 4.4 Кладовщик Workspace (`warehouse`)

#### Основная задача
Управлять остатками, резервами и фактическими движениями товара.

#### Видит разделы
- Home
- Stock
- Reservations
- Supplier Requests (mandatory MVP screen)
- Return Requests (status visibility)
- Movements
- Receipts
- Product Matrix
- ABC Report
- Returns
- Write-offs

#### Не видит разделы
- Marketing
- Full Finance
- Executive Dashboard

#### Видит
- SKU
- остатки
- резервы
- приходы
- расходы
- возвраты на склад
- списания
- low-stock alerts
- stale reservation alerts
- receipt discrepancy cases

#### Видит ограниченно
- order только в части товарного состава и статуса готовности к сборке/отгрузке

#### Не видит
- маркетинговые данные
- полную финансовую отчётность
- управленческие KPI вне склада
- `base purchase price`

#### Может делать
- создавать и подтверждать складские движения в рамках процесса
- работать с резервами
- прикреплять файл к supplier request
- переводить supplier request в `stocked` (UI: `Оприходовано`) после фактического прихода товара
- фиксировать возврат на склад
- делать списание в рамках прав
- фиксировать и эскалировать расхождения при приёмке

#### Не может делать
- подтверждать лиды и сделки
- проводить оплату
- закрывать доставку как выполненную клиентом
- менять маркетинговые расходы

---

### 4.5 Исполнительный директор Workspace (`ceo`)

#### Основная задача
Контролировать сквозную картину бизнеса и узкие места.

#### Видит разделы
- Home
- Executive Dashboard
- Supplier Requests (status visibility)
- Return Requests (status visibility)
- Sales
- Orders
- Inventory
- Payments
- Logistics
- Finance
- KPI
- Audit
- Admin Reports

#### Видит
- агрегированные показатели по всем доменам
- критические карточки и drill-down
- междоменные расхождения
- деньги у водителей
- supplier payables
- override-действия
- качество данных
- manual correction approval queue
- integration health (ATS/Avito inbound, Telegram/MAX outbound)

#### Может делать
- просматривать полную картину
- утверждать ограниченный набор критических действий
- прикреплять файл к supplier request
- переводить supplier request в `paid` (UI: `Оплачено`) после фактической оплаты
- подтверждать/отклонять manual corrections в рамках approval workflow
- инициировать проверки и разбор инцидентов

#### Не должен делать как основной сценарий
- ежедневные операционные действия за отделы

UI для CEO должен быть обзорным и decision-oriented, а не операционным.

---

### 4.6 Водитель Workspace (`driver`)

#### Основная задача
Исполнить назначенные задачи доставки и зафиксировать результат.

#### Видит разделы
- Today
- My Route
- Delivery Tasks
- Supplier Requests (status visibility)
- Return Requests (status visibility)
- Issues
- Completed

#### Не видит разделы
- CRM
- Finance
- Inventory admin
- Marketing
- Full KPI
- Audit

#### Видит
- свои задачи
- адрес
- контакт клиента
- комментарии к доставке
- состав доставки на уровне, достаточном для исполнения
- статус задачи

#### Не видит
- цену заказа
- финансовую отчётность
- лишние данные клиента
- внутренние управленческие комментарии

#### Может делать
- подтверждать принятие задачи
- фиксировать прибытие
- отмечать доставлено / не доставлено
- оставлять причину и комментарий
- прикладывать подтверждающий факт, если это будет добавлено позже

#### Не может делать
- менять заказ
- менять оплату
- менять складские документы
- видеть чужие задачи

---

### 4.7 Админ Workspace (`admin`)

#### Основная задача
Управление пользователями, ролями, настройками и техническими политиками.

#### Видит разделы
- Users
- Roles
- Permissions
- Supplier Requests (status visibility)
- Return Requests (status visibility)
- Settings
- Audit
- System Health

#### Может делать
- назначать роли
- управлять матрицей прав
- включать системные политики
- просматривать технический аудит

#### Ограничение
`admin` не должен автоматически получать право на все бизнес-операции. Техническое администрирование и бизнес-override должны разделяться.

---

## 5. Правила UI-ограничений

### 5.1 Страница скрывается целиком
Если роль не работает с доменом, раздел не отображается.

### 5.2 Виджет скрывается целиком
Если показатель может раскрывать чувствительные данные, виджет отсутствует.

### 5.3 Поле скрывается или редактируется условно
Пример:
- `seller` видит сумму заказа, но не видит скрытую себестоимость
- `warehouse` видит SKU и количество, но не видит маркетинговую атрибуцию

### 5.4 Кнопка действия зависит от роли и статуса
Даже при видимости карточки кнопка действия показывается только если:
- роль имеет право
- состояние объекта позволяет операцию
- предусловия выполнены

### 5.5 Экспорт подчиняется отдельному праву
Право видеть экран не означает право экспортировать данные.

### 5.6 Supplier request / return request access baseline
- список и статус `Supplier Requests` и `Return Requests` видят все роли
- attach file в `Supplier Requests` доступен только `warehouse`, `finance`, `ceo`
- attach file в `Supplier Requests` видят только `warehouse`, `finance`, `ceo`
- статус `paid` в `Supplier Requests` меняют только `finance`, `ceo`
- статус `stocked` в `Supplier Requests` меняет только `warehouse`
- `Return Requests` используют статусы `created`, `confirmed`, `processed`, `closed` (UI: `Оформлена`, `Подтверждена`, `Обработана`, `Закрыта`)
- если прошло более `14` дней после реализации, `ReturnRequest.confirmed` требует согласования `ceo`
- канонический anchor реализации: `realizationAnchorAt = MIN(orders.fulfillments.fulfilled_at)` по возвращаемым позициям через linkage к `orders.fulfillment_items`
- `orders.orders.shipped_at` / `orders.orders.partially_shipped_at` не являются каноническим anchor для этого правила

### 5.7 External payment intake/control baseline
- UI не должен предоставлять CRM-side payment creation/checkout/payment-link действия
- `finance`/`ceo` работают с confirm/reject входящего external payment fact
- `rejected` фиксируется как terminal статус факта и не создаёт cash/revenue side effects

### 5.8 Manual correction and audit baseline
- corrections проходят только workflow `draft -> pending_approval -> approved/rejected -> applied`
- UI не должен позволять apply до approval
- approval/apply/reject actions обязаны оставлять audit trail

### 5.9 Workspace productivity baseline
- каждый workspace обязан иметь role home dashboard, saved filters и role notifications
- список уведомлений формируется по permission-safe routing
- KPI widgets остаются derived/read-only и не могут менять доменные факты

---

## 6. Карточка объекта с ролевыми секциями

Каждая карточка должна иметь секции трёх типов:

1. **Common** — обязательны для всех ролей, которые видят объект
2. **Role-specific** — показываются только определённым ролям
3. **Sensitive** — скрыты либо доступны в read-only только отдельным ролям

Пример для order:
- Common: клиент, items, статус, timeline
- seller-specific: follow-up, коммерческие комментарии
- logistics-specific: доставка, окно времени, маршрут
- warehouse-specific: резерв, сборка, движения
- finance-specific: оплаты, возвраты, cash status
- Sensitive: себестоимость, маржа, override history

---

## 7. Правила доступа к отчётам

Отчёты делятся на 4 класса:
- operational
- analytical
- financial
- executive

По умолчанию:
- `seller` получает operational + personal analytical
- `marketing` получает marketing analytical (optional)
- `finance` получает financial + reconciliation
- `logistics` получает operational logistics + KPI logistics
- `warehouse` получает stock operational + warehouse KPI
- `ceo` получает все executive reports и drill-down

---

## 8. Итоговое правило

Доступы в проекте должны проектироваться не как техническая ACL-матрица отдельно от UI, а как **часть экранной архитектуры**.

Правильная логика:

`роль -> рабочее пространство -> доступные разделы -> видимые данные -> допустимые действия`
