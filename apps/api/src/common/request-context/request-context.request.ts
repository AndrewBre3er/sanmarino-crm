import type { ApiBoundaryAuditContext } from "../audit/audit-context.contract";
import type { ApiShellRequestContext } from "./request-context.types";

export interface RequestWithShellContext {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  shellContext?: ApiShellRequestContext;
  auditBoundaryContext?: ApiBoundaryAuditContext;
}

export function get_request_shell_context(
  request: RequestWithShellContext
): ApiShellRequestContext | undefined {
  return request.shellContext;
}
