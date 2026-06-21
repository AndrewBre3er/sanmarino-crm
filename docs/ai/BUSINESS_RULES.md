# Business Rules Brief

This file summarizes canonical business rules for fast orientation.
It is not a replacement for `AGENTS.md` or accepted `docs/*.md`.

## Sources Of Truth

- CRM: `Lead`, `Client`, `Contact`, `Deal`
- Orders: `Order`, `OrderItem`, operational order status
- Inventory: stock balances, reservations, movements, average cost
- Payments: payments and money refunds
- Logistics: slots, pickup windows, delivery tasks, delivery facts
- Finance: cash-basis revenue, expenses, cost categories
- KPI: derived layer only, not a source of truth

## Canonical Flow

Commercial and operational flow:
- `Lead -> Deal -> Order(s) -> Fulfillment(s)`

Order and delivery relation:
- `Order -> DeliveryTask = 1:N`
- `PartiallyDelivered` is mandatory
- order delivery status is aggregated from delivery tasks

## Money Rules

- Revenue is recognized by cash basis only.
- Payment is a parallel process.
- Payment can happen before, during, or after fulfillment.
- Order status or shipment does not recognize revenue.
- CRM does not create payment/checkout in revised MVP v1.
- MVP v1 supports intake, control, confirmation, and reconciliation of external payment facts.

## Inventory Rules

- Goods issue happens only by confirmed fulfillment fact.
- Order confirmation does not issue goods.
- Draft-stage durable reservation is forbidden.
- Draft can use only short-lived soft locks / pre-reserve with TTL.
- Returned goods go to quarantine by default.
- Returned goods do not go directly back to available stock.

## Return Rules

- Money refund without `ReturnRequest` is forbidden.
- Goods return without `ReturnRequest` is forbidden.
- `ReturnRequest` lifecycle: `created -> confirmed -> processed -> closed`.
- `ReturnRequestItem` is required for item-level return composition.
- 14-day CEO approval anchor: `realizationAnchorAt = MIN(orders.fulfillments.fulfilled_at)` over returned items through fulfillment item linkage.
- `orders.shipped_at` and `orders.partially_shipped_at` are not canonical anchors for the 14-day return rule.

## Integrity Rules

- Critical mutations require idempotency.
- State machines are mandatory.
- Admin override requires audit.
- Cross-domain mutations must be atomic or compensatable.
- Protected entities use soft delete, not physical delete.
- KPI must never become a transactional source of truth.

## Visibility Rules

- Purchase/base cost data is sensitive.
- `base_purchase_price` is hidden from `seller`, `warehouse`, and `logistics`.
- Role dashboards, saved filters, and notifications must use the same permission boundaries as cards and actions.

