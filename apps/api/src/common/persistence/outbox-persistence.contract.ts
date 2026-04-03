import type { PersistenceRecordBase } from "./persistence-base.contract";

export const outbox_statuses = [
  "pending",
  "processing",
  "processed",
  "failed",
  "dead_letter"
] as const;

export type OutboxStatus = (typeof outbox_statuses)[number];

export interface OutboxPersistenceRecord extends PersistenceRecordBase {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: unknown;
  status: OutboxStatus;
  attemptCount: number;
  nextAttemptAt?: string | null;
  errorMessage?: string | null;
  processedAt?: string | null;
}

export interface OutboxEnqueueInput {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: unknown;
}

export interface OutboxPickOptions {
  limit: number;
  nowIso?: string;
}

export interface OutboxPersistenceRepositoryContract {
  enqueue(input: OutboxEnqueueInput): Promise<OutboxPersistenceRecord>;
  pickPendingBatch(options: OutboxPickOptions): Promise<OutboxPersistenceRecord[]>;
  markProcessed(recordId: string, processedAtIso?: string): Promise<OutboxPersistenceRecord>;
  markFailed(recordId: string, errorMessage?: string): Promise<OutboxPersistenceRecord>;
}

export const outbox_persistence_deferred_todos = {
  pollingStrategy: "TODO",
  deadLetterPolicy: "TODO",
  publisherDeliveryGuarantees: "TODO"
} as const;

