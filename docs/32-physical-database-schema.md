# 32. Physical Database Schema

## Status

Accepted for bootstrap and v1 implementation planning.

This document converts the accepted logical model into a **physical PostgreSQL + Prisma-oriented schema specification**.
If this file conflicts with older logical documents, the conflict must be resolved in favor of:
1. `08-architecture-fixes-and-critical-blockers.md`
2. this file
3. older logical documents

This file is the source of truth for:
- table names
- schema namespaces
- column intent
- primary/foreign keys
- uniqueness rules
- lifecycle fields
- critical indexes
- technical tables required for idempotency, outbox, KPI aggregates, and reconciliation support

This file does **not** require the first bootstrap to implement every constraint on day one, but it fixes what the repository must be designed for.

---

## 1. Physical modeling decisions

### 1.1 Database model
- database engine: `PostgreSQL 17`
- ORM/migrations: `Prisma ORM + Prisma Migrate`
- physical namespace model: **separate PostgreSQL schemas by domain**
- naming style: `snake_case`
- primary keys: `uuid`
- timestamps: `timestamptz`
- dates: `date`
- time-only values: `time`
- money amounts: `numeric(14,2)` unless a stricter field is needed later
- quantities: `numeric(14,3)`

### 1.2 Physical PostgreSQL schemas
The database must use these schemas:
- `users`
- `crm`
- `orders`
- `inventory`
- `payments`
- `logistics`
- `finance`
- `analytics`
- `audit`
- `reconciliation`
- `system`

### 1.3 Cross-cutting conventions
For mutable fact tables, use at minimum:
- `id uuid primary key`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

For soft-delete protected entities, use:
- `deleted_at timestamptz null`
- `deleted_by uuid null`
- `delete_reason text null`

Soft delete is mandatory for:
- `crm.deals`
- `orders.orders`
- `orders.return_requests`
- `payments.payments`

### 1.4 Status fields
Status values must be backed by enums at the Prisma/PostgreSQL layer wherever stable enums are already accepted.
Where a status is still not fully fixed in accepted docs, use an enum only if all values are already documented; otherwise use a constrained string + ADR/TBD note.

### 1.5 Domain transaction rule
`commercial coverage -> auto order + reservation` must be designed either as:
- one DB transaction with full rollback, or
- Saga / Transactional Outbox with compensation

The schema must therefore include:
- `system.idempotency_records`
- `system.outbox_events`

### 1.6 Current business alignment overrides

If older sections below conflict with this section, the current v1 business alignment wins.

Rules:
- `Lead` is an incoming request from `АТС`, site or `Avito`
- `Lead -> Deal` happens on `in_processing`
- cancelled lead never becomes a `Deal`
- `Deal` is the manager's commercial order stage
- standalone `Invoice` table is out of current v1 scope (not a pre-coding gate)
- CRM productivity surface includes follow-up, next contact date, lost reason and communication history
- client master surface includes address and dedup/merge workflow
- durable reservation cannot exist without `Order`
- if reserve is initiated from `Deal`, the system must create `Order` and `Reservation` atomically
- `Order` starts as `assembling`
- order control flags `on_control` and `problem` are stored separately from main order status
- `ClientParticipant` (`installer` / `designer`) is a separate relational structure
- `Supplier` / `SupplierRequest` are mandatory supply-side entities for v1 planning
- one product can be linked to multiple suppliers with priority and base purchase price
- `SupplierRequest` lifecycle is `formed -> confirmed_by_supplier -> paid -> stocked`
- `ReturnRequest` lifecycle is `created -> confirmed -> processed -> closed`
- payment model for v1 is external fact intake/control without CRM-side payment creation
- KPI plans are manager-entered and must stay separate from factual KPI aggregates
- v1 UOM list is fixed as `шт`, `кв.м`, `п.м`, `услуга`

---

## 2. Core enums

Minimum enum set for v1 bootstrap:

### 2.1 Common enums
- `currency_code`: `RUB`
- `record_status`: `active`, `inactive`

### 2.2 CRM enums
- `lead_status`: `new`, `in_processing`, `cancelled`
- `deal_status`: `in_progress`, `converted_to_order`, `cancelled`
- `deal_follow_up_status`: `open`, `done`, `cancelled`
- `client_merge_case_status`: `open`, `merged`, `rejected`

### 2.3 Order enums
- `order_status`: `assembling`, `ready_for_partial_shipment`, `ready_for_shipment`, `partially_shipped`, `shipped`
- `order_payment_control_status`: `none`, `on_control`, `problem`
- `order_delivery_status`: `not_scheduled`, `scheduled`, `partially_delivered`, `delivered`, `failed`
- `fulfillment_status`: `pending`, `completed`, `failed`, `cancelled`
- `fulfillment_type`: `delivery`, `pickup`, `manual`
- `return_request_status`: `created`, `confirmed`, `processed`, `closed`
  UI labels: `Оформлена`, `Подтверждена`, `Обработана`, `Закрыта`

### 2.4 Inventory enums
- `product_unit`: `шт`, `кв.м`, `п.м`, `услуга`
- `supplier_request_status`: `formed`, `confirmed_by_supplier`, `paid`, `stocked`
  UI labels: `Сформирована`, `Подтверждена поставщиком`, `Оплачено`, `Оприходовано`
- `stock_lock_status`: `active`, `expired`, `released`, `promoted`
- `reservation_status`: `active`, `released`, `expired`, `consumed`, `cancelled`
- `inventory_movement_type`: `receipt`, `issue`, `return_to_stock`, `writeoff`, `adjustment`, `reservation_create`, `reservation_release`, `transfer_to_quarantine`, `release_from_quarantine`
- `inventory_bucket`: `on_hand`, `reserved`, `available`, `quarantine`

### 2.5 Payments enums
- `payment_status`: `pending`, `completed`, `refunded`, `rejected`
- `payment_method`: `cash`, `bank_transfer`, `card`, `sbp`, `other`
- `cash_operation_type`: `cash_in`, `cash_out`, `refund`
- `payment_source_type`: `external_fact`

### 2.6 Logistics enums
- `delivery_task_status`: `planned`, `assigned`, `in_transit`, `delivered`, `failed`, `rescheduled`
- `route_day_status`: `planned`, `active`, `closed`, `cancelled`
- `slot_status`: `open`, `held`, `booked`, `closed`

