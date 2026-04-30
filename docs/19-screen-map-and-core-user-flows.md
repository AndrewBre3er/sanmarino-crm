# 19. Screen Map and Core User Flows

## 1. Назначение документа

Документ фиксирует каноническую карту экранов и ключевые пользовательские сценарии.

Цель:
- определить минимальный и расширенный состав экранов
- связать экраны с доменами и ролями
- зафиксировать основные UX-переходы между объектами

---

## 2. Глобальная карта экранов

Канонические role codes:
- `admin`, `seller`, `warehouse`, `logistics`, `finance`, `ceo`
- optional: `driver`, `marketing`

UI labels для ролей отображаются на русском языке.

### 2.1 App Shell
- Login
- Role Home
- Global Search Results
- Notifications Center
- User Menu / Profile

### 2.2 CRM
- Leads List
- Lead Card
- Deals List
- Deal Card
- Clients List
- Client Card
- Follow-up Queue
- Client Merge Cases List
- Client Merge Case Card
- Communication History Timeline (в Deal/Client карточках)

### 2.3 Orders
- Orders List
- Order Card
- Supplier Requests List (mandatory MVP)
- Supplier Request Card (mandatory MVP)
- Return Request List
- Return Request Card

Правило v1:
- список и статус `Supplier Requests` и `Return Requests` видят все роли
- действия по `Supplier Requests` остаются role-limited (`seller` create, `finance`/`ceo` mark paid, `warehouse` mark stocked)
- прикреплённый файл supplier request видят только `warehouse`, `finance`, `ceo`
- подтверждение `ReturnRequest` старше `14` дней после реализации требует согласования `ceo`

### 2.4 Inventory
- Stock List
- SKU Card
- Reservation List
- Product Matrix
- Movement Journal
- Receipt List
- ABC Report
- Write-off List
- Stock Return List

### 2.5 Payments
- Payments List
- Payment Card
- External Payment Intake Queue
- Refunds List
- Refund Card
- Reconciliation Center

### 2.6 Logistics
- Delivery Calendar
- Delivery Task List
- Delivery Task Card
- Driver List
- Driver Card
- Route Day View
- Incidents List

### 2.7 Finance
- Expenses List
- Expense Card
- Supplier Payables
- Mismatch Reports
- Manual Corrections List
- Manual Correction Card
- Manual Correction Approval Queue
- Cash Summary
- Finance Reports

### 2.8 KPI
- Sales KPI
- Logistics KPI
- Warehouse KPI
- Executive KPI
- Department Plans
- KPI Plan/Fact View

### 2.9 Audit / Admin
- Audit Log
- Users List
- User Card
- Roles & Permissions
- System Settings

### 2.10 Driver Mobile Workspace
- Driver Today
- Driver Task Card
- Driver Route
- Driver Issue Report
- Driver Completed Tasks

### 2.11 Integrations / Notifications
- Integration Inbound Inbox (`ATS`, `Avito`)
- Notification Dispatch Log (`Telegram`, `MAX`)
- Notification Center (role-routed)

---

## 3. Обязательные экраны MVP

MVP должен включать минимум:
- Login
- Продавец Home (`seller`)
- Leads List / Card
- Deals List / Card
- Follow-up Queue
- Orders List / Card
- Supplier Requests List / Card
- Client Card с linked deals/orders и dedup/merge surface
- Payments List / Card
- External Payment Intake Queue (confirm/reject external fact)
- Delivery Calendar / Task Card
- Stock List / Movements
- Supplier Payables / Mismatch Reports / Manual Corrections (finance)
- Кладовщик Home (`warehouse`)
- Финансист Home (`finance`)
- Логист Home (`logistics`)
- Исполнительный директор Home (`ceo`)
- Водитель Today / Task Card (`driver`, optional)

Без этих экранов система не покрывает полный цикл от лида до исполнения.

---

## 4. Сквозной пользовательский сценарий

### 4.1 Продавец flow (`seller`)
1. Пользователь открывает Продавец Home
2. Переходит в новый lead
3. Переводит lead в `Deal`
4. Заполняет коммерческий состав, цену и способ исполнения, фиксирует client address и referral context
5. Ведёт follow-up/next contact/reminders и communication history
6. Проверяет coverage summary (partial/deficits/ETA) и инициирует reserve / supplier request
7. При дублях инициирует client dedup/merge workflow
8. Система auto-creates `Order` при выполнении условий
9. Пользователь отслеживает оплату и исполнение в карточке order

### 4.2 Финансист flow (`finance`)
1. Пользователь открывает Финансист Home
2. Переходит в external payment intake queue
3. Находит внешний payment факт и выполняет confirm/reject
4. При `rejected` фиксирует причину и контролирует отсутствие cash/revenue side effects
5. Проверяет деньги у водителей, supplier payables и mismatch reports
6. При необходимости ведёт manual correction workflow (submit/approval/apply)
7. В конце периода запускает reconciliation

### 4.3 Кладовщик flow (`warehouse`)
1. Пользователь открывает Кладовщик Home
2. Переходит в reservations, supplier requests или stock alerts
3. Проверяет резерв по order
4. Отмечает приёмку поставки и обрабатывает receipt discrepancy case
5. Выполняет движение по факту исполнения
6. Фиксирует возврат или списание при необходимости

