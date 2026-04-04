# 37. Order Flow Pre-Coding Requirements

## Status

Accepted as a mandatory documentation gate before full `Orders` and `Inventory` feature coding.

Date of approval: `2026-04-04`

---

## 1. Purpose

This document fixes additional business requirements that must be reflected in canonical docs before moving deeper into order implementation.

The goal is to prevent partial coding with missing contracts.

This document is binding for the following topics:
- installer/designer in the client model
- separate invoice document
- suppliers and supplier request flow
- exact unit-of-measure list

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

Open items that must stay `TBD` until approved:
- commission logic
- settlement logic with installer/designer
- payout workflow

---

### 3.2 Separate Invoice as a Document

A separate client invoice document must be defined as its own business artifact.

Mandatory rules:
- invoice is generated from order data snapshot
- invoice line contains `price`, `qty`, `unit`, `line total`
- invoice contains order total
- invoice does not replace payment source of truth
- payment recognition remains in `payments` + `finance` by cash basis rules

Minimum documentation requirement:
- fix invoice lifecycle and allowed commands (status catalog may be `TBD`, but command-style transitions are mandatory)
- fix invoice-to-order relation
- fix invoice fields and calculation rules

Hard constraint:
- invoice creation must not allow bypass of existing payment/refund/return invariants

---

### 3.3 Suppliers and Supplier Request

If an order item is "by supplier order", the system must form a supplier request using supplier directory data.

Mandatory rules:
- suppliers must be modeled explicitly (no ad hoc text-only supplier identity)
- supplier request must reference business source (`order` and affected items)
- supplier request must not directly mutate stock balances
- stock increase only through approved receipt flow

Minimum documentation requirement:
- fix supplier directory ownership domain
- fix supplier request entity and status process
- fix triggering rule from order flow
- fix relation with `purchase_receipt`

Open items that must stay `TBD` until approved:
- procurement approval chain
- SLA/lead-time policy
- supplier integration channel

---

### 3.4 Exact Unit-of-Measure List

The v1 canonical unit list is fixed as:
- `шт`
- `кв.м`
- `п.м`
- `услуга`

Mandatory rules:
- these units must be the only allowed v1 units for order-commercial flow
- any extension requires docs update before coding
- unit must be explicit in item-level documents and APIs where quantity/price is used

Minimum documentation requirement:
- fix enum/validation policy in API contracts
- fix physical storage representation in DB schema docs
- fix applicability matrix (`order_item`, invoice line, supplier request item, receipt item)

Open item:
- canonical internal code representation for these units (`TBD` until fixed in API/DB docs)

---

## 4. Cross-Doc Update Requirement

Before implementing these features in code, the following docs must be updated consistently:
- `03-entity-catalog.md`
- `13-database-architecture.md`
- `14-api-contracts.md`
- `17-ui-ux-architecture.md`
- `18-role-based-workspaces.md`
- `21-testing-strategy.md`
- `32-physical-database-schema.md`

If required, additional targeted docs may be added with numeric ordering.

---

## 5. Stop Rule

Feature coding for these four topics is blocked until the documentation updates are complete and internally consistent.

Blocked until docs are updated:
- installer/designer participant model implementation
- invoice entity/API implementation
- supplier directory/request implementation
- strict units enum implementation

---

## 6. Acceptance Criteria for This Gate

This gate is complete only when:
- each topic has explicit entity and relation rules in canonical docs
- API commands and validation constraints are fixed (or intentionally marked `TBD` where allowed)
- DB-level schema implications are fixed in physical schema docs
- role visibility constraints are fixed in UI/UX docs
- tests for these rules are reflected in testing strategy docs
