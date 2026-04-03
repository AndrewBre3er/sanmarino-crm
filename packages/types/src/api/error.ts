export const api_error_codes = [
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "CONFLICT",
  "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD",
  "TRANSITION_NOT_ALLOWED",
  "INSUFFICIENT_STOCK",
  "RESERVATION_NOT_ALLOWED",
  "PAYMENT_REFUND_REQUIRES_RETURN_REQUEST",
  "SOURCE_OF_TRUTH_VIOLATION",
  "ACCESS_DENIED"
] as const;

export type ApiErrorCode = (typeof api_error_codes)[number];

export const api_error_categories = [
  "validation",
  "access",
  "state",
  "idempotency",
  "integrity",
  "system"
] as const;

export type ApiErrorCategory = (typeof api_error_categories)[number];

export interface ApiErrorTaxonomyEntry {
  category: ApiErrorCategory;
  defaultMessage: string;
  retryable: boolean;
  httpStatusHint: 400 | 403 | 404 | 409 | 422 | 500 | 503;
}

export const api_error_taxonomy: Record<ApiErrorCode, ApiErrorTaxonomyEntry> = {
  VALIDATION_ERROR: {
    category: "validation",
    defaultMessage: "Validation failed",
    retryable: false,
    httpStatusHint: 422
  },
  NOT_FOUND: {
    category: "integrity",
    defaultMessage: "Resource was not found",
    retryable: false,
    httpStatusHint: 404
  },
  CONFLICT: {
    category: "state",
    defaultMessage: "Conflict with current resource state",
    retryable: false,
    httpStatusHint: 409
  },
  IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD: {
    category: "idempotency",
    defaultMessage: "Idempotency key conflicts with a different payload",
    retryable: false,
    httpStatusHint: 409
  },
  TRANSITION_NOT_ALLOWED: {
    category: "state",
    defaultMessage: "State transition is not allowed",
    retryable: false,
    httpStatusHint: 409
  },
  INSUFFICIENT_STOCK: {
    category: "integrity",
    defaultMessage: "Requested quantity is not available",
    retryable: false,
    httpStatusHint: 409
  },
  RESERVATION_NOT_ALLOWED: {
    category: "state",
    defaultMessage: "Reservation is not allowed in current state",
    retryable: false,
    httpStatusHint: 409
  },
  PAYMENT_REFUND_REQUIRES_RETURN_REQUEST: {
    category: "integrity",
    defaultMessage: "Refund requires a linked return request",
    retryable: false,
    httpStatusHint: 422
  },
  SOURCE_OF_TRUTH_VIOLATION: {
    category: "integrity",
    defaultMessage: "Mutation violates source-of-truth boundaries",
    retryable: false,
    httpStatusHint: 409
  },
  ACCESS_DENIED: {
    category: "access",
    defaultMessage: "Access denied",
    retryable: false,
    httpStatusHint: 403
  }
};

export interface ApiError<TDetails = unknown> {
  code: ApiErrorCode;
  message: string;
  details?: TDetails;
  traceId?: string;
  requestId?: string;
  correlationId?: string;
}

