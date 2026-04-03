export const request_context_headers = {
  requestId: "X-Request-Id",
  correlationId: "X-Correlation-Id",
  idempotencyKey: "Idempotency-Key",
  actorType: "X-Actor-Type",
  actorId: "X-Actor-Id",
  actorUserId: "X-Actor-User-Id",
  actorRoles: "X-Actor-Roles",
  tenantId: "X-Tenant-Id",
  workspaceId: "X-Workspace-Id",
  workspaceCode: "X-Workspace-Code"
} as const;

export const request_id_pattern = /^[A-Za-z0-9:_-]{8,128}$/;
export const correlation_id_pattern = /^[A-Za-z0-9:_-]{8,128}$/;
export const idempotency_key_pattern = /^[A-Za-z0-9:_-]{8,128}$/;

export const request_context_sources = [
  "api",
  "web",
  "worker",
  "system",
  "external"
] as const;

export const actor_types = ["user", "service", "system", "anonymous"] as const;

