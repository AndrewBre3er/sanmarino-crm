import type { EventEnvelope } from "./envelope.js";

export type OutboxStatus = "pending" | "processing" | "processed" | "failed" | "dead_letter";

export interface OutboxRecordContract<TPayload = Record<string, unknown>> {
  id: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: TPayload;
  status: OutboxStatus;
  attemptCount: number;
  nextAttemptAt?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  processedAt?: string | null;
}

export interface OutboxDispatchBatchContract<TPayload = Record<string, unknown>> {
  batchId: string;
  pickedAt: string;
  records: OutboxRecordContract<TPayload>[];
}

export interface OutboxDispatchResultContract {
  outboxId: string;
  status: "processed" | "failed" | "deferred";
  processedAt?: string;
  errorMessage?: string;
}

export interface OutboxEventProjection<TPayload = Record<string, unknown>> {
  outboxId?: string;
  envelope: EventEnvelope<TPayload>;
}
