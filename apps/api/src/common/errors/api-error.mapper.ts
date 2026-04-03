import { HttpException } from "@nestjs/common";
import {
  api_error_taxonomy,
  is_api_error_code,
  map_http_status_to_error_code,
  type ApiErrorCode
} from "./api-error.contract";

export interface NormalizedApiError {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
}

function normalize_http_exception_payload(payload: unknown): {
  code?: ApiErrorCode;
  message?: string;
  details?: unknown;
} {
  if (typeof payload === "string") {
    return { message: payload };
  }

  if (!payload || typeof payload !== "object") {
    return {};
  }

  const record = payload as Record<string, unknown>;
  const code = is_api_error_code(record.code) ? record.code : undefined;
  const message =
    typeof record.message === "string"
      ? record.message
      : Array.isArray(record.message)
        ? record.message.join("; ")
        : undefined;

  const details: Record<string, unknown> = {};
  for (const key of Object.keys(record)) {
    if (key === "code" || key === "message") {
      continue;
    }
    details[key] = record[key];
  }

  return {
    ...(code ? { code } : {}),
    ...(message ? { message } : {}),
    ...(Object.keys(details).length > 0 ? { details } : {})
  };
}

export function normalize_exception(exception: unknown, http_status: number): NormalizedApiError {
  if (exception instanceof HttpException) {
    const payload = normalize_http_exception_payload(exception.getResponse());
    const code = payload.code ?? map_http_status_to_error_code(http_status);
    return {
      code,
      message: payload.message ?? api_error_taxonomy[code].defaultMessage,
      ...(payload.details ? { details: payload.details } : {})
    };
  }

  const code = map_http_status_to_error_code(http_status);
  return {
    code,
    message: api_error_taxonomy[code].defaultMessage
  };
}
