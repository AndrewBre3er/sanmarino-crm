import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import { Catch, HttpException, HttpStatus } from "@nestjs/common";
import { api_app_shell_contract } from "../../contracts/app-shell.contract";
import type { RequestWithShellContext } from "../request-context/request-context.request";
import { normalize_exception } from "./api-error.mapper";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<{
      status: (code: number) => { json: (body: unknown) => void };
    }>();
    const request = context.getRequest<RequestWithShellContext>();

    const http_status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const normalized = normalize_exception(exception, http_status);
    const shell_context = request.shellContext;

    response.status(http_status).json({
      error: {
        code: normalized.code,
        message: normalized.message,
        details: normalized.details,
        requestId: shell_context?.requestId,
        correlationId: shell_context?.correlationId
      },
      meta: {
        requestId: shell_context?.requestId,
        correlationId: shell_context?.correlationId,
        timestamp: new Date().toISOString(),
        version: api_app_shell_contract.version
      }
    });
  }
}
