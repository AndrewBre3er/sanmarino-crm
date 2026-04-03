# UI/UX Sequential Guide After Confirmed Phase 9

## Status

This guide assumes the following phases are already confirmed in the repository:

- bootstrap monorepo baseline
- infra baseline
- platform contracts
- API shell + infrastructure middleware
- persistence foundation
- infra/system Prisma foundation
- domain modeling contracts
- core transactional Prisma foundation
- transactional repositories + use-case skeletons + transition guards

UI/UX work may now start, but only in a controlled sequence that does not break the current project structure.

---

## Core rule

UI must follow backend and domain structure already accepted in the repository.

UI implementation must not:

- invent new entities
- introduce business logic into frontend
- bypass role/access rules
- assume unfinished workflows are complete
- create mutation-heavy screens before confirmed use-case wiring

UI must be introduced in phases.

---

## Phase A — App shell and role-aware layout

### Goal

Create the safe UI foundation for the backoffice without binding the project to unfinished business flows.

### Scope

Allowed now:

- root app shell
- authenticated backoffice layout shell
- left navigation
- top bar / header
- workspace switch / role-aware navigation shell
- page containers
- section headers
- filter bar shells
- table/card layout primitives
- empty state / loading state / error state components
- status badge presentation primitives
- read-only page shells for confirmed entities

Not allowed now:

- real business mutations
- final form submission flows
- side-effect driven UX
- inventory reservation UI
- finance ledger UI
- analytics dashboard logic
- auth implementation details beyond shell boundaries

### Screens allowed in Phase A

Create only shell-level screens for:

- Lead list shell
- Deal list shell
- Order list shell
- Payment list shell
- Delivery task list shell
- Return request list shell
- CEO overview shell
- Finance workspace shell
- Logistics workspace shell
- Warehouse workspace shell
- Sales workspace shell

These screens may contain:

- headings
- layout zones
- tabs/filters placeholders
- table columns
- action placement skeleton
- status presentation
- permission-aware visibility notes

These screens must not contain real business actions yet unless backed by confirmed use-case wiring.

---

## Phase B — Read-only entity screens

### Goal

Render stable read-only data shapes for confirmed core entities.

### Scope

Allowed:

- list views
- detail views
- summary cards
- timeline shells
- status panels
- relation panels

Read-only screens should follow already confirmed entities and relations:

- lead
- deal
- order
- order item
- payment
- delivery task
- return request

Use current schema and contracts as source of truth.

---

## Phase C — Controlled actions for confirmed use-case skeletons

### Goal

Expose only actions that map cleanly to already confirmed transition guards and use-case skeletons.

### Candidate actions

Only after backend wiring is confirmed:

- create/update lead
- create/update deal
- create order
- add/update order item
- create/update delivery task
- register/update payment
- create/update return request
- status change actions that map to explicit transition guards

### UI rule

Every action button must map to one confirmed use-case or transition guard.
No button should exist for a capability that has no current backend contract.

---

## Phase D — Workflow and mutation UX

### Goal

After application wiring is ready, introduce:

- mutation forms
- command dialogs
- optimistic/pessimistic update strategy
- invariant violation messaging
- blocked transitions
- fulfillment mode handling (`delivery`, `pickup`, temporary `manual` restriction)

This phase should happen only after actual endpoint/application wiring exists.

---

## Role-aware implementation order

### 1. Global backoffice shell
Build first:

- app layout
- navigation
- top bar
- route grouping
- page template
- common empty/loading/error components

### 2. Sales workspace
Build next because the core transactional chain starts here:

- leads
- deals
- orders

### 3. Logistics workspace
Then:

- delivery task list shell
- delivery task detail shell
- delivery-related order presentation

### 4. Finance workspace
Then:

- payment list shell
- payment detail shell

### 5. Returns / after-sales workspace
Then:

- return request shells

### 6. CEO workspace
Then:

- overview shell
- KPI placeholders only as presentation zones, not real analytics logic

### 7. Warehouse workspace
Only after inventory foundation is actually implemented.

---

## UI integrity rules

### 1. Role separation
Each department must see its own workspace, not a universal screen for everyone.

### 2. Hidden means hidden
Do not render forbidden actions and then only disable them.
Sensitive data should be omitted from view composition when access rules require it.

### 3. Status first
For transactional entities, the UI must be driven by status and allowed transitions.

### 4. Actions follow invariants
UI must not expose transitions that violate known invariants, especially:
- pickup order must not imply delivery tasks
- delivery flow must not appear valid without delivery-task support

### 5. Read path before write path
Prefer list/detail/read-only screens before mutation flows.

### 6. One source of truth
UI naming must follow current docs/contracts/schema, not ad hoc frontend naming.

---

## Recommended immediate next step

Proceed with **UI Phase A** only:

- backoffice shell
- role-aware navigation
- workspace layouts
- shell pages for core confirmed entities
- status presentation primitives
- empty/loading/error states

Do not move to full forms or workflow UI until the next backend integration layer is confirmed.

---

## Deliverables for UI Phase A

- backoffice design tokens / UI primitives usage policy
- app shell layout
- navigation map
- role-aware workspace routing
- shell pages for sales/logistics/finance/returns/CEO
- reusable table wrapper
- reusable status badge
- reusable section header
- reusable empty/loading/error blocks

---

## Exit criteria for UI Phase A

UI Phase A is complete when:

- navigation exists
- role-aware workspace shells exist
- confirmed entities have shell pages
- no business logic has been pulled into frontend
- no speculative actions have been exposed
- frontend structure still matches accepted project architecture