### 2.7 Finance enums
- `finance_entry_type`: `income`, `expense`, `adjustment`
- `expense_type`: `operational`, `marketing`, `procurement`, `logistics`, `other`
- `finance_correction_status`: `draft`, `pending_approval`, `approved`, `rejected`, `applied`

### 2.8 System enums
- `idempotency_status`: `started`, `completed`, `failed`
- `outbox_status`: `pending`, `processing`, `processed`, `failed`, `dead_letter`
- `integration_inbox_status`: `received`, `processed`, `rejected`
- `notification_dispatch_status`: `queued`, `sent`, `failed`

---

## 3. Table catalog by schema

## 3.1 `users`

### 3.1.1 `users.departments`
Purpose:
- canonical department list

Columns:
- `id`
- `code varchar(64) unique not null`
- `name varchar(255) not null`
- `status record_status not null default 'active'`
- `created_at`
- `updated_at`

### 3.1.2 `users.roles`
Columns:
- `id`
- `code varchar(64) unique not null`
- `name varchar(255) not null`
- `department_id uuid null references users.departments(id)`
- `status record_status not null default 'active'`
- `created_at`
- `updated_at`

Canonical v1 role codes:
- `admin`
- `seller`
- `warehouse`
- `logistics`
- `finance`
- `ceo`
- optional: `driver`
- optional: `marketing`

UI labels for these codes are Russian and are handled at presentation layer.

### 3.1.3 `users.permissions`
Columns:
- `id`
- `code varchar(128) unique not null`
- `name varchar(255) not null`
- `description text null`
- `created_at`
- `updated_at`

### 3.1.4 `users.role_permissions`
Columns:
- `id`
- `role_id uuid not null references users.roles(id)`
- `permission_id uuid not null references users.permissions(id)`
- `created_at`
- unique `(role_id, permission_id)`

### 3.1.5 `users.users`
Columns:
- `id`
- `email varchar(320) unique not null`
- `password_hash text not null`
- `display_name varchar(255) not null`
- `department_id uuid null references users.departments(id)`
- `is_active boolean not null default true`
- `mfa_enabled boolean not null default false`
- `last_login_at timestamptz null`
- `created_at`
- `updated_at`

### 3.1.6 `users.user_roles`
Columns:
- `id`
- `user_id uuid not null references users.users(id)`
- `role_id uuid not null references users.roles(id)`
- `created_at`
- unique `(user_id, role_id)`

---

## 3.2 `crm`

### 3.2.1 `crm.clients`
Columns:
- `id`
- `client_type varchar(32) not null`
  `TBD`: exact enum if legal entity vs individual is fixed later.
- `name varchar(255) not null`
- `legal_name varchar(255) null`
- `phone varchar(64) null`
- `email varchar(320) null`
- `tax_id varchar(64) null`
- `address_text text null`
- `address_comment text null`
- `installer_referral_comment text null`
- `designer_referral_comment text null`
- `notes text null`
- `created_at`
- `updated_at`

Indexes:
- index on `(name)`
- index on `(phone)`
- index on `(email)`

### 3.2.2 `crm.contacts`
Columns:
- `id`
- `client_id uuid not null references crm.clients(id)`
- `name varchar(255) not null`
- `phone varchar(64) null`
- `email varchar(320) null`
- `position varchar(255) null`
- `is_primary boolean not null default false`
- `notes text null`
- `created_at`
- `updated_at`

Indexes:
- index on `(client_id)`

### 3.2.2a `crm.client_participants`
Columns:
- `id`
- `client_id uuid not null references crm.clients(id)`
- `deal_id uuid null references crm.deals(id)`
- `order_id uuid null references orders.orders(id)`
- `role_type varchar(32) not null`
- `name varchar(255) not null`
- `phone varchar(64) null`
- `notes text null`
- `created_at`
- `updated_at`

Rules:
- allowed role types in v1: `installer`, `designer`
- participant is additional to `client` / `contact`, not a replacement

### 3.2.3 `crm.leads`
Columns:
- `id`
- `source varchar(128) not null`
- `status varchar(64) not null`
- `client_id uuid null references crm.clients(id)`
- `contact_id uuid null references crm.contacts(id)`
- `responsible_user_id uuid null references users.users(id)`
- `title varchar(255) null`
- `notes text null`
- `created_at`
- `updated_at`

Indexes:
- index on `(status)`
- index on `(source)`
- index on `(responsible_user_id)`

### 3.2.4 `crm.deals`
Columns:
- `id`
- `lead_id uuid null references crm.leads(id)`
- `client_id uuid not null references crm.clients(id)`
- `contact_id uuid null references crm.contacts(id)`
- `responsible_user_id uuid not null references users.users(id)`
- `status deal_status not null`
- `title varchar(255) not null`
- `delivery_mode varchar(32) null`
- `notes text null`
- `expected_value numeric(14,2) null`
- `next_contact_at timestamptz null`
- `lost_reason_code varchar(64) null`
- `stuck_reason_code varchar(64) null`
- `is_stuck boolean not null default false`
- `created_at`
- `updated_at`
- `deleted_at timestamptz null`
- `deleted_by uuid null references users.users(id)`
- `delete_reason text null`

Indexes:
- index on `(client_id)`
- index on `(status)`
- index on `(responsible_user_id)`
- index on `(next_contact_at)`
- index on `(is_stuck, status)`
- partial index on `(deleted_at)` where `deleted_at is null`

### 3.2.5 `crm.deal_follow_ups`
Columns:
- `id`
- `deal_id uuid not null references crm.deals(id)`
- `owner_user_id uuid not null references users.users(id)`
- `next_contact_at timestamptz not null`
- `reminder_at timestamptz null`
- `status deal_follow_up_status not null default 'open'`
- `comment text null`
- `created_at`
- `updated_at`

Indexes:
- index on `(deal_id, status)`
- index on `(owner_user_id, next_contact_at)`

### 3.2.6 `crm.deal_communications`
Columns:
- `id`
- `deal_id uuid not null references crm.deals(id)`
- `client_id uuid not null references crm.clients(id)`
- `channel varchar(32) not null`
- `direction varchar(16) not null`
- `summary text not null`
- `occurred_at timestamptz not null`
- `author_user_id uuid not null references users.users(id)`
- `created_at`
- `updated_at`

