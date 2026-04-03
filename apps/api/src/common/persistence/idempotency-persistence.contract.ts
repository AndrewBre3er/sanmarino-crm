import type { PersistenceRecordBase } from "./persistence-base.contract";

export const idempotency_statuses = ["started", "completed", "failed"] as const;

export type IdempotencyStatus = (typeof idempotency_statuses)[number];

export interface IdempotencyPersistenceRecord extends PersistenceRecordBase {
  idempotencyKey: string;
  scope: string;
  requestHash: string;
  status: IdempotencyStatus;
  responseStatusCode?: number;
  responseBody?: unknown;
  lockedUntil?: string | null;
}

export interface IdempotencyCreateStartedInput {
  idempotencyKey: string;
  scope: string;
  requestHash: string;
  lockedUntil?: string;
}

export interface IdempotencyMarkCompletedInput {
  statusCode: number;
  responseBody?: unknown;
}

export interface IdempotencyPersistenceRepositoryContract {
  findByScopeAndKey(scope: string, idempotencyKey: string): Promise<IdempotencyPersistenceRecord | null>;
  createStarted(input: IdempotencyCreateStartedInput): Promise<IdempotencyPersistenceRecord>;
  markCompleted(
    recordId: string,
    input: IdempotencyMarkCompletedInput
  ): Promise<IdempotencyPersistenceRecord>;
  markFailed(recordId: string, errorPayload?: unknown): Promise<IdempotencyPersistenceRecord>;
}

export const idempotency_persistence_deferred_todos = {
  uniqueScopeKeyConstraint: "TODO",
  retryCoordinationPolicy: "TODO",
  recordTtlPolicy: "TODO"
} as const;

