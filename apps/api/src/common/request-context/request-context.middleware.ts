import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { HeaderBag } from "./request-context.extractor";
import { extract_audit_boundary_context, extract_request_context } from "./request-context.extractor";
import { request_context_headers } from "./request-context.contract";
import type { RequestWithShellContext } from "./request-context.request";

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(
    request: RequestWithShellContext,
    response: { setHeader: (name: string, value: string) => unknown },
    next: () => void
  ): void {
    const shell_context = extract_request_context(request.headers as HeaderBag);
    request.shellContext = {
      ...shell_context,
      actor: {
        ...shell_context.actor,
        ...(request.ip ? { ip: request.ip } : {})
      }
    };
    request.auditBoundaryContext = extract_audit_boundary_context(request.shellContext);

    response.setHeader(request_context_headers.requestId, request.shellContext.requestId);
    response.setHeader(request_context_headers.correlationId, request.shellContext.correlationId);
    if (request.shellContext.idempotencyKey) {
      response.setHeader(
        request_context_headers.idempotencyKey,
        request.shellContext.idempotencyKey
      );
    }

    next();
  }
}
