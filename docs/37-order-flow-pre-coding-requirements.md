# 37. Order Flow Pre-Coding Requirements

## Status

Accepted as a mandatory documentation gate before full `Orders` and `Inventory` feature coding.

Date of update: `2026-04-05`

---

## 1. Purpose

This document fixes additional order-commercial requirements that must be reflected in canonical docs before deeper implementation.

This document is binding for:
- installer/designer participant model
- supplier directory and supplier request flow
- strict v1 unit-of-measure policy

Clarification for current v1:
- separate `Invoice` entity/API/schema is **out of scope**
- term "счёт" may be used only as a commercial presentation artifact, not as a v1 source-of-truth entity

If this file conflicts with older docs on these topics, this file wins until the changes are merged into canonical domain/API/DB docs.

---

## 2. Scope

In scope:
- domain-level requirements
- API/DB documentation requirements
- implementation stop conditions

Out of scope:
- full feature implementation
- UI styling decisions
- provider-specific integrations

---

## 3. Mandatory Additions Before Coding

### 3.1 Installer/Designer in Client Model

The CRM model must support external participants connected to the client context when a client comes via installer or designer.

Mandatory rules:
- installer/designer is not a replacement for `client` or `contact`
- participant data must be explicitly structured, not free-text only
- role type must be explicit (`installer`, `designer`)
- relation to client/deal/order context must be traceable
- critical updates must remain auditable

Minimum documentation requirement:
- fix entity placement (CRM vs another approved domain)
- fix relation model (`client`, `deal`, `order` linkage)
- fix visibility/access rules by role workspace

Open items that may stay `TBD` until approved:
- commission logic
- settlement logic with installer/designer
- payout workflow

---

### 3.2 Supplier Request Source and Receipt Linkage

If a position requires supplier coverage, the system must create supplier request lines with traceable business-source linkage.

Mandatory rules:
- suppliers must be modeled explicitly (no text-only supplier identity)
- supplier request must reference business source with canonical pair:
  - `business_source_type` = `deal` | `order`
  - `business_source_id`
- supplier request items must keep line-level traceability through:
  - `source_line_ref` (required string identifier from source context)
  - `source_line_context` (optional structured context for diagnostics/audit)
- supplier request must not directly mutate stock balances
- stock increase is allowed only through approved receipt flow

Receipt linkage rules:
- `purchase_receipt` must keep `supplier_id`
- `purchase_receipt` may keep `supplier_request_id` when receipt is linked to a request
- `purchase_receipt_item` may keep `supplier_request_item_id` for line-level linkage
- if `supplier_request_id` is set, receipt supplier must match supplier request supplier

---

### 3.3 Exact Unit-of-Measure List

The v1 canonical UOM list is fixed as:
- `шт`
- `кв.м`
- `п.м`
- `услуга`

Mandatory rules:
- this is the only allowed v1 UOM set for order-commercial flow
- unit must be explicit in item-level contracts and storage
- this list is mandatory for:
  - `order_item`
  - `supplier_request_item`
  - `purchase_receipt_item`

Canonical representation rule:
- API payload values and DB enum values use exactly these four strings
- no alternate alias map is allowed in v1

---

## 4. Cross-Doc Update Requirement

Before implementing these features in code, the following docs must be updated consistently:
- `03-entity-catalog.md`
- `13-database-architecture.md`
- `14-api-contracts.md`
- `17-ui-ux-architecture.md`
- `18-role-based-workspaces.md`
- `21-testing-strategy.md`
- `24-mvp-scope-v1.md`
- `32-physical-database-schema.md`

If required, additional targeted docs may be updated for consistency.

---

## 5. Stop Rule

Feature coding for these topics is blocked until documentation updates are complete and internally consistent.

Blocked until docs are updated:
- installer/designer participant model implementation
- supplier directory/request implementation
- strict UOM implementation in API/DB contracts
- receipt linkage implementation (`supplier_id` / `supplier_request_id` / line linkage)

Not blocked by this gate in current v1:
- separate `Invoice` entity/API/schema implementation

---

## 6. Acceptance Criteria for This Gate

This gate is complete only when:
- participant model is explicitly fixed in canonical docs
- supplier request source linkage is explicitly fixed in canonical docs
- receipt linkage with supplier/request context is explicitly fixed in canonical docs
- strict UOM list is fixed in API and DB docs without conflicting alternatives
- role visibility constraints are reflected in UI/UX docs
- testing strategy includes these contract checks
