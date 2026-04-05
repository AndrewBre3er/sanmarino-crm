import { api_error_codes } from "../common/errors/api-error.contract";
import { request_context_headers } from "../common/request-context/request-context.contract";

export const api_openapi_contract = {
  title: "Sanmarino CRM API",
  description: [
    "Bootstrap shell.",
    "",
    "Phase 10 read-side + auth skeleton baseline:",
    "- request/correlation/idempotency/audit-boundary API shell conventions",
    "- normalized response envelope and exception mapping",
    "- read-only list/detail endpoints for core transactional entities",
    "- custom auth skeleton endpoints with httpOnly cookies and refresh token rotation baseline",
    "- pagination/filter/sort query contracts aligned with shared platform types",
    "",
    "TODO: users domain, full RBAC/field-level enforcement, and MFA implementation are deferred."
  ].join("\n"),
  version: "0.11.0",
  docsPath: "api/docs",
  globalPrefix: "api"
} as const;

export const api_openapi_tags = {
  health: {
    name: "health",
    description: "Bootstrap health and readiness endpoints"
  },
  infra: {
    name: "infra",
    description: "API shell infrastructure conventions"
  },
  crmRead: {
    name: "crm-read",
    description: "Read-only CRM endpoints: leads and deals"
  },
  ordersRead: {
    name: "orders-read",
    description: "Read-only Orders endpoints"
  },
  paymentsRead: {
    name: "payments-read",
    description: "Read-only Payments endpoints"
  },
  logisticsRead: {
    name: "logistics-read",
    description: "Read-only Logistics endpoints: delivery tasks"
  },
  returnsRead: {
    name: "returns-read",
    description: "Read-only return request endpoints"
  },
  auth: {
    name: "auth",
    description: "Authentication skeleton endpoints: login, refresh, logout, me"
  }
} as const;

export const api_openapi_extensions = {
  platformContractsPackage: "@sanmarino/types",
  bootstrapPhase: "phase-11-api-auth-skeleton",
  declaredErrorCodes: api_error_codes,
  requestContextHeaders: request_context_headers,
  idempotencyHeaderContract: {
    header: request_context_headers.idempotencyKey,
    persistence: "TODO",
    enforcement: "TODO"
  },
  auditBoundaryNote:
    "Audit context is extracted at API boundary only. Business audit implementation is deferred.",
  readBoundaryNote:
    "Read-side endpoints are enabled for core transactional entities. Mutation/business workflows remain TODO."
} as const;
