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

### 2.3 Orders
- Orders List
- Order Card
- Supplier Requests List (mandatory MVP)
- Supplier Request Card (mandatory MVP)
- Return Request List
- Return Request Card

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
- Cash Summary
- Finance Reports

### 2.8 KPI
- Sales KPI
- Logistics KPI
- Warehouse KPI
- Executive KPI

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

---

## 3. Обязательные экраны MVP

MVP должен включать минимум:
- Login
- Продавец Home (`seller`)
- Leads List / Card
- Deals List / Card
- Orders List / Card
- Supplier Requests List / Card
- Payments List / Card
- Delivery Calendar / Task Card
- Stock List / Movements
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
4. Заполняет коммерческий состав, цену и способ исполнения
5. Проверяет покрытие товара и инициирует reserve / supplier request
6. Система auto-creates `Order` при выполнении условий
7. Пользователь отслеживает оплату и исполнение в карточке order

### 4.2 Финансист flow (`finance`)
1. Пользователь открывает Финансист Home
2. Переходит в список payments
3. Находит новую оплату
4. Проводит оплату или отправляет в issue state
5. Проверяет деньги у водителей и supplier payables
6. В конце периода запускает reconciliation

### 4.3 Кладовщик flow (`warehouse`)
1. Пользователь открывает Кладовщик Home
2. Переходит в reservations, supplier requests или stock alerts
3. Проверяет резерв по order
4. Отмечает приёмку поставки и расхождения
5. Выполняет движение по факту исполнения
6. Фиксирует возврат или списание при необходимости

### 4.4 Логист flow (`logistics`)
1. Пользователь открывает Логист Home
2. Переходит в Delivery Calendar
3. Назначает слот и водителя
4. Открывает Delivery Task Card
5. Отслеживает подтверждение и исход выполнения
6. Обрабатывает инцидент при срыве или проблемный заказ по просроченным деньгам

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

---

## 7. Карта экранов по ролям

### Продавец (`seller`)
- Продавец Home
- Leads List / Card
- Deals List / Card
- Orders List / Card
- Supplier Requests List / Card
- Clients
- Follow-up Queue
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
- Refunds List / Card
- Expenses
- Reconciliation Center
- Finance Reports

### Логист (`logistics`)
- Логист Home
- Delivery Calendar
- Delivery Task List / Card
- Drivers
- Route Day
- Incidents

### Кладовщик (`warehouse`)
- Кладовщик Home
- Stock List
- SKU Card
- Reservations
- Supplier Requests
- Movements
- Receipts
- Product Matrix
- ABC Report
- Write-offs
- Stock Returns

### Исполнительный директор (`ceo`)
- Executive Dashboard
- KPI dashboards
- Audit overview
- cross-domain drill-down screens

### Водитель (`driver`)
- Driver Today
- Driver Task Card
- Driver Route
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