Indexes:
- index on `(deal_id, occurred_at)`
- index on `(client_id, occurred_at)`

### 3.2.7 `crm.client_merge_cases`
Columns:
- `id`
- `primary_client_id uuid not null references crm.clients(id)`
- `candidate_client_id uuid not null references crm.clients(id)`
- `status client_merge_case_status not null default 'open'`
- `reason text null`
- `reviewed_by_user_id uuid null references users.users(id)`
- `reviewed_at timestamptz null`
- `merged_at timestamptz null`
- `created_at`
- `updated_at`

Indexes:
- index on `(primary_client_id, status)`
- index on `(candidate_client_id, status)`

---

## 3.3 `orders`

### 3.3.1 `orders.orders`
Columns:
- `id`
- `order_number varchar(64) unique not null`
- `deal_id uuid not null references crm.deals(id)`
- `client_id uuid not null references crm.clients(id)`
- `status order_status not null`
- `payment_control_status order_payment_control_status not null default 'none'`
- `payment_control_due_at timestamptz null`
- `delivery_status order_delivery_status not null default 'not_scheduled'`
- `fulfillment_type fulfillment_type not null`
- `currency currency_code not null default 'RUB'`
- `subtotal_amount numeric(14,2) not null default 0`
- `discount_amount numeric(14,2) not null default 0`
- `total_amount numeric(14,2) not null default 0`
- `notes text null`
- `ready_for_partial_shipment_at timestamptz null`
- `ready_for_shipment_at timestamptz null`
- `partially_shipped_at timestamptz null`
- `shipped_at timestamptz null`
- `created_by uuid not null references users.users(id)`
- `updated_by uuid null references users.users(id)`
- `created_at`
- `updated_at`
- `deleted_at timestamptz null`
- `deleted_by uuid null references users.users(id)`
- `delete_reason text null`

Rules:
- one order must belong to one deal
- one deal may have multiple orders
- canonical v1 creation path is system auto-create from `crm.deals`
- `delivery_status` is an aggregate field derived from `logistics.delivery_tasks`

Indexes:
- unique `(order_number)`
- index on `(deal_id)`
- index on `(client_id)`
- index on `(status)`
- index on `(delivery_status)`
- partial index on `(deleted_at)` where `deleted_at is null`

### 3.3.2 `orders.order_items`
Columns:
- `id`
- `order_id uuid not null references orders.orders(id)`
- `line_no integer not null`
- `product_id uuid not null references inventory.products(id)`
- `product_name_snapshot varchar(255) not null`
- `sku_snapshot varchar(128) null`
- `qty numeric(14,3) not null`
- `unit product_unit not null`
- `retail_price numeric(14,2) not null`
- `discount_amount numeric(14,2) not null default 0`
- `line_total numeric(14,2) not null`
- `cost_snapshot numeric(14,2) null`
- `notes text null`
- `created_at`
- `updated_at`

Rules:
- `retail_price` is copied from the commercial source at deal/order creation
- `cost_snapshot` is optional at commercial creation stage, but if used it must be sourced from Inventory logic, never from retail price

Indexes:
- unique `(order_id, line_no)`
- index on `(product_id)`

### 3.3.2a `orders.deal_supply_summaries`
Purpose:
- read-model for deal supply UX (partial coverage/deficits/ETA/linked supplier requests)

Columns:
- `id`
- `deal_id uuid not null references crm.deals(id)`
- `coverage_status varchar(32) not null`
  Allowed values for v1: `none`, `partial`, `full`.
- `covered_qty numeric(14,3) not null default 0`
- `deficit_qty numeric(14,3) not null default 0`
- `eta_from date null`
- `eta_to date null`
- `linked_supplier_request_count integer not null default 0`
- `payload jsonb null`
- `updated_at timestamptz not null default now()`
- `created_at timestamptz not null default now()`

Rules:
- table is a derived summary and not a source-of-truth for stock/supply mutations
- summary must be refreshed from reservations, supplier requests, and receipts
- summary table keeps at most one row per `deal` and may be absent until first projection refresh (`0..1` presence)

Indexes:
- unique `(deal_id)`
- index on `(coverage_status, updated_at)`

### 3.3.3 `orders.fulfillments`
Columns:
- `id`
- `order_id uuid not null references orders.orders(id)`
- `delivery_task_id uuid null references logistics.delivery_tasks(id)`
- `pickup_window_id uuid null references logistics.pickup_windows(id)`
- `status fulfillment_status not null`
- `fulfillment_type fulfillment_type not null`
- `fulfilled_at timestamptz null`
- `failure_reason text null`
- `created_by uuid not null references users.users(id)`
- `created_at`
- `updated_at`

Indexes:
- index on `(order_id)`
- index on `(delivery_task_id)`
- index on `(status)`

### 3.3.4 `orders.fulfillment_items`
Purpose:
- item-level binding for partial fulfillment

Columns:
- `id`
- `fulfillment_id uuid not null references orders.fulfillments(id)`
- `order_item_id uuid not null references orders.order_items(id)`
- `qty numeric(14,3) not null`
- `created_at`
- `updated_at`

Indexes:
- unique `(fulfillment_id, order_item_id)`
- index on `(order_item_id)`

### 3.3.5 `orders.return_requests`
Columns:
- `id`
- `order_id uuid not null references orders.orders(id)`
- `status return_request_status not null`
- `requested_by_user_id uuid not null references users.users(id)`
- `reason text not null`
- `requested_refund_amount numeric(14,2) null`
- `approved_refund_amount numeric(14,2) null`
- `realization_anchor_at timestamptz null`
- `confirmed_at timestamptz null`
- `requires_ceo_approval boolean not null default false`
- `ceo_approved_by uuid null references users.users(id)`
- `ceo_approved_at timestamptz null`
- `processed_at timestamptz null`
- `closed_at timestamptz null`
- `created_at`
- `updated_at`
- `deleted_at timestamptz null`
- `deleted_by uuid null references users.users(id)`
- `delete_reason text null`

