import {
  ConflictException,
  ForbiddenException,
  NotFoundException
} from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AuthPrincipal } from "../../src/modules/auth/auth.contract";
import { OrdersService } from "../../src/modules/orders/orders.service";
import type { OrdersOrderDetailReadModel } from "../../src/modules/read-side/orders/order.read.repository";
import type { PrismaOrdersOrderReadRepository } from "../../src/modules/read-side/orders/order.read.repository";
import type { ReadCollectionQueryInput } from "../../src/modules/read-side/shared/read-model.contract";
import type { PrismaService } from "../../src/prisma/prisma.service";

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

function build_order_detail(
  status: OrdersOrderDetailReadModel["status"] = "assembling",
  paymentControlStatus: OrdersOrderDetailReadModel["paymentControlStatus"] = "none"
): OrdersOrderDetailReadModel {
  return {
    id: "order_1",
    orderNumber: "ORD-DEAL-deal_1",
    dealId: "deal_1",
    clientId: "client_1",
    status,
    paymentControlStatus,
    paymentControlDueAt: paymentControlStatus === "none" ? null : new Date().toISOString(),
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

function create_prisma_mock() {
  const findFirst = vi.fn();
  const update = vi.fn();
  const ordersOrderItemFindMany = vi.fn();
  const ordersFulfillmentCount = vi.fn();
  const ordersFulfillmentItemFindMany = vi.fn();

  const prismaService = {
    ordersOrder: {
      findFirst,
      update
    },
    ordersOrderItem: {
      findMany: ordersOrderItemFindMany
    },
    ordersFulfillment: {
      count: ordersFulfillmentCount
    },
    ordersFulfillmentItem: {
      findMany: ordersFulfillmentItemFindMany
    },
    $transaction: vi.fn(async (operations: Promise<unknown>[]) => Promise.all(operations))
  } as unknown as PrismaService;

  return {
    prismaService,
    findFirst,
    update,
    ordersOrderItemFindMany,
    ordersFulfillmentCount,
    ordersFulfillmentItemFindMany
  };
}

describe("orders service", () => {
  it("limits seller list scope to own responsible user id", async () => {
    const { prismaService } = create_prisma_mock();
    const repository = {
      list: vi.fn().mockResolvedValue({
        items: [],
        pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 }
      }),
      getById: vi.fn()
    } as unknown as PrismaOrdersOrderReadRepository;
    const service = new OrdersService(prismaService, repository);

    const query = build_query();
    await service.listOrders(query, actor("seller_1", ["seller"]));

    expect(repository.list).toHaveBeenCalledWith(query, { responsibleUserId: "seller_1" });
  });

  it("rejects seller filtering orders by another responsible user id", async () => {
    const { prismaService } = create_prisma_mock();
    const repository = {
      list: vi.fn(),
      getById: vi.fn()
    } as unknown as PrismaOrdersOrderReadRepository;
    const service = new OrdersService(prismaService, repository);

    await expect(
      service.listOrders(build_query(), actor("seller_1", ["seller"]), "seller_2")
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows privileged roles to filter by responsible user id", async () => {
    const { prismaService } = create_prisma_mock();
    const repository = {
      list: vi.fn().mockResolvedValue({
        items: [],
        pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 }
      }),
      getById: vi.fn()
    } as unknown as PrismaOrdersOrderReadRepository;
    const service = new OrdersService(prismaService, repository);

    const query = build_query();
    await service.listOrders(query, actor("admin_1", ["admin"]), "seller_2");

    expect(repository.list).toHaveBeenCalledWith(query, { responsibleUserId: "seller_2" });
  });

  it("transitions status assembling -> ready_for_partial_shipment", async () => {
    const { prismaService, findFirst, update } = create_prisma_mock();
    findFirst.mockResolvedValue({
      id: "order_1",
      status: "ASSEMBLING",
      paymentControlStatus: "NONE",
      paymentControlDueAt: null,
      readyForPartialShipmentAt: null,
      readyForShipmentAt: null
    });
    const repository = {
      list: vi.fn(),
      getById: vi.fn().mockResolvedValue(build_order_detail("ready_for_partial_shipment", "none"))
    } as unknown as PrismaOrdersOrderReadRepository;
    const service = new OrdersService(prismaService, repository);

    const result = await service.transitionOrderStatus(
      "order_1",
      "ready_for_partial_shipment",
      actor("seller_1", ["seller"])
    );

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order_1" },
        data: expect.objectContaining({
          status: "READY_FOR_PARTIAL_SHIPMENT",
          readyForPartialShipmentAt: expect.any(Date)
        })
      })
    );
    const updatePayload = update.mock.calls[0]?.[0]?.data as Record<string, unknown>;
    expect(updatePayload.paymentControlStatus).toBeUndefined();
    expect(result.status).toBe("ready_for_partial_shipment");
  });

  it("rejects invalid status transition", async () => {
    const { prismaService, findFirst, update } = create_prisma_mock();
    findFirst.mockResolvedValue({
      id: "order_1",
      status: "READY_FOR_SHIPMENT",
      paymentControlStatus: "NONE",
      paymentControlDueAt: null,
      readyForPartialShipmentAt: null,
      readyForShipmentAt: null
    });
    const repository = {
      list: vi.fn(),
      getById: vi.fn()
    } as unknown as PrismaOrdersOrderReadRepository;
    const service = new OrdersService(prismaService, repository);

    await expect(
      service.transitionOrderStatus("order_1", "assembling", actor("seller_1", ["seller"]))
    ).rejects.toBeInstanceOf(ConflictException);
    expect(update).not.toHaveBeenCalled();
  });

  it("allows ship-partial when fulfillment progress is partial", async () => {
    const {
      prismaService,
      findFirst,
      update,
      ordersOrderItemFindMany,
      ordersFulfillmentCount,
      ordersFulfillmentItemFindMany
    } = create_prisma_mock();
    findFirst.mockResolvedValue({
      id: "order_1",
      status: "READY_FOR_PARTIAL_SHIPMENT",
      paymentControlStatus: "NONE",
      paymentControlDueAt: null,
      readyForPartialShipmentAt: null,
      readyForShipmentAt: null
    });
    ordersOrderItemFindMany.mockResolvedValue([{ id: "item_1", qty: "5.00" }]);
    ordersFulfillmentCount.mockResolvedValueOnce(1).mockResolvedValueOnce(1);
    ordersFulfillmentItemFindMany.mockResolvedValue([{ orderItemId: "item_1", qty: "2.00" }]);
    const repository = {
      list: vi.fn(),
      getById: vi.fn().mockResolvedValue(build_order_detail("partially_shipped", "none"))
    } as unknown as PrismaOrdersOrderReadRepository;
    const service = new OrdersService(prismaService, repository);

    const result = await service.transitionOrderStatus(
      "order_1",
      "partially_shipped",
      actor("seller_1", ["seller"])
    );

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order_1" },
        data: expect.objectContaining({
          status: "PARTIALLY_SHIPPED",
          partiallyShippedAt: expect.any(Date)
        })
      })
    );
    const updatePayload = update.mock.calls[0]?.[0]?.data as Record<string, unknown>;
    expect(updatePayload.paymentControlStatus).toBeUndefined();
    expect(updatePayload.deliveryStatus).toBeUndefined();
    expect(result.status).toBe("partially_shipped");
  });

  it("rejects ship-complete when fulfillment progress is not complete", async () => {
    const {
      prismaService,
      findFirst,
      update,
      ordersOrderItemFindMany,
      ordersFulfillmentCount,
      ordersFulfillmentItemFindMany
    } = create_prisma_mock();
    findFirst.mockResolvedValue({
      id: "order_1",
      status: "READY_FOR_SHIPMENT",
      paymentControlStatus: "NONE",
      paymentControlDueAt: null,
      readyForPartialShipmentAt: null,
      readyForShipmentAt: null
    });
    ordersOrderItemFindMany.mockResolvedValue([{ id: "item_1", qty: "5.00" }]);
    ordersFulfillmentCount.mockResolvedValueOnce(1).mockResolvedValueOnce(1);
    ordersFulfillmentItemFindMany.mockResolvedValue([{ orderItemId: "item_1", qty: "2.00" }]);
    const repository = {
      list: vi.fn(),
      getById: vi.fn()
    } as unknown as PrismaOrdersOrderReadRepository;
    const service = new OrdersService(prismaService, repository);

    await expect(
      service.transitionOrderStatus("order_1", "shipped", actor("seller_1", ["seller"]))
    ).rejects.toBeInstanceOf(ConflictException);
    expect(update).not.toHaveBeenCalled();
  });

  it("allows ship-complete when fulfillment progress is complete", async () => {
    const {
      prismaService,
      findFirst,
      update,
      ordersOrderItemFindMany,
      ordersFulfillmentCount,
      ordersFulfillmentItemFindMany
    } = create_prisma_mock();
    findFirst.mockResolvedValue({
      id: "order_1",
      status: "READY_FOR_SHIPMENT",
      paymentControlStatus: "NONE",
      paymentControlDueAt: null,
      readyForPartialShipmentAt: null,
      readyForShipmentAt: null
    });
    ordersOrderItemFindMany.mockResolvedValue([{ id: "item_1", qty: "5.00" }]);
    ordersFulfillmentCount.mockResolvedValueOnce(2).mockResolvedValueOnce(0);
    ordersFulfillmentItemFindMany.mockResolvedValue([{ orderItemId: "item_1", qty: "5.00" }]);
    const repository = {
      list: vi.fn(),
      getById: vi.fn().mockResolvedValue(build_order_detail("shipped", "none"))
    } as unknown as PrismaOrdersOrderReadRepository;
    const service = new OrdersService(prismaService, repository);

    const result = await service.transitionOrderStatus("order_1", "shipped", actor("seller_1", ["seller"]));

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order_1" },
        data: expect.objectContaining({
          status: "SHIPPED",
          shippedAt: expect.any(Date)
        })
      })
    );
    const updatePayload = update.mock.calls[0]?.[0]?.data as Record<string, unknown>;
    expect(updatePayload.paymentControlStatus).toBeUndefined();
    expect(updatePayload.deliveryStatus).toBeUndefined();
    expect(result.status).toBe("shipped");
  });

  it("applies valid control overlay transition none -> on_control", async () => {
    const { prismaService, findFirst, update } = create_prisma_mock();
    findFirst.mockResolvedValue({
      id: "order_1",
      status: "ASSEMBLING",
      paymentControlStatus: "NONE",
      paymentControlDueAt: null,
      readyForPartialShipmentAt: null,
      readyForShipmentAt: null
    });
    const repository = {
      list: vi.fn(),
      getById: vi.fn().mockResolvedValue(build_order_detail("assembling", "on_control"))
    } as unknown as PrismaOrdersOrderReadRepository;
    const service = new OrdersService(prismaService, repository);

    const result = await service.transitionOrderControlOverlay(
      "order_1",
      "on_control",
      actor("logistics_1", ["logistics"])
    );

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order_1" },
        data: expect.objectContaining({
          paymentControlStatus: "ON_CONTROL",
          paymentControlDueAt: expect.any(Date)
        })
      })
    );
    const updatePayload = update.mock.calls[0]?.[0]?.data as Record<string, unknown>;
    expect(updatePayload.status).toBeUndefined();
    expect(result.paymentControlStatus).toBe("on_control");
  });

  it("rejects invalid control overlay transition none -> problem", async () => {
    const { prismaService, findFirst, update } = create_prisma_mock();
    findFirst.mockResolvedValue({
      id: "order_1",
      status: "ASSEMBLING",
      paymentControlStatus: "NONE",
      paymentControlDueAt: null,
      readyForPartialShipmentAt: null,
      readyForShipmentAt: null
    });
    const repository = {
      list: vi.fn(),
      getById: vi.fn()
    } as unknown as PrismaOrdersOrderReadRepository;
    const service = new OrdersService(prismaService, repository);

    await expect(
      service.transitionOrderControlOverlay("order_1", "problem", actor("logistics_1", ["logistics"]))
    ).rejects.toBeInstanceOf(ConflictException);
    expect(update).not.toHaveBeenCalled();
  });

  it("forbids non finance/ceo/admin to clear problem overlay", async () => {
    const { prismaService, findFirst, update } = create_prisma_mock();
    findFirst.mockResolvedValue({
      id: "order_1",
      status: "ASSEMBLING",
      paymentControlStatus: "PROBLEM",
      paymentControlDueAt: new Date(),
      readyForPartialShipmentAt: null,
      readyForShipmentAt: null
    });
    const repository = {
      list: vi.fn(),
      getById: vi.fn()
    } as unknown as PrismaOrdersOrderReadRepository;
    const service = new OrdersService(prismaService, repository);

    await expect(
      service.transitionOrderControlOverlay("order_1", "none", actor("logistics_1", ["logistics"]))
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(update).not.toHaveBeenCalled();
  });

  it("prevents seller from mutating order outside own scope", async () => {
    const { prismaService, findFirst } = create_prisma_mock();
    findFirst.mockResolvedValue(null);
    const repository = {
      list: vi.fn(),
      getById: vi.fn()
    } as unknown as PrismaOrdersOrderReadRepository;
    const service = new OrdersService(prismaService, repository);

    await expect(
      service.transitionOrderStatus("order_1", "ready_for_shipment", actor("seller_1", ["seller"]))
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
