import { ConflictException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AuthPrincipal } from "../../src/modules/auth/auth.contract";
import { FulfillmentsService } from "../../src/modules/orders/fulfillments.service";
import type { ReadCollectionQueryInput } from "../../src/modules/read-side/shared/read-model.contract";
import type { PrismaService } from "../../src/prisma/prisma.service";

function actor(userId: string, roleCodes: string[]): Pick<AuthPrincipal, "userId" | "roleCodes"> {
  return { userId, roleCodes } as Pick<AuthPrincipal, "userId" | "roleCodes">;
}

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

function create_prisma_mock() {
  const ordersFulfillmentFindMany = vi.fn();
  const ordersFulfillmentCount = vi.fn();
  const ordersFulfillmentFindFirst = vi.fn();
  const ordersFulfillmentCreate = vi.fn();
  const ordersFulfillmentUpdate = vi.fn();
  const ordersFulfillmentItemCreateMany = vi.fn();
  const ordersFulfillmentItemFindMany = vi.fn();
  const ordersOrderFindFirst = vi.fn();
  const ordersOrderItemFindMany = vi.fn();
  const ordersOrderUpdate = vi.fn();

  const transactionClient = {
    ordersFulfillment: {
      create: ordersFulfillmentCreate,
      findFirst: ordersFulfillmentFindFirst,
      update: ordersFulfillmentUpdate,
      count: ordersFulfillmentCount
    },
    ordersFulfillmentItem: {
      createMany: ordersFulfillmentItemCreateMany,
      findMany: ordersFulfillmentItemFindMany
    },
    ordersOrder: {
      findFirst: ordersOrderFindFirst,
      update: ordersOrderUpdate
    },
    ordersOrderItem: {
      findMany: ordersOrderItemFindMany
    }
  };

  const prismaService = {
    ordersFulfillment: {
      findMany: ordersFulfillmentFindMany,
      count: ordersFulfillmentCount,
      findFirst: ordersFulfillmentFindFirst,
      update: ordersFulfillmentUpdate
    },
    ordersOrder: {
      findFirst: ordersOrderFindFirst,
      update: ordersOrderUpdate
    },
    ordersOrderItem: {
      findMany: ordersOrderItemFindMany
    },
    ordersFulfillmentItem: {
      createMany: ordersFulfillmentItemCreateMany,
      findMany: ordersFulfillmentItemFindMany
    },
    $transaction: vi.fn(async (arg: unknown) => {
      if (typeof arg === "function") {
        return (arg as (client: typeof transactionClient) => Promise<unknown>)(transactionClient);
      }

      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }

      throw new Error("Unsupported transaction call");
    })
  } as unknown as PrismaService;

  return {
    prismaService,
    ordersFulfillmentFindMany,
    ordersFulfillmentCount,
    ordersFulfillmentFindFirst,
    ordersFulfillmentCreate,
    ordersFulfillmentUpdate,
    ordersFulfillmentItemCreateMany,
    ordersFulfillmentItemFindMany,
    ordersOrderFindFirst,
    ordersOrderItemFindMany,
    ordersOrderUpdate
  };
}

