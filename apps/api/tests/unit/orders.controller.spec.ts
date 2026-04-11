import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { auth_access_metadata_key } from "../../src/modules/auth/auth.access.contract";
import type { AuthenticatedRequestLike } from "../../src/modules/auth/auth.access.helpers";
import { OrdersController } from "../../src/modules/orders/orders.controller";
import type { OrdersService } from "../../src/modules/orders/orders.service";

function build_request(
  userId: string,
  roleCodes: string[]
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
    }
  } as unknown as AuthenticatedRequestLike & {
    auth: { user: { userId: string; roleCodes: string[] } };
  };
}

describe("orders controller", () => {
  it("returns normalized list response and forwards responsible user filter", async () => {
    const ordersService = {
      listOrders: vi.fn().mockResolvedValue({
        items: [],
        pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 }
      }),
      getOrder: vi.fn()
    } as unknown as OrdersService;
    const controller = new OrdersController(ordersService);

    const request = build_request("admin_1", ["admin"]);
    const result = await controller.list({ responsibleUserId: "seller_2" }, request);

    expect(ordersService.listOrders).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        pageSize: 20,
        sortField: "createdAt",
        sortDirection: "desc"
      }),
      request.auth.user,
      "seller_2"
    );
    expect(result.data).toEqual([]);
    expect(result.meta.pagination.mode).toBe("page");
  });

  it("returns order detail payload", async () => {
    const ordersService = {
      listOrders: vi.fn(),
      getOrder: vi.fn().mockResolvedValue({
        id: "order_1",
        status: "assembling",
        paymentControlStatus: "none"
      })
    } as unknown as OrdersService;
    const controller = new OrdersController(ordersService);

    const request = build_request("seller_1", ["seller"]);
    const result = await controller.detail("order_1", request);

    expect(ordersService.getOrder).toHaveBeenCalledWith("order_1", request.auth.user);
    expect(result).toEqual({
      data: {
        id: "order_1",
        status: "assembling",
        paymentControlStatus: "none"
      }
    });
  });

  it("keeps read access baseline role matrix for orders surface", () => {
    const requirements = Reflect.getMetadata(auth_access_metadata_key, OrdersController) as {
      authenticated?: boolean;
      requiredRoleCodes?: string[];
    };

    expect(requirements?.authenticated).toBe(true);
    expect(requirements?.requiredRoleCodes).toEqual([
      "seller",
      "warehouse",
      "logistics",
      "finance",
      "admin",
      "ceo"
    ]);
  });

  it("keeps step-3 surface read-only and defers mutation endpoints", () => {
    const endpoint_methods = Object.getOwnPropertyNames(OrdersController.prototype)
      .filter((method_name) => method_name !== "constructor")
      .sort();

    expect(endpoint_methods).toEqual(["detail", "list"]);
  });
});
