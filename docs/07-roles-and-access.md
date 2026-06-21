# 07. Roles and Access

## 1. Общий принцип

Доступ задаётся не только на уровне страниц.

Он должен управлять:
- страницами
- блоками
- полями
- кнопками
- действиями
- отчётами
- экспортами
- API-методами

Названия ролей в интерфейсе v1 отображаются на русском языке.
Канонические technical role codes фиксируются явно:
- `admin` -> `Админ`
- `seller` -> `Продавец`
- `warehouse` -> `Кладовщик`
- `logistics` -> `Логист`
- `finance` -> `Финансист`
- `ceo` -> `Исполнительный директор`
- optional: `driver` -> `Водитель`
- optional: `marketing` -> `Маркетинг`

---

## 2. Продавец

Видит:
- свои leads
- свои deals
- свои orders
- онлайн-остатки в нужном для сделки срезе
- supplier request status по своим сделкам
- статус оплаты и исполнения по своим заказам
- follow-up queue, next contact date, reminders по своим сделкам
- communication history и stuck-deal индикаторы по своим сделкам
- client card: address, contact, linked deals/orders, installer/designer referral context

Не видит:
- полную финансовую отчётность компании
- внутреннюю кредиторку поставщикам
- закрытую управленческую маржу
- `base purchase price` в product-supplier matrix

Может:
- принимать lead в обработку
- отменять заявку с причиной
- вести коммерческий `Deal`
- добавлять товарный состав
- оформлять supplier request
- запускать коммерческий сценарий обеспечения товара
- ставить follow-up, next contact date и reminders
- фиксировать lost reason и факты коммуникации
- инициировать dedup/merge workflow по клиенту
- инициировать возврат через `ReturnRequest`

---

## 3. Кладовщик

Видит:
- остатки
- резервы
- поступления
- расходы
- списания
- возвраты на склад
- товарную матрицу
- supplier request и supplier documents в разрешённой части
- low-stock alerts
- stale reservation alerts
- receipt discrepancy cases

Может:
- подтверждать складские движения в рамках процесса
- подтверждать поступление
- прикреплять файл к supplier request
- переводить supplier request в `stocked` (UI: `Оприходовано`) после фактического прихода товара
- принимать деньги при самовывозе
- вручную фиксировать cash intake по звонку водителя в рамках складского процесса
- фиксировать и эскалировать расхождения при приёмке

Не может:
- подтверждать денежную выручку по карте/безналу без финансового контура
- менять роль/права
- видеть `base purchase price`

---

## 4. Логист

Видит:
- delivery tasks
- слоты
- route day
- адреса
- контакты доставки
- статус готовности заказа к отгрузке
- проблемные заказы по своему контуру
- контрольный контекст по деньгам от водителя (`OnControl` / `Problem`)

Может:
- планировать и назначать доставку
- вести delivery execution
- закрывать частичную доставку по своим задачам
- быть ответственным за `Problem` order по просроченным деньгам от водителя

Не может:
- подтверждать оплату
- менять складские движения напрямую
- менять финансовые факты
- видеть `base purchase price`

---

## 5. Финансист

Видит:
- денежные поступления
- расходы
- supplier payables
- marketing expenses
- управленческую прибыль
- заказы `OnControl` / `Problem`
- external payment intake/control queue (включая отклонённые факты)
- mismatch reports
- manual corrections и их approval state

Может:
- подтверждать или отклонять внешний payment fact (`completed` / `rejected`)
- подтверждать или отклонять кассовое/безналичное проведение
- вести расходы
- прикреплять файл к supplier request
- переводить supplier request в `paid` (UI: `Оплачено`) после фактической оплаты
- снимать проблемный флаг после фактического поступления денег
- создавать и отправлять на согласование manual corrections
- применять manual correction после approval workflow

---

## 6. Исполнительный директор

Видит:
- сквозную картину по продажам, складу, логистике и финансам
- executive KPI
- деньги у водителей
- проблемные заказы
- supplier payables
- drill-down в критические карточки и аудиты