Rules:
- lifecycle must stay `created -> confirmed -> processed -> closed`
- `realization_anchor_at` is the canonical anchor for 14-day gating and must be set from `MIN(orders.fulfillments.fulfilled_at)` for returned items (via `orders.fulfillment_items` linkage), using only confirmed execution facts
- `confirmed` for returns older than `14` days uses `confirmed_at - realization_anchor_at > 14 days` and requires `requires_ceo_approval = true` plus populated `ceo_approved_by` / `ceo_approved_at`
- non-canonical anchors for this rule are forbidden: `orders.orders.shipped_at`, `orders.orders.partially_shipped_at`, and logistics planning/route timestamps

Indexes:
- index on `(order_id)`
- index on `(status)`
- partial index on `(deleted_at)` where `deleted_at is null`

### 3.3.6 `orders.return_request_items`
Columns:
- `id`
- `return_request_id uuid not null references orders.return_requests(id)`
- `order_item_id uuid not null references orders.order_items(id)`
- `qty numeric(14,3) not null`
- `resolution varchar(64) not null`
  Suggested values: `return_to_quarantine`, `writeoff`, `refund_only`. Exact enum may be stabilized later.
- `created_at`
- `updated_at`

Indexes:
- unique `(return_request_id, order_item_id)`
- index on `(order_item_id)`

---

## 3.4 `inventory`

### 3.4.0 `inventory.suppliers`
Columns:
- `id`
- `name varchar(255) not null`
- `phone varchar(64) null`
- `email varchar(320) null`
- `notes text null`
- `created_at`
- `updated_at`

### 3.4.0a `inventory.supplier_requests`
Columns:
- `id`
- `supplier_id uuid not null references inventory.suppliers(id)`
- `business_source_type varchar(32) not null`
  Allowed v1 values: `deal`, `order`.
- `business_source_id uuid not null`
- `status supplier_request_status not null`
- `expected_supply_date date not null`
- `requested_by uuid not null references users.users(id)`
- `confirmed_by uuid null references users.users(id)`
- `paid_by uuid null references users.users(id)`
- `paid_at timestamptz null`
- `stocked_by uuid null references users.users(id)`
- `stocked_at timestamptz null`
- `supplier_document_url text null`
- `created_at`
- `updated_at`

Rules:
- supplier request keeps source linkage via `business_source_type + business_source_id`
- supplier request create action is performed by `seller`
- supplier request attachment can be uploaded only by `warehouse`, `finance`, `ceo`
- supplier request attachment is visible only to `warehouse`, `finance`, `ceo`
- status `paid` is set only by `finance` or `ceo` after factual payment
- status `stocked` is set only by `warehouse` after factual goods arrival
- supplier request does not mutate stock directly

### 3.4.0b `inventory.supplier_request_items`
Columns:
- `id`
- `supplier_request_id uuid not null references inventory.supplier_requests(id)`
- `product_id uuid not null references inventory.products(id)`
- `qty numeric(14,3) not null`
- `unit product_unit not null`
- `source_line_ref varchar(128) not null`
- `source_line_context jsonb null`
- `created_at`
- `updated_at`

### 3.4.0c `inventory.product_suppliers`
Columns:
- `id`
- `product_id uuid not null references inventory.products(id)`
- `supplier_id uuid not null references inventory.suppliers(id)`
- `supplier_priority integer not null`
- `base_purchase_price numeric(14,2) not null`
- `currency currency_code not null default 'RUB'`
- `is_active boolean not null default true`
- `created_at`
- `updated_at`

Rules:
- one product can be linked to multiple suppliers
- `supplier_priority` controls preferred sourcing order (lower value = higher priority)
- `base_purchase_price` is a sensitive field and must be hidden from `seller`, `warehouse`, `logistics` at API level

Indexes:
- unique `(product_id, supplier_id)`
- unique `(product_id, supplier_priority)` where `is_active = true`
- index on `(supplier_id, is_active)`

### 3.4.1 `inventory.products`
Columns:
- `id`
- `sku varchar(128) unique not null`
- `name varchar(255) not null`
- `product_type varchar(64) null`
- `unit product_unit not null`
- `is_active boolean not null default true`
- `created_at`
- `updated_at`

Indexes:
- unique `(sku)`
- index on `(name)`

### 3.4.2 `inventory.warehouses`
Columns:
- `id`
- `code varchar(64) unique not null`
- `name varchar(255) not null`
- `is_active boolean not null default true`
- `created_at`
- `updated_at`

### 3.4.3 `inventory.stock_balances`
Purpose:
- current bucketed stock state per product and warehouse

Columns:
- `id`
- `product_id uuid not null references inventory.products(id)`
- `warehouse_id uuid not null references inventory.warehouses(id)`
- `on_hand_qty numeric(14,3) not null default 0`
- `reserved_qty numeric(14,3) not null default 0`
- `available_qty numeric(14,3) not null default 0`
- `quarantine_qty numeric(14,3) not null default 0`
- `weighted_avg_cost numeric(14,2) not null default 0`
- `updated_at timestamptz not null default now()`
- `created_at timestamptz not null default now()`

Rules:
- exactly one row per `(product_id, warehouse_id)`
- `available_qty` must not be derived from UI-only math; it must be materialized and kept consistent by domain logic
- `quarantine_qty` is mandatory because returned goods do not re-enter `available` directly

Indexes:
- unique `(product_id, warehouse_id)`
- index on `(warehouse_id, product_id)`

### 3.4.4 `inventory.stock_locks`
Purpose:
- short-lived soft lock / pre-reserve used before order materialization and durable reservation

Columns:
- `id`
- `product_id uuid not null references inventory.products(id)`
- `warehouse_id uuid not null references inventory.warehouses(id)`
- `order_id uuid null references orders.orders(id)`
- `deal_id uuid null references crm.deals(id)`
- `qty numeric(14,3) not null`
- `status stock_lock_status not null default 'active'`
- `idempotency_key varchar(128) null`
- `expires_at timestamptz not null`
- `released_at timestamptz null`
- `promoted_reservation_id uuid null references inventory.reservations(id)`
- `created_by uuid not null references users.users(id)`
- `created_at`
- `updated_at`

Rules:
- lock TTL must stay short (`5-10 minutes` target)
- this table is not a substitute for durable reservation

Indexes:
- index on `(product_id, warehouse_id, status)`
- index on `(order_id)`
- index on `(deal_id)`
- index on `(expires_at)`

