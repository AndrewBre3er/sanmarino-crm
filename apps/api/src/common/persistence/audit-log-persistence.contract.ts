import type { PersistenceListResult, PersistenceRecordBase } from "./persistence-base.contract";

export interface AuditLogPersistenceRecord extends PersistenceRecordBase {
  eventId: string;
  occurredAt: string;
  action: string;
  entityType: string;
  entityId: string;
  actorUserId?: string;
  requestId?: string;
  correlationId?: string;
  payload?: unknown;
}

export interface AuditLogAppendInput {
  eventId: string;
  occurredAt: string;
  action: string;
  entityType: string;
  entityId: string;
  actorUserId?: string;
  requestId?: string;
  correlationId?: string;
  payload?: unknown;
}

export interface AuditLogListByEntityQuery {
  entityType: string;
  entityId: string;
  limit?: number;
  cursor?: string;
}

export interface AuditLogPersistenceRepositoryContract {
  append(input: AuditLogAppendInput): Promise<AuditLogPersistenceRecord>;
  listByEntity(query: AuditLogListByEntityQuery): Promise<PersistenceListResult<AuditLogPersistenceRecord>>;
}

export const audit_log_persistence_deferred_todos = {
  retentionPolicy: "TODO",
  piiMaskingPolicy: "TODO",
  archivalStrategy: "TODO"
} as const;

