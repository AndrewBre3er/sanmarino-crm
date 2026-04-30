# 38. MVP v1 Functional Realignment

## Status

Umbrella doc for the revised MVP v1 functional boundary.

Purpose of this document:
- consolidate the current MVP v1 functional packs in one place
- distinguish what is already fixed vs what is still missing in canonical docs
- record user-approved additions to MVP v1 without changing other docs in this step
- provide a practical downstream sync map for later doc updates

This document:
- does not override safety, security, testing, or integrity rules from higher-priority docs
- does not by itself update API, DB, event, UI, or testing contracts
- does act as the umbrella reference for MVP v1 functional packing until downstream docs are synchronized

Priority note:
- `08-architecture-fixes-and-critical-blockers.md`, `20-security-architecture.md`, and `21-testing-strategy.md` remain mandatory guardrails
- this document refines MVP v1 functional scope and packaging, not architectural safety constraints

---

## 1. Why This Realignment Exists

Current MVP documentation already fixes a large part of the operational baseline:
- role-based workspaces
- CRM -> Deal -> Order flow
- supplier request and return request baseline
- inventory, logistics, finance, audit, and KPI foundations

At the same time, several practical MVP requirements are either:
- only partially reflected
- spread across multiple docs without one umbrella view
- approved by the user later than the current MVP scope wording

Realignment is also required because repository implementation has already moved beyond part of current task framing documents.
In particular, the repo state is already beyond the `auth skeleton` and `users/roles` baseline level still described in `docs/26-current-task-codex.md`.

This document realigns MVP v1 around practical capability packs that are needed for a usable first release.

---

## 2. Status Vocabulary

### Already included
Functionality already reflected explicitly in current accepted docs.

### Missing
Functionality not fixed explicitly enough, only partially reflected, or still inconsistent across current docs.

### Approved for MVP v1
Functionality that must be treated as part of the revised MVP v1 target.

### Deferred
Functionality explicitly kept out of MVP v1 even after this realignment.

---

## 3. User-Accepted Decisions Fixed by This Document

The following decisions are already accepted by the user and must be treated as fixed for revised MVP v1:

1. External payments for MVP v1:
   CRM does not create the payment itself.
   MVP v1 supports only intake, linkage, confirmation, control, and reconciliation of an external payment fact.

2. Product sourcing:
   one product may be linked to multiple suppliers with priority and base purchase price.

3. Purchase price visibility:
   purchase price must be hidden from `seller`, `warehouse`, and `logistics`.
   This is a field-level permission rule.

4. KPI plans:
   MVP v1 includes department plan/fact views.
   Plans are set manually by a responsible manager.

5. CRM productivity:
   MVP v1 includes follow-up, next contact date, reminders, lost reasons, communication history, and stuck deals.

6. Client card:
   MVP v1 includes address, contact, linked deals/orders, dedup + merge, and explicit installer/designer referral context.

7. Deal supply UX:
   MVP v1 includes partial coverage, deficits, ETA, and linked supplier request context.

8. Warehouse UX:
   MVP v1 includes low-stock alert, stale reservation alert, and discrepancy on receipt.

9. Logistics UX:
   MVP v1 includes slots, route day, partial delivery, and driver-money control.

10. Finance:
    MVP v1 includes supplier payables, mismatch reports, and manual corrections with approval workflow.

11. Workspace UX:
    MVP v1 includes role-specific home dashboards, saved filters, and role notifications.

12. Integrations:
    MVP v1 includes ATS + Avito inbound events and Telegram + MAX outbound notifications.

---

## 4. Capability Packs

## 4.1 Access, Security, and Workspace Shell

### Already included
- login baseline
- personal accounts
- backend-enforced access baseline
- role-based workspaces and role home pattern
- page/block/action visibility rules
- saved views / saved filters baseline in UI architecture
- role-aware notifications concept

### Missing
- explicit field-level permission contract for purchase price visibility
- explicit notification delivery contract by role and channel
- canonical distinction between workspace notification shell and outbound provider notifications

### Approved for MVP v1
- role-specific home dashboards
- saved filters
- role notifications
- explicit field-level hiding of purchase price for `seller`, `warehouse`, `logistics`

### Deferred
- full policy engine
- generic permission DSL
- generic notification designer/builder

---

## 4.2 CRM Productivity Pack

### Already included
- leads
- deals
- follow-up queue screen
- lead sources from `АТС`, site, and `Avito`
- role-home visibility for seller flow

