import { api_error_codes } from "../common/errors/api-error.contract";
import { request_context_headers } from "../common/request-context/request-context.contract";
import { payments_finance_command_contract } from "./payments-finance.contract";

export const api_openapi_contract = {
  title: "Sanmarino CRM API",
  description: [
    "Bootstrap shell.",
    "",
    "Phase 12 supply/inventory contract freeze baseline:",
    "- request/correlation/idempotency/audit-boundary API shell conventions",
    "- normalized response envelope and exception mapping",
    "- read-only list/detail endpoints for core transactional entities",
    "- custom auth skeleton endpoints with httpOnly cookies and refresh token rotation baseline",
    "- supply/inventory domain contract freeze for statuses, entities, and schema foundation",
    "- pagination/filter/sort query contracts aligned with shared platform types",
    "",
    "Phase 14 payments+finance contract freeze baseline:",
    "- command-style payment surface: POST /payments, POST /payments/:paymentId/complete, POST /payments/:paymentId/refunds",
    "- refund requires ReturnRequest linkage",
    "- income recognition source is payment.completed only",
    "",
    "TODO: payment/finance command handlers and use-case implementation remain deferred."
  ].join("\n"),
  version: "0.13.0",
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
    description:
      "Read-only CRM endpoints: deals (clients/contacts/client-participants remain implementation-deferred)"
  },
  crmLeads: {
    name: "crm-leads",
    description:
      "Lead baseline endpoints: list/detail/create/status-transition with backend state-machine and role-aware access baseline"
  },
  crmRelations: {
    name: "crm-relations",
    description:
      "Client/Contact/ClientParticipant baseline endpoints with safe CRM linkage and technical participant role validation"
  },
  ordersRead: {
    name: "orders-read",
    description: "Orders endpoints: list/detail and baseline command transitions for status/control overlays"
  },
  fulfillments: {
    name: "fulfillments",
    description: "Fulfillment baseline endpoints: list/detail/create without full logistics engine"
  },
  paymentsRead: {
    name: "payments-read",
    description: "Payments read + command contract surface (implementation deferred)"
  },
  logisticsRead: {
    name: "logistics-read",
    description: "Read-only Logistics endpoints: delivery tasks"
  },
  returnsRead: {
    name: "returns-read",
    description: "Read-only return request endpoints"
  },
  supply: {
    name: "supply",
    description:
      "Supply baseline endpoints: suppliers and supplier-requests list/detail/create with Seller create access for supplier requests"
  },
  auth: {
    name: "auth",
    description: "Authentication skeleton endpoints: login, refresh, logout, me"
  }
} as const;

export const api_openapi_extensions = {
  platformContractsPackage: "@sanmarino/types",
  bootstrapPhase: "phase-14-payments-finance-contract-freeze",
  declaredErrorCodes: api_error_codes,
  requestContextHeaders: request_context_headers,
  idempotencyHeaderContract: {
    header: request_context_headers.idempotencyKey,
    persistence: "TODO",
    enforcement: "TODO"
  },
  auditBoundaryNote:
    "Audit context is extracted at API boundary only. Business audit implementation is deferred.",
  paymentsCommandSurface: payments_finance_command_contract,
  readBoundaryNote:
    "Read-side endpoints are enabled for core transactional entities. CRM/Orders/Supply contract freezes and Payments Step 1 command contracts are fixed; business workflows remain TODO."
} as const;
