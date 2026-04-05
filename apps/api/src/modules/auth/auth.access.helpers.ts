import { UnauthorizedException } from "@nestjs/common";
import type { AuthPrincipal, AuthSessionView } from "./auth.contract";

export interface AuthenticatedRequestAccess {
  user: AuthPrincipal;
  session: AuthSessionView;
}

export interface AuthenticatedRequestLike {
  auth?: AuthenticatedRequestAccess;
}

export function get_authenticated_access(request: AuthenticatedRequestLike): AuthenticatedRequestAccess {
  if (!request.auth) {
    throw new UnauthorizedException({
      code: "ACCESS_DENIED",
      message: "Authentication context is missing"
    });
  }

  return request.auth;
}