### Missing
- canonical `next_contact_at` / equivalent next-action date contract
- reminder rules
- lost reason vocabulary and workflow
- communication history model
- explicit stuck-deal detection rules and surfacing

### Approved for MVP v1
- follow-up
- next contact date
- reminders
- lost reasons
- communication history
- stuck deals

### Deferred
- advanced marketing automation
- non-critical CRM analytics beyond MVP operational control

---

## 4.3 Client Master Card and Referral Context

### Already included
- `Client`
- `Contact`
- linked deals/orders traceability baseline
- `ClientParticipant` for installer/designer context

### Missing
- canonical client address structure for MVP card
- dedup rules
- merge workflow
- explicit installer/designer referral presentation in client card and related CRM views

### Approved for MVP v1
- address
- contact
- linked deals/orders
- dedup + merge
- explicit installer/designer referral context

### Deferred
- commission logic for installer/designer
- payout workflow for installer/designer
- settlement engine around referrals

---

## 4.4 Deal Supply and Order Materialization Pack

### Already included
- `Deal -> coverage -> auto-created Order`
- supplier request baseline
- partial reserve / full reserve readiness baseline
- supplier coverage context in seller workflow

### Missing
- explicit partial coverage UX contract
- explicit deficit presentation rules
- ETA presentation rules in deal/order supply context
- mandatory linked supplier request block in deal commercial workflow

### Approved for MVP v1
- partial coverage
- deficits
- ETA
- linked supplier request in deal supply UX

### Deferred
- separate `Invoice` entity/API/schema
- non-canonical alternative order creation flow outside deal-based path

---

## 4.5 Product Catalog and Supplier Sourcing Pack

### Already included
- `Product`
- `Supplier`
- `SupplierRequest`
- supplier request source linkage
- purchase receipt linkage
- strict v1 UOM baseline

### Missing
- explicit product-to-supplier relation
- supplier priority model
- base purchase price field
- visibility rule for purchase price across roles

### Approved for MVP v1
- product -> multiple suppliers
- supplier priority
- base purchase price
- purchase price as sensitive field hidden from `seller`, `warehouse`, `logistics`

### Deferred
- supplier portal
- full purchasing automation
- provider-side supplier collaboration platform

---

## 4.6 Warehouse Operations and Inventory Alerts Pack

### Already included
- stock balances
- reservations
- receipts
- discrepancy handling baseline
- low stock visibility in warehouse KPI/home context
- stale reservations visibility in KPI context

### Missing
- explicit low-stock operational alert contract
- explicit stale reservation alert workflow
- explicit discrepancy resolution UX flow after receipt mismatch

### Approved for MVP v1
- low-stock alert
- stale reservation alert
- discrepancy on receipt

### Deferred
- inventory optimization engine
- advanced warehouse planning beyond operational MVP

---

## 4.7 External Payments Intake and Money-Control Pack

### Already included
- `Payment` as money fact domain
- cash-basis recognition
- `OnControl` / `Problem` overlays
- driver-money control as a management concern
- finance and reconciliation baseline around money facts

### Missing
- canonical external-payment intake flow
- explicit statement that CRM does not initiate payment creation in MVP v1
- explicit linking/matching model for incoming external payment fact
- control workflow for unresolved external money fact

### Approved for MVP v1
- intake of external payment fact
- linkage of payment fact to order/deal context
- confirmation/control of external payment fact
- no CRM-side creation of the payment itself

### Deferred
- payment gateway/acquiring initiation from CRM
- embedded checkout flow
- provider-side payment orchestration

---

## 4.8 Logistics and Driver-Money Control Pack

### Already included
- delivery slots
- route day
- delivery task
- partial delivery baseline
- driver workspace baseline
- money-on-control / problem-order concepts

### Missing
- explicit driver-money control workflow across logistics and finance
- explicit aging/escalation contract for unconfirmed driver-held money
- explicit role transitions and checkpoints for this control loop

### Approved for MVP v1
- slots
- route day
- partial delivery
- driver-money control

### Deferred
- route optimization
- advanced dispatch automation
- non-essential fleet intelligence features

---

## 4.9 Finance Control, Corrections, and Reconciliation Pack

### Already included
- supplier payables
- reconciliation baseline
- mismatch reporting baseline
- finance read/reporting baseline

### Missing
- manual correction entity/workflow contract
- approval workflow for corrections
- explicit audit constraints for corrections

### Approved for MVP v1
- supplier payables
- mismatch reports
- manual corrections with approval workflow

### Deferred
- full ledger/postings engine
- accounting-grade double-entry subsystem

---

