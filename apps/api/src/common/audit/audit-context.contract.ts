import type { ActorMetadata, TenantWorkspaceMetadata } from "../request-context/request-context.types";

export interface ApiBoundaryAuditContext {
  requestId: string;
  correlationId: string;
  actor: ActorMetadata;
  tenantWorkspace?: TenantWorkspaceMetadata;
  // TODO: enrich with auth-backed subject identifiers after auth phase.
}

