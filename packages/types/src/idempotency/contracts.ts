export type IdempotencyStatus = "started" | "completed" | "failed";

export type IdempotencyResultKind = "created" | "replayed" | "in_progress" | "conflict";

export const idempotency_header_name = "Idempotency-Key" as const;

export const idempotency_key_contract = {
  headerName: idempotency_header_name,
  minLength: 8,
  maxLength: 128,
  pattern: "^[A-Za-z0-9:_-]{8,128}$",
  example: "payment:create:01HZYQF9Q2A5S4Q9R7B5C1Q3S2"
} as const;

export interface IdempotencyRecordContract<TResponse = unknown> {
  id: string;
  idempotencyKey: string;
  scope: string;
  requestHash: string;
  status: IdempotencyStatus;
  responseStatusCode?: number;
  responseBody?: TResponse;
  lockedUntil?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IdempotencyResultContract<TResponse = unknown> {
  kind: IdempotencyResultKind;
  status: IdempotencyStatus;
  responseStatusCode?: number;
  responseBody?: TResponse;
  record?: IdempotencyRecordContract<TResponse>;
  conflictCode?: "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD";
}

