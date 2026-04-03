const declared_error_codes = [
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "CONFLICT",
  "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD",
  "TRANSITION_NOT_ALLOWED",
  "INSUFFICIENT_STOCK",
  "RESERVATION_NOT_ALLOWED",
  "PAYMENT_REFUND_REQUIRES_RETURN_REQUEST",
  "SOURCE_OF_TRUTH_VIOLATION",
  "ACCESS_DENIED"
] as const;

export const api_openapi_contract = {
  title: "Sanmarino CRM API",
  description: [
    "Bootstrap shell.",
    "",
    "Phase 3 platform contracts baseline:",
    "- shared response envelope contract",
    "- shared error taxonomy contract",
    "- shared request-context and idempotency contracts",
    "- shared event envelope and outbox record contracts",
    "",
    "TODO: add domain endpoints only in domain implementation phases."
  ].join("\n"),
  version: "0.3.0",
  docsPath: "api/docs",
  globalPrefix: "api"
} as const;

export const api_openapi_tags = {
  health: {
    name: "health",
    description: "Bootstrap health and readiness endpoints"
  }
} as const;

export const api_openapi_extensions = {
  platformContractsPackage: "@sanmarino/types",
  bootstrapPhase: "phase-3-cross-cutting-platform-contracts",
  declaredErrorCodes: declared_error_codes
} as const;