### 3.4.5 `inventory.reservations`
Columns:
- `id`
- `order_id uuid not null references orders.orders(id)`
- `product_id uuid not null references inventory.products(id)`
- `warehouse_id uuid not null references inventory.warehouses(id)`
- `qty numeric(14,3) not null`
- `status reservation_status not null default 'active'`
- `expires_at timestamptz not null`
- `released_at timestamptz null`
- `consumed_at timestamptz null`
- `created_by uuid not null references users.users(id)`
- `created_at`
- `updated_at`

Indexes:
- index on `(order_id)`
- index on `(product_id, warehouse_id, status)`
- index on `(expires_at)`

### 3.4.6 `inventory.purchase_receipts`
Columns:
- `id`
- `receipt_number varchar(64) unique not null`
- `warehouse_id uuid not null references inventory.warehouses(id)`
- `supplier_id uuid not null references inventory.suppliers(id)`
- `supplier_request_id uuid null references inventory.supplier_requests(id)`
- `received_at timestamptz not null`
- `created_by uuid not null references users.users(id)`
- `created_at`
- `updated_at`

Rules:
- stock increase is recorded only via receipt flow + movements
- when `supplier_request_id` is set, receipt supplier must match supplier request supplier
- receipt completion is the prerequisite for `supplier_requests.status = stocked`

### 3.4.7 `inventory.purchase_receipt_items`
Columns:
- `id`
- `purchase_receipt_id uuid not null references inventory.purchase_receipts(id)`
- `product_id uuid not null references inventory.products(id)`
- `qty numeric(14,3) not null`
- `unit product_unit not null`
- `unit_cost numeric(14,2) not null`
- `line_total numeric(14,2) not null`
- `supplier_request_item_id uuid null references inventory.supplier_request_items(id)`
- `created_at`
- `updated_at`

Indexes:
- index on `(purchase_receipt_id)`
- index on `(product_id)`

### 3.4.8 `inventory.inventory_movements`
Columns:
- `id`
- `movement_type inventory_movement_type not null`
- `product_id uuid not null references inventory.products(id)`
- `warehouse_id uuid not null references inventory.warehouses(id)`
- `qty numeric(14,3) not null`
- `bucket_from inventory_bucket null`
- `bucket_to inventory_bucket null`
- `unit_cost numeric(14,2) null`
- `total_cost numeric(14,2) null`
- `order_id uuid null references orders.orders(id)`
- `fulfillment_id uuid null references orders.fulfillments(id)`
- `return_request_id uuid null references orders.return_requests(id)`
- `reservation_id uuid null references inventory.reservations(id)`
- `purchase_receipt_id uuid null references inventory.purchase_receipts(id)`
- `reason text null`
- `performed_by uuid not null references users.users(id)`
- `created_at`
- `updated_at`

Rules:
- journal of record for inventory mutations
- issue movements created only from confirmed fulfillment fact
- return flows default to `bucket_to = quarantine`

Indexes:
- index on `(product_id, warehouse_id, created_at)`
- index on `(order_id)`
- index on `(return_request_id)`
- index on `(reservation_id)`
- index on `(purchase_receipt_id)`

---

## 3.5 `payments`

### 3.5.1 `payments.payments`
Columns:
- `id`
- `payment_number varchar(64) unique not null`
- `order_id uuid not null references orders.orders(id)`
- `status payment_status not null`
- `source_type payment_source_type not null default 'external_fact'`
- `external_source varchar(64) not null`
  Expected v1 values: `bank`, `acquiring`, `cash_register`, `manual_import`, `other`.
- `external_event_id varchar(128) not null`
- `payment_method payment_method not null`
- `amount numeric(14,2) not null`
- `refunded_amount numeric(14,2) not null default 0`
- `intaked_at timestamptz not null`
- `confirmed_by uuid null references users.users(id)`
- `confirmed_at timestamptz null`
- `rejected_at timestamptz null`
- `external_reference varchar(255) null`
- `created_by uuid null references users.users(id)`
- `created_at`
- `updated_at`
- `deleted_at timestamptz null`
- `deleted_by uuid null references users.users(id)`
- `delete_reason text null`

Rules:
- table stores intake/control of external payment facts
- `external_source` stores payment-provider/source semantics and must not use lead-integration sources (`ats`, `avito`)
- rejection flow must set `status = rejected` and fill `rejected_at`
- rejected payment fact must not create cash-in or finance income records
- CRM-side hosted checkout/payment-link creation is out of scope for v1
- income recognition in finance must be linked to `status = completed` confirmation

Indexes:
- unique `(payment_number)`
- unique `(external_source, external_event_id)`
- index on `(order_id)`
- index on `(status)`
- index on `(source_type, intaked_at)`
- partial index on `(deleted_at)` where `deleted_at is null`

### 3.5.2 `payments.cash_operations`
Columns:
- `id`
- `payment_id uuid null references payments.payments(id)`
- `return_request_id uuid null references orders.return_requests(id)`
- `operation_type cash_operation_type not null`
- `amount numeric(14,2) not null`
- `currency currency_code not null default 'RUB'`
- `performed_at timestamptz not null`
- `external_reference varchar(255) null`
- `created_by uuid not null references users.users(id)`
- `created_at`
- `updated_at`

Rules:
- cash refund requires `return_request_id`

Indexes:
- index on `(payment_id)`
- index on `(return_request_id)`
- index on `(performed_at)`

---

## 3.6 `logistics`

### 3.6.1 `logistics.delivery_slots`
Columns:
- `id`
- `slot_date date not null`
- `window_start time not null`
- `window_end time not null`
- `capacity integer not null default 1`
- `reserved_count integer not null default 0`
- `status slot_status not null default 'open'`
- `created_at`
- `updated_at`

Indexes:
- unique `(slot_date, window_start, window_end)`
- index on `(slot_date, status)`

### 3.6.2 `logistics.pickup_windows`
Columns:
- `id`
- `window_date date not null`
- `window_start time not null`
- `window_end time not null`
- `capacity integer not null default 1`
- `reserved_count integer not null default 0`
- `status slot_status not null default 'open'`
- `created_at`
- `updated_at`

### 3.6.3 `logistics.drivers`
Columns:
- `id`
- `user_id uuid null references users.users(id)`
- `name varchar(255) not null`
- `phone varchar(64) null`
- `is_active boolean not null default true`
- `created_at`
- `updated_at`

