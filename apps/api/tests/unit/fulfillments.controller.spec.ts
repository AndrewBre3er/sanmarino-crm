import "reflect-metadata";
import {
  BadRequestException,
  ForbiddenException,
  type ExecutionContext
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";
import { auth_access_metadata_key } from "../../src/modules/auth/auth.access.contract";
import { AuthAccessGuard } from "../../src/modules/auth/auth.access.guard";
import type { AuthRoleCode } from "../../src/modules/auth/auth.contract";
import type { AuthService } from "../../src/modules/auth/auth.service";
import type { AuthenticatedRequestLike } from "../../src/modules/auth/auth.access.helpers";
import { FulfillmentsController } from "../../src/modules/orders/fulfillments.controller";
import type { FulfillmentsService } from "../../src/modules/orders/fulfillments.service";

function build_request(
  userId: string,
  roleCodes: string[],
  idempotencyKey?: string
): AuthenticatedRequestLike & { auth: { user: { userId: string; roleCodes: string[] } } } {
  return {
    auth: {
      user: {
        userId,
        roleCodes
      },
      session: {
        sessionId: "session_1",
        issuedAt: "2026-04-10T00:00:00.000Z",
        refreshExpiresAt: "2026-04-11T00:00:00.000Z"
      }
    },
    ...(idempotencyKey
      ? {
          shellContext: {
            requestId: "req_0000000000000001",
            correlationId: "corr_0000000000001",
            idempotencyKey
          }
        }
      : {})
  } as unknown as AuthenticatedRequestLike & {
    auth: { user: { userId: string; roleCodes: string[] } };
  };
}

type ControllerClass = new (...args: never[]) => object;

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

function make_guard(getCurrentUserImpl: ReturnType<typeof vi.fn>): AuthAccessGuard {
  const reflector = new Reflector();
  const authService = {
    get_current_user: getCurrentUserImpl
  } as unknown as AuthService;

  return new AuthAccessGuard(reflector, authService);
}

describe("fulfillments controller", () => {
  it("lists fulfillments with normalized envelope", async () => {
    const service = {
      listFulfillments: vi.fn().mockResolvedValue({
        items: [],
        pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 }
      }),
      getFulfillment: vi.fn(),
      createFulfillment: vi.fn(),
      confirmExecution: vi.fn()
    } as unknown as FulfillmentsService;
    const controller = new FulfillmentsController(service);
    const request = build_request("seller_1", ["seller"]);

    const result = await controller.list({}, request);

    expect(service.listFulfillments).toHaveBeenCalledOnce();
    expect(result.meta.pagination.mode).toBe("page");
  });

  it("returns fulfillment detail", async () => {
    const service = {
      listFulfillments: vi.fn(),
      getFulfillment: vi.fn().mockResolvedValue({
        id: "ful_1",
        status: "pending"
      }),
      createFulfillment: vi.fn(),
      confirmExecution: vi.fn()
    } as unknown as FulfillmentsService;
    const controller = new FulfillmentsController(service);
    const request = build_request("seller_1", ["seller"]);

    const result = await controller.detail("ful_1", request);

    expect(service.getFulfillment).toHaveBeenCalledWith("ful_1", request.auth.user);
    expect(result).toEqual({
      data: {
        id: "ful_1",
        status: "pending"
      }
    });
  });

  it("creates fulfillment from payload", async () => {
    const service = {
      listFulfillments: vi.fn(),
      getFulfillment: vi.fn(),
      createFulfillment: vi.fn().mockResolvedValue({ id: "ful_1" }),
      confirmExecution: vi.fn()
    } as unknown as FulfillmentsService;
    const controller = new FulfillmentsController(service);
    const request = build_request("warehouse_1", ["warehouse"]);

    const payload = {
      orderId: "order_1",
      items: [{ orderItemId: "item_1", qty: "1.00" }]
    };
    const result = await controller.create(payload, request);

    expect(service.createFulfillment).toHaveBeenCalledWith(payload, request.auth.user);
    expect(result).toEqual({ data: { id: "ful_1" } });
  });

  it("passes fulfillment linkage payload on create", async () => {
    const service = {
      listFulfillments: vi.fn(),
      getFulfillment: vi.fn(),
      createFulfillment: vi.fn().mockResolvedValue({ id: "ful_2" }),
      confirmExecution: vi.fn()
    } as unknown as FulfillmentsService;
    const controller = new FulfillmentsController(service);
    const request = build_request("warehouse_1", ["warehouse"]);

    const payload = {
      orderId: "order_1",
      deliveryTaskId: "9ec2bff6-52ab-40cf-b866-84ef5ce80c1e",
      pickupWindowId: "dcdf6ac9-f137-45ac-815b-5ebc91187ec4"
    };
    await controller.create(payload, request);

    expect(service.createFulfillment).toHaveBeenCalledWith(payload, request.auth.user);
  });

  it("confirms fulfillment execution", async () => {
    const service = {
      listFulfillments: vi.fn(),
      getFulfillment: vi.fn(),
      createFulfillment: vi.fn(),
      confirmExecution: vi.fn().mockResolvedValue({ id: "ful_1", status: "completed" })
    } as unknown as FulfillmentsService;
    const controller = new FulfillmentsController(service);
    const request = build_request("warehouse_1", ["warehouse"], "idem_confirm_01");

    const result = await controller.confirmExecution("ful_1", request);

    expect(service.confirmExecution).toHaveBeenCalledWith(
      "ful_1",
      request.auth.user,
      expect.objectContaining({
        idempotencyKey: "idem_confirm_01"
      })
    );
    expect(result).toEqual({ data: { id: "ful_1", status: "completed" } });
  });

  it("requires idempotency key for confirm execution", async () => {
    const service = {
      listFulfillments: vi.fn(),
      getFulfillment: vi.fn(),
      createFulfillment: vi.fn(),
      confirmExecution: vi.fn()
    } as unknown as FulfillmentsService;
    const controller = new FulfillmentsController(service);
    const request = build_request("warehouse_1", ["warehouse"]);

    await expect(controller.confirmExecution("ful_1", request)).rejects.toBeInstanceOf(
      BadRequestException
    );
    expect(service.confirmExecution).not.toHaveBeenCalled();
  });

  it("keeps role metadata for read and create surfaces", () => {
    const classRequirements = Reflect.getMetadata(
      auth_access_metadata_key,
      FulfillmentsController
    ) as {
      authenticated?: boolean;
      requiredRoleCodes?: string[];
    };
    const createRequirements = Reflect.getMetadata(
      auth_access_metadata_key,
      FulfillmentsController.prototype.create
    ) as {
      authenticated?: boolean;
      requiredRoleCodes?: string[];
    };
    const confirmRequirements = Reflect.getMetadata(
      auth_access_metadata_key,
      FulfillmentsController.prototype.confirmExecution
    ) as {
      authenticated?: boolean;
      requiredRoleCodes?: string[];
    };

    expect(classRequirements?.requiredRoleCodes).toEqual([
      "seller",
      "warehouse",
      "logistics",
      "finance",
      "admin",
      "ceo"
    ]);
    expect(createRequirements?.requiredRoleCodes).toEqual([
      "warehouse",
      "logistics",
      "admin",
      "ceo"
    ]);
    expect(confirmRequirements?.requiredRoleCodes).toEqual([
      "warehouse",
      "logistics",
      "admin",
      "ceo"
    ]);
  });

  it("forbids seller role on fulfillment create endpoint", async () => {
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
      FulfillmentsController,
      "create",
      "sm_access_token=token-1"
    );

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