### 4.4 Логист flow (`logistics`)
1. Пользователь открывает Логист Home
2. Переходит в Delivery Calendar
3. Назначает слот и водителя
4. Открывает Delivery Task Card
5. Отслеживает partial/full delivery исход выполнения
6. Контролирует route day и эскалации по деньгам водителя (`OnControl` / `Problem`)
7. Обрабатывает инцидент при срыве или проблемный заказ по просроченным деньгам

### 4.5 Водитель flow (`driver`)
1. Пользователь открывает Driver Today
2. Видит список задач на сегодня
3. Открывает Driver Task Card
4. Подтверждает принятие задачи
5. Отмечает прибытие
6. Фиксирует delivered / failed
7. При проблеме отправляет issue

### 4.6 Исполнительный директор flow (`ceo`)
1. Пользователь открывает Executive Dashboard
2. Видит KPI и системные риски
3. Переходит в блок денег у водителей, supplier payables или проблемных заказов
4. Проваливается в нужный домен
5. Читает связанный контекст и аудит
6. Принимает решение

---

## 5. Канонические переходы между карточками

Из Lead Card можно перейти в:
- Client Card
- Deal Card
- follow-up history

Из Deal Card можно перейти в:
- related orders
- client
- contact
- source attribution
- supply summary (partial/deficits/ETA)
- linked supplier request

Из Order Card можно перейти в:
- client
- payments
- delivery task
- stock reservation
- return request
- audit trail

Из Payment Card можно перейти в:
- order
- deal
- refund
- reconciliation issue
- external fact control result (`completed` / `rejected`)
- manual correction linkage (если применимо)

Из Delivery Task Card можно перейти в:
- order
- driver
- incident

Из Reservation / Movement можно перейти в:
- order
- sku
- warehouse context

---

## 6. Правила экранного приоритета

### 6.1 Первичный сценарий на экране должен быть один

Пример:
- Lead Card -> вести коммерческую работу
- Order Card -> контролировать исполнение заказа
- Payment Card -> проводить денежный факт
- Delivery Task Card -> исполнять доставку

### 6.2 Secondary actions должны быть вторичными визуально

Опасные или редкие действия нельзя делать визуально доминирующими.

### 6.3 KPI и analytics не должны мешать операционной работе

Рабочие карточки не должны быть перегружены аналитическими виджетами.

### 6.4 Role dashboard productivity baseline

Каждый role home должен поддерживать:
- saved filters
- role notifications
- быстрые переходы в объекты, требующие действия

---

## 7. Карта экранов по ролям

### Продавец (`seller`)
- Продавец Home
- Leads List / Card
- Deals List / Card
- Orders List / Card
- Supplier Requests List / Card
- Return Requests List / Card (status visibility)
- Clients
- Follow-up Queue
- Client Merge Cases List / Card
- My KPI

### Маркетинг (`marketing`, optional later)
- Маркетинг Home (optional later)
- Channel Performance
- Attribution View
- Marketing Expenses
- Funnel Analytics
- Marketing Reports

### Финансист (`finance`)
- Финансист Home
- Payments List / Card
- External Payment Intake Queue
- Supplier Requests List / Card (status visibility)
- Return Requests List / Card (status visibility)
- Refunds List / Card
- Expenses
- Supplier Payables
- Mismatch Reports
- Manual Corrections List / Card / Approval Queue
- Reconciliation Center
- Finance Reports

### Логист (`logistics`)
- Логист Home
- Delivery Calendar
- Delivery Task List / Card
- Supplier Requests List / Card (status visibility)
- Return Requests List / Card (status visibility)
- Drivers
- Route Day
- Incidents

### Кладовщик (`warehouse`)
- Кладовщик Home
- Stock List
- SKU Card
- Reservations
- Supplier Requests
- Return Requests List / Card (status visibility)
- Movements
- Receipts
- Product Matrix
- ABC Report
- Write-offs
- Stock Returns

### Исполнительный директор (`ceo`)
- Executive Dashboard
- Supplier Requests List / Card (status visibility)
- Return Requests List / Card (status visibility)
- Integration Inbound Inbox / Notification Dispatch Log (read/control level)
- KPI dashboards
- Audit overview
- cross-domain drill-down screens

### Водитель (`driver`)
- Driver Today
- Driver Task Card
- Driver Route
- Supplier Requests List / Card (status visibility)
- Return Requests List / Card (status visibility)
- Driver Issues
- Driver Completed

---

## 8. Что нельзя делать при проектировании экранов

Нельзя:
- строить один общий dashboard вместо role home
- смешивать list, detail, analytics и audit в один перегруженный экран
- давать действия, противоречащие state machine
- показывать одинаковую карточку объекта всем ролям без ролевых секций
- проектировать driver UI как уменьшенную копию backoffice

---

## 9. Итоговое правило

Экранная карта должна сохранять сквозную трассируемость объектов, но каждый пользователь должен видеть только свой рабочий путь внутри системы.
