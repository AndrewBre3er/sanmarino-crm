import type { ActorMetadata } from "../api/context.js";

export interface AuditEntityRef {
  entityType: string;
  entityId: string;
}

export interface AuditRequestRef {
  requestId?: string;
  correlationId?: string;
  traceId?: string;
}

export interface AuditChangeSet {
  before?: unknown;
  after?: unknown;
  changedFields?: string[];
}

export interface AuditMetadataContract {
  eventId: string;
  occurredAt: string;
  action: string;
  entity: AuditEntityRef;
  actor?: ActorMetadata;
  request?: AuditRequestRef;
  reason?: string;
  change?: AuditChangeSet;
  tags?: string[];
}
