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

export interface ApiErrorTaxonomyEntry {
  defaultMessage: string;
  httpStatusHint: number;
}

export const api_error_taxonomy: Record<ApiErrorCode, ApiErrorTaxonomyEntry> = {
  VALIDATION_ERROR: {
    defaultMessage: "Validation failed",
    httpStatusHint: 422
  },
  NOT_FOUND: {
    defaultMessage: "Resource was not found",
    httpStatusHint: 404
  },
  CONFLICT: {
    defaultMessage: "Conflict with current state",
    httpStatusHint: 409
  },
  IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD: {
    defaultMessage: "Idempotency key conflicts with a different payload",
    httpStatusHint: 409
  },
  TRANSITION_NOT_ALLOWED: {
    defaultMessage: "State transition is not allowed",
    httpStatusHint: 409
  },
  INSUFFICIENT_STOCK: {
    defaultMessage: "Requested quantity is not available",
    httpStatusHint: 409
  },
  RESERVATION_NOT_ALLOWED: {
    defaultMessage: "Reservation is not allowed in current state",
    httpStatusHint: 409
  },
  PAYMENT_REFUND_REQUIRES_RETURN_REQUEST: {
    defaultMessage: "Refund requires a linked return request",
    httpStatusHint: 422
  },
  SOURCE_OF_TRUTH_VIOLATION: {
    defaultMessage: "Source-of-truth contract violation",
    httpStatusHint: 409
  },
  ACCESS_DENIED: {
    defaultMessage: "Access denied",
    httpStatusHint: 403
  }
};

export function is_api_error_code(value: unknown): value is ApiErrorCode {
  return typeof value === "string" && (api_error_codes as readonly string[]).includes(value);
}

export function map_http_status_to_error_code(http_status: number): ApiErrorCode {
  if (http_status === 404) {
    return "NOT_FOUND";
  }

  if (http_status === 401 || http_status === 403) {
    return "ACCESS_DENIED";
  }

  if (http_status === 400 || http_status === 422) {
    return "VALIDATION_ERROR";
  }

  if (http_status === 409) {
    return "CONFLICT";
  }

  if (http_status >= 500) {
    return "SOURCE_OF_TRUTH_VIOLATION";
  }

  return "CONFLICT";
}

