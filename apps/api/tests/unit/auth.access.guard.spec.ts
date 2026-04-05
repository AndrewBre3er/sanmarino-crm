import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";
import {
  type AuthAccessRequirements
} from "../../src/modules/auth/auth.access.contract";
import type { AuthRoleCode } from "../../src/modules/auth/auth.contract";
import { AuthAccessGuard } from "../../src/modules/auth/auth.access.guard";
import type { AuthService } from "../../src/modules/auth/auth.service";

function make_execution_context(cookieHeader?: string): ExecutionContext {
  const request = {
    headers: cookieHeader ? { cookie: cookieHeader } : {}
  };

  return {
    getType: () => "http",
    switchToHttp: () => ({
      getRequest: () => request
    }),
    getHandler: () => function handler() {},
    getClass: () => class Controller {}
  } as unknown as ExecutionContext;
}

function make_user(roleCodes: AuthRoleCode[], permissionCodes: string[] = []) {
  const primaryRole = roleCodes[0]!;
  return {
    userId: "user-1",
    email: "admin.bootstrap@local",
    login: "admin.bootstrap@local",
    displayName: "Admin",
    primaryRole,
    roleCodes,
    allowedWorkspaces: roleCodes,
    permissionCodes,
    roleCode: primaryRole,
    optionalRole: false
  };
}

function make_guard(
  requirements: AuthAccessRequirements | undefined,
  getCurrentUserImpl: ReturnType<typeof vi.fn>
): { guard: AuthAccessGuard; authService: AuthService } {
  const reflector = {
    getAllAndOverride: vi.fn().mockReturnValue(requirements)
  } as unknown as Reflector;

  const authService = {
    get_current_user: getCurrentUserImpl
  } as unknown as AuthService;

  return {
    guard: new AuthAccessGuard(reflector, authService),
    authService
  };
}

describe("auth access guard", () => {
  it("allows request when access metadata is missing", async () => {
    const getCurrentUser = vi.fn();
    const { guard } = make_guard(undefined, getCurrentUser);
    const context = make_execution_context();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(getCurrentUser).not.toHaveBeenCalled();
  });

  it("returns unauthorized for authenticated-only endpoint without access cookie", async () => {
    const { guard } = make_guard({ authenticated: true }, vi.fn());
    const context = make_execution_context();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("allows authenticated request and stores auth payload on request", async () => {
    const getCurrentUser = vi.fn(async () => ({
      user: make_user(["seller"]),
      session: {
        sessionId: "s1",
        issuedAt: "2026-04-06T00:00:00.000Z",
        refreshExpiresAt: "2026-04-07T00:00:00.000Z"
      }
    }));
    const { guard } = make_guard({ authenticated: true }, getCurrentUser);
    const context = make_execution_context("sm_access_token=token-1");

    await expect(guard.canActivate(context)).resolves.toBe(true);

    const request = context.switchToHttp().getRequest() as { auth?: unknown };
    expect(request.auth).toBeDefined();
  });

  it("returns forbidden when required role is missing", async () => {
    const getCurrentUser = vi.fn(async () => ({
      user: make_user(["seller"]),
      session: {
        sessionId: "s1",
        issuedAt: "2026-04-06T00:00:00.000Z",
        refreshExpiresAt: "2026-04-07T00:00:00.000Z"
      }
    }));
    const { guard } = make_guard({ requiredRoleCodes: ["admin"] }, getCurrentUser);
    const context = make_execution_context("sm_access_token=token-1");

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("returns forbidden when required permission is missing", async () => {
    const getCurrentUser = vi.fn(async () => ({
      user: make_user(["admin"], ["users.read"]),
      session: {
        sessionId: "s1",
        issuedAt: "2026-04-06T00:00:00.000Z",
        refreshExpiresAt: "2026-04-07T00:00:00.000Z"
      }
    }));
    const { guard } = make_guard({ requiredPermissionCodes: ["users.manage_roles"] }, getCurrentUser);
    const context = make_execution_context("sm_access_token=token-1");

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows request when required role and permission are satisfied", async () => {
    const getCurrentUser = vi.fn(async () => ({
      user: make_user(["admin"], ["users.read", "users.manage_roles"]),
      session: {
        sessionId: "s1",
        issuedAt: "2026-04-06T00:00:00.000Z",
        refreshExpiresAt: "2026-04-07T00:00:00.000Z"
      }
    }));
    const requirements: AuthAccessRequirements = {
      requiredRoleCodes: ["admin"],
      requiredPermissionCodes: ["users.manage_roles"]
    };
    const { guard } = make_guard(requirements, getCurrentUser);
    const context = make_execution_context("sm_access_token=token-1");

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