describe("fulfillments service", () => {
  it("lists fulfillments with seller scope and order linkage filter", async () => {
    const {
      prismaService,
      ordersFulfillmentFindMany,
      ordersFulfillmentCount
    } = create_prisma_mock();

    ordersFulfillmentFindMany.mockResolvedValue([
      {
        id: "ful_1",
        orderId: "order_1",
        status: "PENDING",
        fulfillmentType: "DELIVERY",
        fulfilledAt: null,
        failureReason: null,
        createdBy: "user_1",
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        _count: { items: 2 }
      }
    ]);
    ordersFulfillmentCount.mockResolvedValue(1);

    const service = new FulfillmentsService(prismaService);
    const result = await service.listFulfillments(build_query(), actor("seller_1", ["seller"]), {
      orderId: "order_1"
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.itemsCount).toBe(2);
    expect(ordersFulfillmentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { orderId: "order_1" },
            {
              order: {
                deal: { responsibleUserId: "seller_1" }
              }
            }
          ])
        })
      })
    );
  });

  it("returns fulfillment detail with items", async () => {
    const { prismaService, ordersFulfillmentFindFirst } = create_prisma_mock();
    ordersFulfillmentFindFirst.mockResolvedValue({
      id: "ful_1",
      orderId: "order_1",
      status: "PENDING",
      fulfillmentType: "DELIVERY",
      fulfilledAt: null,
      failureReason: null,
      createdBy: "user_1",
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      _count: { items: 1 },
      items: [
        {
          id: "fitem_1",
          fulfillmentId: "ful_1",
          orderItemId: "item_1",
          qty: "1.00",
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
    });

    const service = new FulfillmentsService(prismaService);
    const detail = await service.getFulfillment("ful_1", actor("admin_1", ["admin"]));

    expect(detail.id).toBe("ful_1");
    expect(detail.items).toHaveLength(1);
    expect(detail.status).toBe("pending");
  });

  it("fails create when order linkage is invalid", async () => {
    const { prismaService, ordersOrderFindFirst } = create_prisma_mock();
    ordersOrderFindFirst.mockResolvedValue(null);

    const service = new FulfillmentsService(prismaService);

    await expect(
      service.createFulfillment(
        {
          orderId: "missing_order"
        },
        actor("warehouse_1", ["warehouse"])
      )
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("fails create when fulfillment item does not belong to order", async () => {
    const {
      prismaService,
      ordersOrderFindFirst,
      ordersOrderItemFindMany,
      ordersFulfillmentCreate
    } = create_prisma_mock();
    ordersOrderFindFirst.mockResolvedValue({
      id: "order_1",
      fulfillmentType: "DELIVERY"
    });
    ordersOrderItemFindMany.mockResolvedValue([]);

    const service = new FulfillmentsService(prismaService);

    await expect(
      service.createFulfillment(
        {
          orderId: "order_1",
          items: [{ orderItemId: "alien_item", qty: "1" }]
        },
        actor("warehouse_1", ["warehouse"])
      )
    ).rejects.toBeInstanceOf(ConflictException);
    expect(ordersFulfillmentCreate).not.toHaveBeenCalled();
  });

  it("creates fulfillment and keeps order status untouched", async () => {
    const {
      prismaService,
      ordersOrderFindFirst,
      ordersOrderItemFindMany,
      ordersFulfillmentCreate,
      ordersFulfillmentFindFirst,
      ordersFulfillmentItemCreateMany,
      ordersOrderUpdate
    } = create_prisma_mock();

    ordersOrderFindFirst.mockResolvedValue({
      id: "order_1",
      fulfillmentType: "DELIVERY"
    });
    ordersOrderItemFindMany.mockResolvedValue([
      {
        id: "item_1",
        qty: "5.00"
      }
    ]);
    ordersFulfillmentCreate.mockResolvedValue({
      id: "ful_1"
    });
    ordersFulfillmentFindFirst.mockResolvedValue({
      id: "ful_1",
      orderId: "order_1",
      status: "PENDING",
      fulfillmentType: "DELIVERY",
      fulfilledAt: null,
      failureReason: null,
      createdBy: "warehouse_1",
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      _count: { items: 1 },
      items: [
        {
          id: "fitem_1",
          fulfillmentId: "ful_1",
          orderItemId: "item_1",
          qty: "2.00",
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
    });

    const service = new FulfillmentsService(prismaService);
    const fulfillment = await service.createFulfillment(
      {
        orderId: "order_1",
        items: [{ orderItemId: "item_1", qty: "2.00" }]
      },
      actor("warehouse_1", ["warehouse"])
    );

    expect(ordersFulfillmentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: "order_1",
          status: "PENDING",
          fulfillmentType: "DELIVERY"
        })
      })
    );
    expect(ordersFulfillmentItemCreateMany).toHaveBeenCalledOnce();
    expect(ordersOrderUpdate).not.toHaveBeenCalled();
    expect(fulfillment.status).toBe("pending");
  });

  it("confirms fulfillment execution and syncs order to partially_shipped", async () => {
    const {
      prismaService,
      ordersFulfillmentFindFirst,
      ordersFulfillmentUpdate,
      ordersFulfillmentCount,
      ordersFulfillmentItemFindMany,
      ordersOrderItemFindMany,
      ordersOrderUpdate
    } = create_prisma_mock();
    ordersFulfillmentFindFirst
      .mockResolvedValueOnce({
        id: "ful_1",
        orderId: "order_1",
        status: "PENDING",
        fulfillmentType: "DELIVERY",
        order: {
          id: "order_1",
          status: "READY_FOR_PARTIAL_SHIPMENT",
          paymentControlStatus: "NONE",
          paymentControlDueAt: null,
          readyForPartialShipmentAt: null,
          readyForShipmentAt: null,
          partiallyShippedAt: null,
          shippedAt: null
        }
      })
      .mockResolvedValueOnce({
        id: "ful_1",
        orderId: "order_1",
        status: "COMPLETED",
        fulfillmentType: "DELIVERY",
        fulfilledAt: new Date(),
        failureReason: null,
        createdBy: "warehouse_1",
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 2,
        _count: { items: 1 },
        items: [
          {
            id: "fitem_1",
            fulfillmentId: "ful_1",
            orderItemId: "item_1",
            qty: "2.00",
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]
      });
    ordersOrderItemFindMany.mockResolvedValue([{ id: "item_1", qty: "5.00" }]);
    ordersFulfillmentCount.mockResolvedValueOnce(1).mockResolvedValueOnce(1);
    ordersFulfillmentItemFindMany.mockResolvedValue([{ orderItemId: "item_1", qty: "2.00" }]);

    const service = new FulfillmentsService(prismaService);
    const result = await service.confirmExecution("ful_1", actor("warehouse_1", ["warehouse"]));

    expect(ordersFulfillmentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ful_1" },
        data: expect.objectContaining({
          status: "COMPLETED",
          fulfilledAt: expect.any(Date)
        })
      })
    );
    expect(ordersOrderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order_1" },
        data: expect.objectContaining({
          status: "PARTIALLY_SHIPPED",
          partiallyShippedAt: expect.any(Date)
        })
      })
    );
    const orderUpdatePayload = ordersOrderUpdate.mock.calls[0]?.[0]?.data as Record<string, unknown>;
    expect(orderUpdatePayload.paymentControlStatus).toBeUndefined();
    expect(orderUpdatePayload.deliveryStatus).toBeUndefined();
    expect(result.status).toBe("completed");
  });

  it("confirms fulfillment execution and syncs order to shipped", async () => {
    const {
      prismaService,
      ordersFulfillmentFindFirst,
      ordersFulfillmentUpdate,
      ordersFulfillmentCount,
      ordersFulfillmentItemFindMany,
      ordersOrderItemFindMany,
      ordersOrderUpdate
    } = create_prisma_mock();
    ordersFulfillmentFindFirst
      .mockResolvedValueOnce({
        id: "ful_1",
        orderId: "order_1",
        status: "PENDING",
        fulfillmentType: "DELIVERY",
        order: {
          id: "order_1",
          status: "READY_FOR_SHIPMENT",
          paymentControlStatus: "NONE",
          paymentControlDueAt: null,
          readyForPartialShipmentAt: null,
          readyForShipmentAt: null,
          partiallyShippedAt: null,
          shippedAt: null
        }
      })
      .mockResolvedValueOnce({
        id: "ful_1",
        orderId: "order_1",
        status: "COMPLETED",
        fulfillmentType: "DELIVERY",
        fulfilledAt: new Date(),
        failureReason: null,
        createdBy: "warehouse_1",
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 2,
        _count: { items: 1 },
        items: [
          {
            id: "fitem_1",
            fulfillmentId: "ful_1",
            orderItemId: "item_1",
            qty: "5.00",
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]
      });
    ordersOrderItemFindMany.mockResolvedValue([{ id: "item_1", qty: "5.00" }]);
    ordersFulfillmentCount.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    ordersFulfillmentItemFindMany.mockResolvedValue([{ orderItemId: "item_1", qty: "5.00" }]);

    const service = new FulfillmentsService(prismaService);
    const result = await service.confirmExecution("ful_1", actor("warehouse_1", ["warehouse"]));

    expect(ordersFulfillmentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ful_1" },
        data: expect.objectContaining({
          status: "COMPLETED",
          fulfilledAt: expect.any(Date)
        })
      })
    );
    expect(ordersOrderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order_1" },
        data: expect.objectContaining({
          status: "SHIPPED",
          shippedAt: expect.any(Date)
        })
      })
    );
    const orderUpdatePayload = ordersOrderUpdate.mock.calls[0]?.[0]?.data as Record<string, unknown>;
    expect(orderUpdatePayload.paymentControlStatus).toBeUndefined();
    expect(orderUpdatePayload.deliveryStatus).toBeUndefined();
    expect(result.status).toBe("completed");
  });

  it("blocks confirm execution when shipment transition is invalid for current order state", async () => {
    const {
      prismaService,
      ordersFulfillmentFindFirst,
      ordersFulfillmentCount,
      ordersFulfillmentItemFindMany,
      ordersOrderItemFindMany,
      ordersOrderUpdate
    } = create_prisma_mock();
    ordersFulfillmentFindFirst.mockResolvedValueOnce({
      id: "ful_1",
      orderId: "order_1",
      status: "PENDING",
      fulfillmentType: "DELIVERY",
      order: {
        id: "order_1",
        status: "ASSEMBLING",
        paymentControlStatus: "NONE",
        paymentControlDueAt: null,
        readyForPartialShipmentAt: null,
        readyForShipmentAt: null,
        partiallyShippedAt: null,
        shippedAt: null
      }
    });
    ordersOrderItemFindMany.mockResolvedValue([{ id: "item_1", qty: "5.00" }]);
    ordersFulfillmentCount.mockResolvedValueOnce(1).mockResolvedValueOnce(1);
    ordersFulfillmentItemFindMany.mockResolvedValue([{ orderItemId: "item_1", qty: "2.00" }]);

    const service = new FulfillmentsService(prismaService);

    await expect(
      service.confirmExecution("ful_1", actor("warehouse_1", ["warehouse"]))
    ).rejects.toBeInstanceOf(ConflictException);
    expect(ordersOrderUpdate).not.toHaveBeenCalled();
  });
});
