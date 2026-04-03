import { api_error_codes } from "../common/errors/api-error.contract";
import { request_context_headers } from "../common/request-context/request-context.contract";

export const api_openapi_contract = {
  title: "Sanmarino CRM API",
  description: [
    "Bootstrap shell.",
    "",
    "Phase 4 infrastructure middleware baseline:",
    "- request/correlation/idempotency/audit-boundary context extraction",
    "- normalized response envelope and exception mapping",
    "- validation/serialization shell conventions",
    "",
    "TODO: add domain endpoints only in domain implementation phases."
  ].join("\n"),
  version: "0.4.0",
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
  }
} as const;

export const api_openapi_extensions = {
  platformContractsPackage: "@sanmarino/types",
  bootstrapPhase: "phase-4-api-shell-infra-middleware-foundation",
  declaredErrorCodes: api_error_codes,
  requestContextHeaders: request_context_headers,
  idempotencyHeaderContract: {
    header: request_context_headers.idempotencyKey,
    persistence: "TODO",
    enforcement: "TODO"
  },
  auditBoundaryNote:
    "Audit context is extracted at API boundary only. Business audit implementation is deferred."
} as const;