### 3.6.4 `logistics.vehicles`
Columns:
- `id`
- `plate_number varchar(64) unique null`
- `name varchar(255) not null`
- `capacity_notes text null`
- `is_active boolean not null default true`
- `created_at`
- `updated_at`

### 3.6.5 `logistics.route_days`
Columns:
- `id`
- `route_date date not null`
- `driver_id uuid null references logistics.drivers(id)`
- `vehicle_id uuid null references logistics.vehicles(id)`
- `status route_day_status not null default 'planned'`
- `notes text null`
- `created_at`
- `updated_at`

Indexes:
- index on `(route_date)`
- index on `(driver_id, route_date)`

### 3.6.6 `logistics.delivery_tasks`
Columns:
- `id`
- `order_id uuid not null references orders.orders(id)`
- `route_day_id uuid null references logistics.route_days(id)`
- `delivery_slot_id uuid null references logistics.delivery_slots(id)`
- `driver_id uuid null references logistics.drivers(id)`
- `vehicle_id uuid null references logistics.vehicles(id)`
- `status delivery_task_status not null`
- `sequence_no integer null`
- `planned_date date null`
- `delivered_at timestamptz null`
- `failure_reason text null`
- `address_text text null`
- `recipient_name varchar(255) null`
- `recipient_phone varchar(64) null`
- `created_by uuid not null references users.users(id)`
- `created_at`
- `updated_at`

Rules:
- multiple tasks per one order are supported and expected
- order delivery state is aggregated from this table

Indexes:
- index on `(order_id)`
- index on `(route_day_id)`
- index on `(delivery_slot_id)`
- index on `(status)`
- index on `(driver_id, planned_date)`

### 3.6.7 `logistics.delivery_task_items`
Purpose:
- item-level split of an order across multiple delivery tasks

Columns:
- `id`
- `delivery_task_id uuid not null references logistics.delivery_tasks(id)`
- `order_item_id uuid not null references orders.order_items(id)`
- `qty numeric(14,3) not null`
- `created_at`
- `updated_at`

Indexes:
- unique `(delivery_task_id, order_item_id)`
- index on `(order_item_id)`

---

## 3.7 `finance`

### 3.7.1 `finance.finance_entries`
Columns:
- `id`
- `entry_type finance_entry_type not null`
- `order_id uuid null references orders.orders(id)`
- `payment_id uuid null references payments.payments(id)`
- `cash_operation_id uuid null references payments.cash_operations(id)`
- `return_request_id uuid null references orders.return_requests(id)`
- `amount numeric(14,2) not null`
- `currency currency_code not null default 'RUB'`
- `recognized_at timestamptz not null`
- `description text null`
- `created_by uuid not null references users.users(id)`
- `created_at`
- `updated_at`

Rules:
- income recognition follows cash basis
- finance must not recognize sales income from order status change alone

Indexes:
- index on `(entry_type)`
- index on `(payment_id)`
- index on `(recognized_at)`

### 3.7.2 `finance.expenses`
Columns:
- `id`
- `expense_type expense_type not null`
- `amount numeric(14,2) not null`
- `currency currency_code not null default 'RUB'`
- `occurred_at timestamptz not null`
- `description text null`
- `related_order_id uuid null references orders.orders(id)`
- `created_by uuid not null references users.users(id)`
- `created_at`
- `updated_at`

Indexes:
- index on `(expense_type)`
- index on `(occurred_at)`

### 3.7.3 `finance.marketing_expenses`
Columns:
- `id`
- `source varchar(128) not null`
- `campaign varchar(255) null`
- `amount numeric(14,2) not null`
- `currency currency_code not null default 'RUB'`
- `occurred_at timestamptz not null`
- `description text null`
- `created_by uuid not null references users.users(id)`
- `created_at`
- `updated_at`

Indexes:
- index on `(source)`
- index on `(occurred_at)`

### 3.7.4 `finance.manual_corrections`
Columns:
- `id`
- `status finance_correction_status not null default 'draft'`
- `reason text not null`
- `requested_by_user_id uuid not null references users.users(id)`
- `approved_by_user_id uuid null references users.users(id)`
- `approved_at timestamptz null`
- `rejected_at timestamptz null`
- `applied_at timestamptz null`
- `applied_entry_id uuid null references finance.finance_entries(id)`
- `payload jsonb not null`
- `created_at`
- `updated_at`

Rules:
- correction must not overwrite source-of-truth domain facts
- apply step is allowed only after `approved`
- one correction may reference at most one final finance entry via `applied_entry_id` (`0..1`)
- lifecycle transitions must be auditable

Indexes:
- index on `(status, created_at)`
- index on `(requested_by_user_id, status)`
- unique `(applied_entry_id)` where `applied_entry_id is not null`

---

## 3.8 `analytics`

### 3.8.1 `analytics.live_kpi_metrics`
Purpose:
- precomputed current KPI values for dashboards

Columns:
- `id`
- `metric_code varchar(128) not null`
- `scope_type varchar(64) not null`
- `scope_id uuid null`
- `metric_value numeric(18,4) not null`
- `metric_payload jsonb null`
- `as_of timestamptz not null`
- `updated_at timestamptz not null default now()`
- `created_at timestamptz not null default now()`

Indexes:
- unique `(metric_code, scope_type, scope_id)`
- unique partial `(metric_code, scope_type)` where `scope_id is null` for the accepted `global/null` live refresh scope
- index on `(as_of)`

Rules:
- first accepted refresh write target is this table only
- live refresh writes use upsert semantics on `(metric_code, scope_type, scope_id)`
- first accepted refresh scope is `scope_type = 'global'` with `scope_id = null`
- implementation must enforce one row for nullable global scope through the accepted partial unique index before live refresh writes
- live refresh writes set `as_of` from the accepted `refreshedAt` input
- live refresh writes do not store `period`; `period` is only a refresh command, idempotency, and event grouping value for live KPI
- `metric_value` must be supplied as an already-computed value; this table contract does not define formulas or source-domain event-to-metric mapping
- `metric_payload` may be `null`; payload shape remains `TBD`
- KPI remains a derived read layer and cannot mutate source-domain facts

### 3.8.1a `analytics.department_plans`
Purpose:
- manager-entered department plans for KPI plan/fact view

