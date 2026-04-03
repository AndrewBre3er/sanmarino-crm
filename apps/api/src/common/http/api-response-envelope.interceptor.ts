import type { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import type { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { api_app_shell_contract } from "../../contracts/app-shell.contract";
import type { RequestWithShellContext } from "../request-context/request-context.request";

interface ResponseEnvelope {
  data?: unknown;
  error?: unknown;
  meta?: Record<string, unknown>;
}

function is_envelope(value: unknown): value is ResponseEnvelope {
  if (!value || typeof value !== "object") {
    return false;
  }

  return "data" in value || "error" in value;
}

function build_meta(request: RequestWithShellContext | undefined): Record<string, unknown> {
  return {
    requestId: request?.shellContext?.requestId,
    correlationId: request?.shellContext?.correlationId,
    timestamp: new Date().toISOString(),
    version: api_app_shell_contract.version
  };
}

export function normalize_success_response(
  value: unknown,
  request: RequestWithShellContext | undefined
): ResponseEnvelope {
  const meta = build_meta(request);

  if (is_envelope(value)) {
    return {
      ...value,
      meta: {
        ...meta,
        ...(value.meta ?? {})
      }
    };
  }

  return {
    data: value,
    meta
  };
}

@Injectable()
export class ApiResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<RequestWithShellContext>();
    return next.handle().pipe(map((value) => normalize_success_response(value, request)));
  }
}

