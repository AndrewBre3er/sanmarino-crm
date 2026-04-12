import "reflect-metadata";
import { ForbiddenException, UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";
import { auth_access_metadata_key } from "../../src/modules/auth/auth.access.contract";
import type { AuthRoleCode } from "../../src/modules/auth/auth.contract";
import { AuthAccessGuard } from "../../src/modules/auth/auth.access.guard";
import type { AuthService } from "../../src/modules/auth/auth.service";
import { LogisticsResourcesController } from "../../src/modules/logistics/logistics-resources.controller";

type ControllerClass = new (...args: never[]) => object;

function make_user(roleCodes: AuthRoleCode[]) {
  const primaryRole = roleCodes[0] ?? "seller";
  return {
    userId: "user-1",
    email: "user-1@local",
    login: "user-1@local",
    displayName: "User 1",
    primaryRole,
    roleCodes,
    allowedWorkspaces: roleCodes,
    permissionCodes: [],
    roleCode: primaryRole,
    optionalRole: false
  };
}

function make_http_context(
  controllerClass: ControllerClass,
  handlerName: string,
  cookieHeader?: string
): ExecutionContext {
  const request = {
    headers: cookieHeader ? { cookie: cookieHeader } : {}
  };

  const handler = (controllerClass.prototype as Record<string, unknown>)[handlerName];
  if (typeof handler !== "function") {
    throw new Error(`Handler '${handlerName}' was not found on controller`);
  }

  return {
    getType: () => "http",
    switchToHttp: () => ({
      getRequest: () => request
    }),
    getHandler: () => handler,
    getClass: () => controllerClass
  } as unknown as ExecutionContext;
}

function make_guard(getCurrentUserImpl: ReturnType<typeof vi.fn>): AuthAccessGuard {
  const reflector = new Reflector();
  const authService = {
    get_current_user: getCurrentUserImpl
  } as unknown as AuthService;

  return new AuthAccessGuard(reflector, authService);
}

describe("logistics resource access baseline", () => {
  it("keeps logistics/admin/ceo roles on resource surface", () => {
    const requirements = Reflect.getMetadata(
      auth_access_metadata_key,
      LogisticsResourcesController
    ) as {
      authenticated?: boolean;
      requiredRoleCodes?: string[];
    };

    expect(requirements?.authenticated).toBe(true);
    expect(requirements?.requiredRoleCodes).toEqual(["logistics", "admin", "ceo"]);
  });

  it("returns unauthorized for resource read without auth cookie", async () => {
    const guard = make_guard(vi.fn());
    const context = make_http_context(LogisticsResourcesController, "listDeliverySlots");

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("forbids seller from logistics resource command surface", async () => {
    const guard = make_guard(
      vi.fn(async () => ({
        user: make_user(["seller"]),
        session: {
          sessionId: "s1",
          issuedAt: "2026-04-06T00:00:00.000Z",
          refreshExpiresAt: "2026-04-07T00:00:00.000Z"
        }
      }))
    );
    const context = make_http_context(
      LogisticsResourcesController,
      "createDeliverySlot",
      "sm_access_token=token-1"
    );

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows logistics role on logistics resource command surface", async () => {
    const guard = make_guard(
      vi.fn(async () => ({
        user: make_user(["logistics"]),
        session: {
          sessionId: "s1",
          issuedAt: "2026-04-06T00:00:00.000Z",
          refreshExpiresAt: "2026-04-07T00:00:00.000Z"
        }
      }))
    );
    const context = make_http_context(
      LogisticsResourcesController,
      "patchRouteDay",
      "sm_access_token=token-1"
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
