# 36. Domain Modeling Contracts (Pre-Business Schema)

## Status

Accepted for pre-business-schema foundation.

This file defines contract-level domain modeling rules before full business Prisma schema implementation.

## Scope

In scope:
- module boundaries
- naming conventions
- identity conventions
- status enum strategy
- cross-domain relation rules
- event naming/versioning rules
- optimistic concurrency field rules
- soft-delete applicability matrix
- API resource naming conventions

Out of scope:
- business tables
- business Prisma models
- business migrations
- domain repositories and services
- domain endpoints

## 1. Domain Module Boundaries

Canonical module set:
- `crm`
- `orders`
- `inventory`
- `payments`
- `logistics`
- `finance`
- `analytics`
- `users`
- `audit`
- `reconciliation`
- `system`

Rules:
- source-of-truth ownership is explicit per module
- no hidden cross-module authority overrides
- cross-domain references are explicit and traceable

Naming note:
- `kpi` remains a product label, while canonical technical module naming uses `analytics`

## 2. Entity ID and Identity Rules

Conventions:
- API IDs are opaque strings
- canonical format is `<entity_prefix>_<opaque_token>`
- token format remains implementation-agnostic and must not leak storage internals
- relation fields use explicit `...Id` naming

## 3. Status/State Enum Strategy

Rules:
- enum values use snake_case string form
- status transitions are command-based and state-machine validated
- free-form status patching is prohibited for stateful aggregates
- admin override stays explicit and audited

## 4. Cross-Domain Relation and Aggregate Rules

Rules:
- aggregate boundaries are explicit
- canonical `deal -> order` relation remains `1:N`
- canonical `order -> delivery_task` relation remains `1:N`
- return flow starts from `return_request`
- cross-domain facts must reference source-of-truth aggregate

## 5. Domain Event Naming and Versioning

Rules:
- event names follow `<aggregate>.<fact>`
- event version starts from `1`
- non-breaking changes may add optional fields
- breaking changes require version increment

## 6. Optimistic Concurrency Rules

Rules:
- version placeholder field name is `version`
- mutable aggregates use version increment strategy when introduced
- conflicts must resolve via explicit conflict response policy

## 7. Soft-Delete Applicability Matrix

Required (when entities are introduced):
- `crm.deal`
- `orders.order`
- `payments.payment`
- `orders.return_request`

Optional/system-level:
- infra/system records may support soft-delete markers per retention and audit policy

Rules:
- required entities cannot use physical delete in application flows
- deleted records remain visible for audit/reconciliation contexts

## 8. API Resource Naming Conventions

Rules:
- collection resource naming uses kebab-case plural
- command transitions use `POST /resources/{id}/{command}`
- state transitions must stay command-based

## 9. Deferred Items

TODO:
- full per-entity status catalogs
- full relation catalog with all entities
- complete version conflict retry policy
- full API version prefix policy
- full ID generation strategy governance

