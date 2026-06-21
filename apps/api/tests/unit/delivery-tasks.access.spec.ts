import "reflect-metadata";
import { ForbiddenException, UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";
import { auth_access_metadata_key } from "../../src/modules/auth/auth.access.contract";
import type { AuthRoleCode } from "../../src/modules/auth/auth.contract";
import { AuthAccessGuard } from "../../src/modules/auth/auth.access.guard";
import type { AuthService } from "../../src/modules/auth/auth.service";
import { DeliveryTasksController } from "../../src/modules/logistics/delivery-tasks.controller";
import { ReturnRequestsController } from "../../src/modules/orders/return-requests.controller";
import { PaymentsController } from "../../src/modules/payments/payments.controller";
import { DeliveryTasksReadController } from "../../src/modules/read-side/logistics/delivery-task.read.controller";
import { ReturnRequestsReadController } from "../../src/modules/read-side/returns/return-request.read.controller";

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

describe("delivery task access baseline", () => {
  it("keeps read baseline roles for delivery tasks", () => {
    const requirements = Reflect.getMetadata(
      auth_access_metadata_key,
      DeliveryTasksReadController
    ) as {
      authenticated?: boolean;
      requiredRoleCodes?: string[];
    };

    expect(requirements?.authenticated).toBe(true);
    expect(requirements?.requiredRoleCodes).toEqual(["seller", "logistics", "admin", "ceo"]);
  });

  it("keeps command baseline roles for delivery task mutations", () => {
    const requirements = Reflect.getMetadata(auth_access_metadata_key, DeliveryTasksController) as {
      authenticated?: boolean;
      requiredRoleCodes?: string[];
    };

    expect(requirements?.authenticated).toBe(true);
    expect(requirements?.requiredRoleCodes).toEqual(["logistics", "admin", "ceo"]);
  });

  it("returns unauthorized for delivery-task read without auth cookie", async () => {
    const guard = make_guard(vi.fn());
    const context = make_http_context(DeliveryTasksReadController, "list");

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("forbids seller from command surface", async () => {
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
    const context = make_http_context(DeliveryTasksController, "create", "sm_access_token=token-1");

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows logistics role on command surface", async () => {
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
    const context = make_http_context(DeliveryTasksController, "assign", "sm_access_token=token-1");

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});

describe("payment refund access baseline", () => {
  it("forbids non-finance roles from refund command even when they can access payment create", async () => {
    for (const roleCode of ["seller", "warehouse", "logistics"] as AuthRoleCode[]) {
      const guard = make_guard(
        vi.fn(async () => ({
          user: make_user([roleCode]),
          session: {
            sessionId: "s1",
            issuedAt: "2026-04-06T00:00:00.000Z",
            refreshExpiresAt: "2026-04-07T00:00:00.000Z"
          }
        }))
      );

      await expect(
        guard.canActivate(
          make_http_context(PaymentsController, "refund", "sm_access_token=token-1")
        )
      ).rejects.toBeInstanceOf(ForbiddenException);
    }
  });

  it("allows finance on refund command", async () => {
    const guard = make_guard(
      vi.fn(async () => ({
        user: make_user(["finance"]),
        session: {
          sessionId: "s1",
          issuedAt: "2026-04-06T00:00:00.000Z",
          refreshExpiresAt: "2026-04-07T00:00:00.000Z"
        }
      }))
    );

    await expect(
      guard.canActivate(make_http_context(PaymentsController, "refund", "sm_access_token=token-1"))
    ).resolves.toBe(true);
  });
});

describe("return request access baseline", () => {
  it("keeps read baseline separate from command permissions", () => {
    const requirements = Reflect.getMetadata(
      auth_access_metadata_key,
      ReturnRequestsReadController
    ) as {
      authenticated?: boolean;
      requiredRoleCodes?: string[];
    };

    expect(requirements?.authenticated).toBe(true);
    expect(requirements?.requiredRoleCodes).toEqual([
      "admin",
      "seller",
      "warehouse",
      "logistics",
      "finance",
      "ceo",
      "driver",
      "marketing"
    ]);
  });

  it("allows seller only on return-request create command", async () => {
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

    await expect(
      guard.canActivate(
        make_http_context(ReturnRequestsController, "create", "sm_access_token=token-1")
      )
    ).resolves.toBe(true);
    await expect(
      guard.canActivate(
        make_http_context(ReturnRequestsController, "confirm", "sm_access_token=token-1")
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("forbids logistics from return-request command surface", async () => {
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

    for (const handlerName of ["create", "confirm", "process", "close"]) {
      await expect(
        guard.canActivate(
          make_http_context(ReturnRequestsController, handlerName, "sm_access_token=token-1")
        )
      ).rejects.toBeInstanceOf(ForbiddenException);
    }
  });

  it("allows warehouse on inventory-affecting return processing only", async () => {
    const guard = make_guard(
      vi.fn(async () => ({
        user: make_user(["warehouse"]),
        session: {
          sessionId: "s1",
          issuedAt: "2026-04-06T00:00:00.000Z",
          refreshExpiresAt: "2026-04-07T00:00:00.000Z"
        }
      }))
    );

    await expect(
      guard.canActivate(
        make_http_context(ReturnRequestsController, "process", "sm_access_token=token-1")
      )
    ).resolves.toBe(true);
    await expect(
      guard.canActivate(
        make_http_context(ReturnRequestsController, "create", "sm_access_token=token-1")
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
