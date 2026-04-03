export interface EventMeta {
  schemaVersion?: string;
  tenantId?: string;
  actorUserId?: string;
  traceId?: string;
  sourceRequestId?: string;
}

export interface EventEnvelope<TPayload = Record<string, unknown>> {
  eventId: string;
  eventType: string;
  eventVersion: number;
  occurredAt: string;
  producer: string;
  entityType: string;
  entityId: string;
  correlationId?: string;
  causationId?: string;
  idempotencyKey?: string;
  payload: TPayload;
  meta?: EventMeta;
}