## 4.10 Returns and Post-Sale Control Pack

### Already included
- `ReturnRequest` as mandatory entry point
- status flow
- quarantine flow
- CEO approval after 14-day threshold
- read visibility baseline for all roles

### Missing
- no additional functional realignment item is introduced in this document

### Approved for MVP v1
- keep current return flow baseline unchanged

### Deferred
- direct refund bypass
- alternative return entry paths outside `ReturnRequest`

---

## 4.11 KPI, Department Plans, and Management Dashboards Pack

### Already included
- live KPI baseline
- snapshot KPI baseline
- sales / finance / logistics / warehouse / executive KPI
- supplier payables, problem orders, and driver-money metrics

### Missing
- department plan entity/model
- plan ownership rules
- manual manager-set plan workflow
- clear contract separating manually entered plan values from system-derived facts

### Approved for MVP v1
- department plan/fact
- plans set manually by manager
- facts remain system-derived from accepted source-of-truth domains

### Deferred
- advanced BI layer
- non-critical dashboards
- analytics facts platform beyond MVP reporting layer

---

## 4.12 Workspace UX and Daily-Use Productivity Pack

### Already included
- role-specific home dashboards
- workspace-specific sidebars
- notifications center shell
- pinned filters / saved views baseline

### Missing
- explicit per-role notification pack definitions by event severity and delivery channel
- explicit saved-filter persistence rules
- explicit workspace-level default dashboard composition per role after realignment

### Approved for MVP v1
- role-specific home dashboards
- saved filters
- role notifications

### Deferred
- fully customizable dashboard builder
- arbitrary widget composer

---

## 4.13 Integrations and Messaging Pack

### Already included
- `АТС` inbound lead source
- site inbound lead source
- `Avito` inbound lead source
- notifications as part of app shell and role UX concept

### Missing
- explicit ATS inbound event contract
- explicit Avito inbound event contract
- explicit outbound Telegram notification contract
- explicit outbound MAX notification contract
- routing rules for which events stay in-app vs go outbound

### Approved for MVP v1
- ATS + Avito inbound events
- Telegram + MAX outbound notifications

### Deferred
- generic integration marketplace
- broad external automation framework
- non-essential external channels outside accepted MVP list

---

## 4.14 Audit, Admin, and Governance Pack

### Already included
- audit baseline
- admin users/roles/permissions baseline
- soft delete governance
- reconciliation baseline

### Missing
- explicit approval routing for finance manual corrections
- explicit governance linkage between correction workflow and audit events

### Approved for MVP v1
- keep current admin/audit baseline
- extend it only where needed to support approved correction workflow

### Deferred
- broad governance platform outside concrete MVP actions

---

## 5. Conflict List and Canonical Gaps

This section records the main places where current canonical docs are incomplete or inconsistent relative to the revised MVP v1 boundary.

### 5.1 Current task document drift vs repo state
`docs/26-current-task-codex.md` is behind the factual repository state.
The repo has already moved beyond `auth skeleton` and `users/roles` baseline milestones, while `docs/26` still frames them as upcoming first steps.

### 5.2 Security auth-model inconsistency
`docs/20-security-architecture.md` still keeps auth model as `TBD`.
At the same time, accepted baseline is already fixed in:
- `docs/23-tech-baseline-and-decision-log.md`
- `docs/28-approved-tech-stack.md`

### 5.3 Payments model conflict
Current MVP/API wording still assumes CRM-side payment creation and completion flow.
Revised MVP v1 fixes a narrower rule:
- payment fact is external
- CRM intakes, links, confirms, controls, and reconciles that fact
- CRM does not create the payment itself

### 5.4 Product-supplier model gap
Current docs model `Supplier` and `SupplierRequest`, but do not yet fix:
- multiple suppliers per product
- supplier priority
- base purchase price at sourcing layer

### 5.5 Purchase price visibility gap
Current docs hide cost/margin in several places, but do not yet fix one explicit field-level rule:
- purchase price is hidden from `seller`, `warehouse`, and `logistics`

### 5.6 KPI plan/fact gap
Current KPI docs correctly insist that KPI facts come from facts, not arbitrary manual input.
Revised MVP v1 adds:
- manual manager-entered plans
- system-derived facts

This is not a reason to weaken fact discipline.
It requires explicit separation of:
- manual plan source
- factual system source

### 5.7 CRM productivity gap
Current docs reflect follow-up queue and seller workflow, but do not yet canonically fix:
- next contact date
- reminders
- lost reasons
- communication history
- stuck-deal control