Может:
- эскалировать и разбирать инциденты
- подтверждать снятие проблемного флага
- прикреплять файл к supplier request
- переводить supplier request в `paid` (UI: `Оплачено`) после фактической оплаты
- утверждать/отклонять manual corrections в рамках approval workflow

---

## 7. Админ

Видит:
- пользователей
- роли
- разрешения
- настройки
- аудит
- system health

Может:
- назначать роли
- управлять матрицей прав
- выполнять техническое администрирование

Ограничение:
- техническое администрирование и бизнес-override должны быть разделены

---

## 8. Водитель

Минимальная роль мобильного исполнения.

Видит:
- только свои delivery task
- адрес
- контакт клиента
- комментарии к доставке
- статус задачи

Не видит:
- полную финансовую отчётность
- лишние данные клиента
- чужие задачи

---

## 9. Дополнительные обязательные правила доступа

### 9.1 Quarantine access
- кладовщик видит `quarantine`
- перевод из `quarantine` в `available` доступен только ролям с отдельным правом дефектовки
- продавец не должен видеть внутренние решения по дефектовке

### 9.2 Soft delete governance
- физическое удаление `Order`, `Deal`, `Payment`, `ReturnRequest` запрещено всем ролям
- даже админ работает через soft delete / archive / cancel сценарии
- soft deleted записи должны оставаться доступными audit и reconciliation контурам

### 9.3 Delivery task scope
- логистика работает с множеством delivery task на один order
- водитель видит только назначенные ему delivery task и нужные для исполнения данные
- водитель не видит полную финансовую и складскую внутреннюю информацию

### 9.4 KPI visibility
- пользователи видят только агрегированные KPI, разрешённые их роли
- raw транзакционные таблицы не должны использоваться UI как источник live KPI по умолчанию

### 9.5 SupplierRequest / ReturnRequest visibility baseline
- список и статус `SupplierRequest` видят все роли
- список и статус `ReturnRequest` видят все роли
- действия по `SupplierRequest` ограничены:
  - создание: `seller`
  - attach file: `warehouse`, `finance`, `ceo`
  - статус `paid`: `finance`, `ceo`
  - статус `stocked`: `warehouse`
- прикреплённый файл `SupplierRequest` видят только `warehouse`, `finance`, `ceo`
- для `ReturnRequest` со сроком более `14` дней после реализации подтверждение требует согласования `ceo`

### 9.6 Purchase price field-level visibility
- `base purchase price` в product-supplier matrix является чувствительным полем
- поле должно быть полностью скрыто для ролей `seller`, `warehouse`, `logistics`
- read/write доступ к полю допускается только по отдельному permission rule (минимум `finance`, `ceo`, `admin` в рамках их задач)

### 9.7 External payment intake/control access
- CRM-side создание оплаты (checkout / payment-link orchestration) не допускается
- роли `finance` и `ceo` выполняют confirm/reject входящего external payment fact
- переход в `rejected` является terminal и не создаёт `cash operation`/`finance income`
- остальные роли видят только агрегированный статус оплаты в контексте своих объектов

### 9.8 Manual correction workflow access
- manual correction выполняется только через approval workflow (`draft -> pending_approval -> approved/rejected -> applied`)
- apply допускается только после approval
- операции approval/apply должны быть audit-traced и role-limited

### 9.9 CRM client dedup/merge safety
- dedup/merge workflow должен быть явным action, а не скрытым автослиянием
- merge операции обязаны оставлять audit trail (actor, before/after, timestamp)
- linked deals/orders и referral context должны сохраняться после merge без потери трассируемости

### 9.10 KPI and workspace visibility discipline
- manager-entered department plans доступны только ролям с управленческим правом планирования
- KPI facts остаются derived и не могут использоваться как permission bypass для изменения доменных фактов
- role home dashboards, saved filters и role notifications должны подчиняться той же матрице прав, что и карточки/действия
