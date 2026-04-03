export const request_context_headers = {
  requestId: "X-Request-Id",
  correlationId: "X-Correlation-Id",
  idempotencyKey: "Idempotency-Key"
} as const;

export type RequestContextHeaderName =
  (typeof request_context_headers)[keyof typeof request_context_headers];

export const request_id_contract = {
  headerName: request_context_headers.requestId,
  maxLength: 128,
  pattern: "^[A-Za-z0-9:_-]{8,128}$",
  example: "req_01HZYQF9Q2A5S4Q9R7B5C1Q3S2"
} as const;

export const correlation_id_contract = {
  headerName: request_context_headers.correlationId,
  maxLength: 128,
  pattern: "^[A-Za-z0-9:_-]{8,128}$",
  example: "corr_01HZYQF9Q2A5S4Q9R7B5C1Q3S2"
} as const;

export const context_sources = ["api", "web", "worker", "system", "external"] as const;
export type ContextSource = (typeof context_sources)[number];

export const actor_types = ["user", "service", "system", "anonymous"] as const;
export type ActorType = (typeof actor_types)[number];

export interface ActorMetadata {
  actorType: ActorType;
  actorId?: string;
  userId?: string;
  roleCodes?: string[];
  ip?: string;
  userAgent?: string;
}

export interface TenantWorkspaceMetadata {
  tenantId?: string;
  workspaceId?: string;
  workspaceCode?: string;
  // TODO: finalize workspace scoping model when auth/rbac phase starts.
}

export interface RequestContextContract {
  requestId: string;
  correlationId?: string;
  traceId?: string;
  idempotencyKey?: string;
  source?: ContextSource;
  actor?: ActorMetadata;
  tenantWorkspace?: TenantWorkspaceMetadata;
  receivedAt?: string;
}

