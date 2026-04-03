import type { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
import { Inject, Injectable } from "@nestjs/common";
import type { Observable } from "rxjs";
import type { RequestWithShellContext } from "./request-context.request";
import { RequestContextStore } from "./request-context.store";

@Injectable()
export class RequestContextPropagationInterceptor implements NestInterceptor {
  constructor(@Inject(RequestContextStore) private readonly store: RequestContextStore) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<RequestWithShellContext>();
    const shell_context = request.shellContext;
    if (!shell_context) {
      return next.handle();
    }

    return this.store.run(shell_context, () => next.handle());
  }
}