Columns:
- `id`
- `department_id uuid not null references users.departments(id)`
- `metric_code varchar(128) not null`
- `period_start date not null`
- `period_end date not null`
- `plan_value numeric(18,4) not null`
- `set_by_user_id uuid not null references users.users(id)`
- `set_at timestamptz not null`
- `created_at`
- `updated_at`

Rules:
- plan records are manual inputs and must stay separated from factual KPI aggregates
- KPI factual metrics remain derived from source domains and are stored in live/snapshot tables

Indexes:
- unique `(department_id, metric_code, period_start, period_end)`
- index on `(metric_code, period_start, period_end)`

### 3.8.2 `analytics.snapshot_kpi_metrics`
Columns:
- `id`
- `metric_code varchar(128) not null`
- `period_type varchar(32) not null`
- `period_start date not null`
- `period_end date not null`
- `scope_type varchar(64) not null`
- `scope_id uuid null`
- `metric_value numeric(18,4) not null`
- `metric_payload jsonb null`
- `created_at`
- `updated_at`

Indexes:
- unique `(metric_code, period_type, period_start, period_end, scope_type, scope_id)`

---

## 3.9 `audit`

### 3.9.1 `audit.audit_events`
Columns:
- `id`
- `entity_type varchar(128) not null`
- `entity_id uuid not null`
- `action varchar(128) not null`
- `actor_user_id uuid null references users.users(id)`
- `from_state varchar(128) null`
- `to_state varchar(128) null`
- `reason text null`
- `payload jsonb null`
- `created_at timestamptz not null default now()`

Indexes:
- index on `(entity_type, entity_id)`
- index on `(actor_user_id)`
- index on `(created_at)`

---

## 3.10 `reconciliation`

### 3.10.1 `reconciliation.reports`
Columns:
- `id`
- `report_date date not null`
- `status varchar(64) not null`
- `summary jsonb not null`
- `issues_count integer not null default 0`
- `created_at`
- `updated_at`

Indexes:
- unique `(report_date)`

---

## 3.11 `system`

### 3.11.1 `system.idempotency_records`
Columns:
- `id`
- `idempotency_key varchar(128) not null`
- `scope varchar(128) not null`
- `request_hash varchar(128) not null`
- `status idempotency_status not null`
- `response_status_code integer null`
- `response_body jsonb null`
- `locked_until timestamptz null`
- `created_at`
- `updated_at`

Rules:
- checked before domain service execution
- repeated requests with same semantic key return stored or coordinated result
- KPI live refresh writes use scope `kpi.live_metric_refresh`
- for KPI live refresh writes, repeated completed records with the same normalized request hash return the prior result
- for KPI live refresh writes, repeated keys with a different normalized request hash are conflicts
- KPI live refresh request hash includes `metricKey`, `period`, `scopeType`, `scopeId`, `refreshedAt`, `metricValue`, and `metricPayload` when present
- active in-progress KPI refresh records must not execute a second write
- failed KPI refresh records are terminal for the same `idempotency_key`; retry uses a new `idempotency_key` until a broader retry coordination policy is accepted

Indexes:
- unique `(scope, idempotency_key)`
- index on `(status)`
- index on `(locked_until)`

### 3.11.2 `system.outbox_events`
Columns:
- `id`
- `event_type varchar(128) not null`
- `aggregate_type varchar(128) not null`
- `aggregate_id uuid not null`
- `payload jsonb not null`
- `status outbox_status not null default 'pending'`
- `attempt_count integer not null default 0`
- `next_attempt_at timestamptz null`
- `error_message text null`
- `created_at`
- `updated_at`
- `processed_at timestamptz null`

Indexes:
- index on `(status, next_attempt_at)`
- index on `(aggregate_type, aggregate_id)`
- index on `(event_type)`

KPI live refresh outbox rules:
- KPI live refresh writes enqueue `kpi.live_aggregate_refreshed`
- enqueue happens in the same database transaction as the idempotency record completion and live KPI upsert
- `aggregate_type = 'analytics.live_kpi_metrics'`
- `aggregate_id` is the affected `analytics.live_kpi_metrics.id`
- payload contains only `metricKey`, `period`, and `refreshedAt` for the accepted v1 event contract
- `scopeType`, `scopeId`, and `idempotencyKey` are not part of the event payload until the shared event contract explicitly expands

### 3.11.3 `system.integration_inbox_events`
Purpose:
- durable inbox for inbound integration events (`ATS`, `Avito`)

Columns:
- `id`
- `source_system varchar(32) not null`
  Allowed v1 values: `ats`, `avito`.
- `external_event_id varchar(128) not null`
- `payload jsonb not null`
- `status integration_inbox_status not null default 'received'`
- `received_at timestamptz not null`
- `processed_at timestamptz null`
- `rejected_reason text null`
- `created_at`
- `updated_at`

Indexes:
- unique `(source_system, external_event_id)`
- index on `(status, received_at)`

### 3.11.4 `system.notification_dispatches`
Purpose:
- outbound dispatch log for `Telegram` and `MAX` notifications

Columns:
- `id`
- `channel varchar(32) not null`
  Allowed v1 values: `telegram`, `max`.
- `event_type varchar(128) not null`
- `target_ref varchar(255) not null`
- `payload jsonb not null`
- `status notification_dispatch_status not null default 'queued'`
- `queued_at timestamptz not null`
- `sent_at timestamptz null`
- `error_message text null`
- `created_at`
- `updated_at`

Indexes:
- index on `(channel, status, queued_at)`
- index on `(event_type, target_ref)`

### 3.11.5 `system.settings`
Purpose:
- controlled runtime/business settings that are safe to store in DB

Columns:
- `id`
- `key varchar(128) unique not null`
- `value jsonb not null`
- `updated_by uuid null references users.users(id)`
- `created_at`
- `updated_at`

---

## 4. Critical relationship summary

### 4.1 Core commercial chain
- `crm.leads 1 -> 0..1 crm.deals` (nullable because deals may also be created manually)
- `crm.clients 1 -> n crm.contacts`
- `crm.clients 1 -> n crm.client_participants`
- `crm.deals 1 -> n crm.deal_follow_ups`
- `crm.deals 1 -> n crm.deal_communications`
- `crm.clients 1 -> n crm.client_merge_cases`
- `crm.deals 1 -> n orders.orders`
- `crm.deals 1 -> 0..1 orders.deal_supply_summaries`
- `orders.orders 1 -> n orders.order_items`

