import type { actor_types, request_context_sources } from "./request-context.contract";

export type RequestContextSource = (typeof request_context_sources)[number];
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
  // TODO: finalize tenant/workspace semantics in auth/rbac phase.
}

export interface ApiShellRequestContext {
  requestId: string;
  correlationId: string;
  idempotencyKey?: string;
  source: RequestContextSource;
  actor: ActorMetadata;
  tenantWorkspace?: TenantWorkspaceMetadata;
  receivedAt: string;
}