### 5.8 Client master-data gap
Current docs reflect client/contact/participant baseline, but do not yet canonically fix:
- address structure on client card
- dedup + merge
- explicit referral presentation for installer/designer context

### 5.9 Deal supply UX gap
Current docs reflect supplier coverage and order materialization baseline, but do not yet canonically fix:
- partial coverage UX
- deficit visibility
- ETA visibility
- linked supplier request block as a required commercial UX element

### 5.10 Warehouse alert gap
Current docs mention low stock, stale reservations, and discrepancy in different places, but do not yet fix one coherent operational alert contract for them.

### 5.11 Logistics driver-money control gap
Current docs reflect driver money as KPI/control context, but do not yet fix a clear cross-role workflow for:
- driver-held money
- aging
- finance confirmation
- escalation

### 5.12 Finance correction gap
Current docs reflect reconciliation and mismatch reporting, but do not yet fix:
- manual correction lifecycle
- approval workflow
- audit contract for corrections

### 5.13 Integration contract gap
Current docs reflect inbound lead sources and notification concepts, but do not yet fix:
- ATS inbound contract
- Avito inbound contract
- Telegram outbound contract
- MAX outbound contract

---

## 6. Delta-Stage Proposal for Downstream Doc Sync

This section does not change other docs now.
It proposes a practical order for the next documentation alignment wave.

### Delta 0 — MVP v1 Realignment Gate
Gate objective:
- accept this document as umbrella scope for revised MVP v1
- explicitly acknowledge and track canonical drift listed in Section 5
- prevent silent continuation of implementation against outdated task framing
- define the sync backlog for downstream source docs

Gate output:
- one agreed sync sequence for capability-pack updates
- no change of functional decisions already fixed in this document

### Delta 0 / Wave A. Money and Sourcing Realignment
Focus:
- external payment intake/control model
- product -> multiple suppliers
- supplier priority
- base purchase price
- purchase price field visibility
- finance manual corrections with approval workflow

Primary downstream docs likely affected later:
- `24-mvp-scope-v1.md`
- `14-api-contracts.md`
- `32-physical-database-schema.md`
- `20-security-architecture.md`
- `21-testing-strategy.md`

### Delta 0 / Wave B. CRM and Client Productivity Realignment
Focus:
- next contact date
- reminders
- lost reasons
- communication history
- stuck deals
- client card address
- dedup + merge
- explicit referral context

Primary downstream docs likely affected later:
- `03-entity-catalog.md`
- `17-ui-ux-architecture.md`
- `18-role-based-workspaces.md`
- `19-screen-map-and-core-user-flows.md`
- `21-testing-strategy.md`

### Delta 0 / Wave C. Deal Supply, Warehouse, and Logistics UX Realignment
Focus:
- partial coverage
- deficits
- ETA
- linked supplier request UX
- low-stock alert
- stale reservation alert
- discrepancy on receipt
- driver-money control workflow

Primary downstream docs likely affected later:
- `14-api-contracts.md`
- `17-ui-ux-architecture.md`
- `18-role-based-workspaces.md`
- `19-screen-map-and-core-user-flows.md`
- `21-testing-strategy.md`
- `32-physical-database-schema.md`

### Delta 0 / Wave D. KPI, Workspace, and Integration Realignment
Focus:
- department plan/fact
- manager-entered plans
- role notifications
- workspace dashboard composition
- ATS + Avito inbound events
- Telegram + MAX outbound notifications

Primary downstream docs likely affected later:
- `09-kpi-model.md`
- `15-event-model.md`
- `17-ui-ux-architecture.md`
- `18-role-based-workspaces.md`
- `19-screen-map-and-core-user-flows.md`
- `24-mvp-scope-v1.md`

---

## 7. Anti-Scope for Revised MVP v1

Even after this realignment, the following remain outside MVP v1:

- CRM-side creation of the payment itself
- embedded checkout/acquiring orchestration
- full supplier portal
- full purchasing automation
- route optimization
- advanced dispatch automation
- advanced BI platform
- finance ledger/postings engine
- generic integration marketplace
- dashboard builder / widget composer
- installer/designer commission and payout workflow
- any weakening of backend-enforced security, state machine, idempotency, quarantine, or cash-basis rules

---

## 8. Practical Rule for Next Steps

Until downstream docs are synchronized:
- treat this document as the umbrella reference for revised MVP v1 functionality
- do not use it to weaken higher-priority architectural or security constraints
- do not treat missing items here as permission to invent technical contracts in code

Implementation should follow only after the affected source docs are updated consistently.