### 4.2 Inventory and order chain
- `inventory.suppliers 1 -> n inventory.supplier_requests`
- `inventory.supplier_requests 1 -> n inventory.supplier_request_items`
- `inventory.products 1 -> n inventory.product_suppliers`
- `inventory.suppliers 1 -> n inventory.product_suppliers`
- `inventory.supplier_requests 1 -> n inventory.purchase_receipts` (optional linkage via `supplier_request_id`)
- `orders.orders 1 -> n inventory.reservations`
- `orders.orders 1 -> n inventory.stock_locks`
- `orders.orders 1 -> n inventory.inventory_movements`

### 4.3 Logistics chain
- `orders.orders 1 -> n logistics.delivery_tasks`
- `logistics.delivery_tasks 1 -> n logistics.delivery_task_items`
- `orders.orders 1 -> n orders.fulfillments`
- `orders.fulfillments 1 -> n orders.fulfillment_items`

### 4.4 Return chain
- `orders.orders 1 -> n orders.return_requests`
- `orders.return_requests 1 -> n orders.return_request_items`
- `orders.return_requests 1 -> n payments.cash_operations`
- `orders.return_requests 1 -> n inventory.inventory_movements`

### 4.5 Money and finance chain
- `orders.orders 1 -> n payments.payments`
- `payments.payments 1 -> n payments.cash_operations`
- `payments.payments 1 -> n finance.finance_entries`
- `finance.manual_corrections 1 -> 0..1 finance.finance_entries`

### 4.6 KPI and integration chain
- `users.departments 1 -> n analytics.department_plans`
- `system.integration_inbox_events` links to CRM/Order entities via correlation references
- `system.notification_dispatches` links to domain facts via `event_type + target_ref`

---

## 5. Mandatory constraints and invariants

### 5.1 Commercial preparation vs reservation
- pre-order commercial preparation may coexist with active `inventory.stock_locks`
- durable `inventory.reservations` must not exist without `orders.orders`

### 5.2 Delivery split
- one `orders.orders` row may have multiple `logistics.delivery_tasks`
- `orders.orders.delivery_status` must be updated from task aggregates, not from one direct FK

### 5.3 Return quarantine
- `inventory.inventory_movements.movement_type = return_to_stock` must not increase `inventory.stock_balances.available_qty` directly
- default return path increases `quarantine_qty`

### 5.4 Cash basis
- `finance.finance_entries.entry_type = income` must be backed by a money fact
- no income recognition from only `orders.orders.shipped_at`

### 5.5 Soft deletion
- no physical delete for soft-protected tables in application logic
- migrations may only use physical delete when restructuring data with explicit approval and data preservation plan

### 5.6 External payment intake/control
- `payments.payments` rows in v1 represent external payment facts under control, not CRM-initiated checkout transactions
- income entries must be tied to confirmed external payment facts

### 5.7 Purchase price field-level restriction
- `inventory.product_suppliers.base_purchase_price` is sensitive and must be filtered by API permission layer
- roles `seller`, `warehouse`, `logistics` must not receive this field

### 5.8 KPI plan/fact separation
- `analytics.department_plans` stores manual manager plans only
- factual KPI values remain in `analytics.live_kpi_metrics` / `analytics.snapshot_kpi_metrics` and are derived from source domains

---

## 6. Index priorities for bootstrap

The first migration must include at minimum:
- all PKs
- all FKs
- unique business keys (`order_number`, `payment_number`, `sku`, warehouse code, etc.)
- status indexes on highly filtered tables
- date/time indexes for slots, route days, payments, finance entries
- outbox processing index
- idempotency uniqueness index

High-priority indexes:
- `orders.orders(status, delivery_status)`
- `crm.deals(next_contact_at, is_stuck)`
- `crm.deal_follow_ups(owner_user_id, next_contact_at)`
- `inventory.stock_balances(warehouse_id, product_id)`
- `inventory.product_suppliers(product_id, supplier_priority)`
- `inventory.stock_locks(expires_at, status)`
- `inventory.reservations(order_id, status)`
- `payments.payments(order_id, status)`
- `payments.payments(external_source, external_event_id)`
- `logistics.delivery_tasks(order_id, status)`
- `analytics.live_kpi_metrics(metric_code, scope_type, scope_id)`
- `analytics.department_plans(department_id, metric_code, period_start, period_end)`
- `system.outbox_events(status, next_attempt_at)`
- `system.integration_inbox_events(status, received_at)`
- `system.notification_dispatches(channel, status, queued_at)`

---

## 7. Bootstrap implementation order for the schema

Recommended migration order:
1. create PostgreSQL schemas
2. create common enums
3. create `users.*`
4. create `crm.*` including follow-up/communication/merge workflow tables
5. create `inventory.products`, `inventory.suppliers`, `inventory.product_suppliers`, `inventory.warehouses`, `inventory.stock_balances`
6. create `orders.*` including `deal_supply_summaries`
7. create `inventory.stock_locks`, `inventory.reservations`, `inventory.purchase_receipts*`, `inventory.inventory_movements`
8. create `payments.*`
9. create `logistics.*`
10. create `finance.*` including manual correction workflow tables
11. create `analytics.*` including department plans
12. create `audit.*`
13. create `reconciliation.*`
14. create `system.*` including integration inbox and notification dispatch tables
15. create secondary indexes
16. seed minimal roles/permissions/settings if approved

---

## 8. What Codex must not guess

Codex must not invent during bootstrap:
- hidden finance formulas not accepted in docs
- extra order statuses not present in accepted state machine docs
- direct `1 order = 1 delivery task` shortcuts
- hard delete flows for protected entities
- CRM-side checkout / payment-link creation tables
- KPI widgets powered by runtime cross-domain joins as the source-of-truth layer
- replacing short-lived `stock_locks` with durable `reservations`

---

## 9. Deliverables expected from implementation

The first database implementation pass should produce:
- Prisma schema aligned with these PostgreSQL schemas/tables
- initial migrations
- seed scaffolding for users/roles/permissions baseline
- repository-level database commands
- smoke tests for migration up/down on local/dev database
