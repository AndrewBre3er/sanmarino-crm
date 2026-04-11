import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AuthPrincipal } from "../../src/modules/auth/auth.contract";
import { OrdersService } from "../../src/modules/orders/orders.service";
import type { OrdersOrderDetailReadModel } from "../../src/modules/read-side/orders/order.read.repository";
import type { PrismaOrdersOrderReadRepository } from "../../src/modules/read-side/orders/order.read.repository";
import type { ReadCollectionQueryInput } from "../../src/modules/read-side/shared/read-model.contract";

function build_query(): ReadCollectionQueryInput {
  return {
    page: 1,
    pageSize: 20,
    includeDeleted: false,
    sortField: "createdAt",
    sortDirection: "desc",
    contract: {
      pagination: {
        mode: "page",
        page: {
          page: 1,
          pageSize: 20
        }
      },
      sort: [{ field: "createdAt", direction: "desc" }]
    }
  };
}

function actor(userId: string, roleCodes: string[]): Pick<AuthPrincipal, "userId" | "roleCodes"> {
  return {
    userId,
    roleCodes
  } as unknown as Pick<AuthPrincipal, "userId" | "roleCodes">;
}

function build_order_detail(): OrdersOrderDetailReadModel {
  return {
    id: "order_1",
    orderNumber: "ORD-DEAL-deal_1",
    dealId: "deal_1",
    clientId: "client_1",
    status: "assembling",
    paymentControlStatus: "on_control",
    paymentControlDueAt: null,
    fulfillmentType: "manual",
    deliveryStatus: "not_scheduled",
    currency: "RUB",
    subtotalAmount: "0.00",
    discountAmount: "0.00",
    totalAmount: "0.00",
    notes: null,
    readyForPartialShipmentAt: null,
    readyForShipmentAt: null,
    partiallyShippedAt: null,
    shippedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    deletedAt: null,
    deletedBy: null,
    deleteReason: null,
    isDeleted: false,
    items: [],
    paymentIds: [],
    deliveryTaskIds: [],
    returnRequestIds: []
  };
}

describe("orders service", () => {
  it("limits seller list scope to own responsible user id", async () => {
    const repository = {
      list: vi.fn().mockResolvedValue({
        items: [],
        pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 }
      }),
      getById: vi.fn()
    } as unknown as PrismaOrdersOrderReadRepository;
    const service = new OrdersService(repository);

    const query = build_query();
    await service.listOrders(query, actor("seller_1", ["seller"]));

    expect(repository.list).toHaveBeenCalledWith(query, { responsibleUserId: "seller_1" });
  });

  it("rejects seller filtering orders by another responsible user id", async () => {
    const repository = {
      list: vi.fn(),
      getById: vi.fn()
    } as unknown as PrismaOrdersOrderReadRepository;
    const service = new OrdersService(repository);

    await expect(
      service.listOrders(build_query(), actor("seller_1", ["seller"]), "seller_2")
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows privileged roles to filter by responsible user id", async () => {
    const repository = {
      list: vi.fn().mockResolvedValue({
        items: [],
        pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 }
      }),
      getById: vi.fn()
    } as unknown as PrismaOrdersOrderReadRepository;
    const service = new OrdersService(repository);

    const query = build_query();
    await service.listOrders(query, actor("admin_1", ["admin"]), "seller_2");

    expect(repository.list).toHaveBeenCalledWith(query, { responsibleUserId: "seller_2" });
  });

  it("keeps privileged list scope open when no responsible user filter is requested", async () => {
    const repository = {
      list: vi.fn().mockResolvedValue({
        items: [],
        pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 }
      }),
      getById: vi.fn()
    } as unknown as PrismaOrdersOrderReadRepository;
    const service = new OrdersService(repository);

    const query = build_query();
    await service.listOrders(query, actor("finance_1", ["finance"]));

    expect(repository.list).toHaveBeenCalledWith(query, undefined);
  });

  it("loads order detail in seller scope and preserves main status/control overlay separation", async () => {
    const repository = {
      list: vi.fn(),
      getById: vi.fn().mockResolvedValue(build_order_detail())
    } as unknown as PrismaOrdersOrderReadRepository;
    const service = new OrdersService(repository);

    const order = await service.getOrder("order_1", actor("seller_1", ["seller"]));

    expect(repository.getById).toHaveBeenCalledWith("order_1", false, {
      responsibleUserId: "seller_1"
    });
    expect(order.status).toBe("assembling");
    expect(order.paymentControlStatus).toBe("on_control");
  });

  it("throws not found when order is missing in actor scope", async () => {
    const repository = {
      list: vi.fn(),
      getById: vi.fn().mockResolvedValue(null)
    } as unknown as PrismaOrdersOrderReadRepository;
    const service = new OrdersService(repository);

    await expect(
      service.getOrder("missing_order", actor("seller_1", ["seller"]))
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
