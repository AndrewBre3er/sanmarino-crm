import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { ReturnRequestsService } from "../../src/modules/orders/return-requests.service";
import type { PrismaService } from "../../src/prisma/prisma.service";

function create_prisma_mock() {
  const ordersOrderFindFirst = vi.fn();
  const ordersOrderItemFindMany = vi.fn();
  const ordersReturnRequestFindFirst = vi.fn();
  const ordersReturnRequestCreate = vi.fn();
  const ordersReturnRequestUpdate = vi.fn();
  const ordersReturnRequestItemCreateMany = vi.fn();
  const ordersFulfillmentItemFindMany = vi.fn();
  const ordersFulfillmentAggregate = vi.fn();
  const inventoryReservationFindFirst = vi.fn();
  const inventoryInventoryMovementFindFirst = vi.fn();
  const inventoryInventoryMovementCreate = vi.fn();
  const auditLogRecordCreate = vi.fn();
  const systemIdempotencyRecordFindUnique = vi.fn();
  const systemIdempotencyRecordCreate = vi.fn();
  const systemIdempotencyRecordUpdate = vi.fn();

  const transactionClient = {
    ordersOrder: {
      findFirst: ordersOrderFindFirst
    },
    ordersOrderItem: {
      findMany: ordersOrderItemFindMany
    },
    ordersReturnRequest: {
      findFirst: ordersReturnRequestFindFirst,
      create: ordersReturnRequestCreate,
      update: ordersReturnRequestUpdate
    },
    ordersReturnRequestItem: {
      createMany: ordersReturnRequestItemCreateMany
    },
    ordersFulfillmentItem: {
      findMany: ordersFulfillmentItemFindMany
    },
    ordersFulfillment: {
      aggregate: ordersFulfillmentAggregate
    },
    inventoryReservation: {
      findFirst: inventoryReservationFindFirst
    },
    inventoryInventoryMovement: {
      findFirst: inventoryInventoryMovementFindFirst,
      create: inventoryInventoryMovementCreate
    },
    auditLogRecord: {
      create: auditLogRecordCreate
    },
    systemIdempotencyRecord: {
      update: systemIdempotencyRecordUpdate
    }
  };

  const prismaService = {
    ordersOrder: {
      findFirst: ordersOrderFindFirst
    },
    ordersOrderItem: {
      findMany: ordersOrderItemFindMany
    },
    ordersReturnRequest: {
      findFirst: ordersReturnRequestFindFirst,
      create: ordersReturnRequestCreate,
      update: ordersReturnRequestUpdate
    },
    ordersReturnRequestItem: {
      createMany: ordersReturnRequestItemCreateMany
    },
    ordersFulfillmentItem: {
      findMany: ordersFulfillmentItemFindMany
    },
    ordersFulfillment: {
      aggregate: ordersFulfillmentAggregate
    },
    inventoryReservation: {
      findFirst: inventoryReservationFindFirst
    },
    inventoryInventoryMovement: {
      findFirst: inventoryInventoryMovementFindFirst,
      create: inventoryInventoryMovementCreate
    },
    auditLogRecord: {
      create: auditLogRecordCreate
    },
    systemIdempotencyRecord: {
      findUnique: systemIdempotencyRecordFindUnique,
      create: systemIdempotencyRecordCreate,
      update: systemIdempotencyRecordUpdate
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
    ordersOrderFindFirst,
    ordersOrderItemFindMany,
    ordersReturnRequestFindFirst,
    ordersReturnRequestCreate,
    ordersReturnRequestUpdate,
    ordersReturnRequestItemCreateMany,
    ordersFulfillmentItemFindMany,
    ordersFulfillmentAggregate,
    inventoryReservationFindFirst,
    inventoryInventoryMovementFindFirst,
    inventoryInventoryMovementCreate,
    auditLogRecordCreate,
    systemIdempotencyRecordFindUnique,
    systemIdempotencyRecordCreate,
    systemIdempotencyRecordUpdate
  };
}

function build_return_request_record(status: "CREATED" | "CONFIRMED" | "PROCESSED" | "CLOSED") {
  const createdAt = new Date("2026-04-20T10:00:00.000Z");
  return {
    id: "ret_1",
    orderId: "order_1",
    status,
    reason: "Need return",
    requestedRefundAmount: "0.00",
    approvedRefundAmount: null,
    realizationAnchorAt: null,
    confirmedAt: null,
    requiresCeoApproval: false,
    ceoApprovedBy: null,
    ceoApprovedAt: null,
    processedAt: null,
    closedAt: null,
    createdAt,
    updatedAt: createdAt,
    version: 1,
    isDeleted: false,
    items: [
      {
        id: "ret_item_1",
        orderItemId: "order_item_1",
        qty: "1.000",
        resolution: "return_to_quarantine",
        orderItem: {
          id: "order_item_1",
          productId: "product_1"
        }
      }
    ]
  };
}

describe("return requests service", () => {
  it("creates return request with item-level composition", async () => {
    const {
      prismaService,
      ordersOrderFindFirst,
      ordersOrderItemFindMany,
      ordersFulfillmentItemFindMany,
      ordersReturnRequestCreate,
      ordersReturnRequestFindFirst,
      ordersReturnRequestItemCreateMany,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate
    } = create_prisma_mock();
    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_create_1" });
    ordersOrderFindFirst.mockResolvedValue({ id: "order_1" });
    ordersOrderItemFindMany.mockResolvedValue([{ id: "order_item_1", qty: "2.000" }]);
    ordersFulfillmentItemFindMany.mockResolvedValue([{ orderItemId: "order_item_1", qty: "1.000" }]);
    ordersReturnRequestCreate.mockResolvedValue({ id: "ret_1" });
    ordersReturnRequestFindFirst.mockResolvedValue(build_return_request_record("CREATED"));

    const service = new ReturnRequestsService(prismaService);
    const created = await service.createReturnRequest(
      {
        orderId: "order_1",
        reason: "Need return",
        items: [{ orderItemId: "order_item_1", quantity: "1.000" }]
      },
      {
        userId: "seller_1",
        roleCodes: ["seller"]
      },
      {
        idempotencyKey: "idem_create_1"
      }
    );

    expect(created.status).toBe("created");
    expect(ordersReturnRequestItemCreateMany).toHaveBeenCalledOnce();
    expect(ordersReturnRequestItemCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            orderItemId: "order_item_1",
            qty: "1.000",
            resolution: "return_to_quarantine"
          })
        ])
      })
    );
  });

  it("blocks creating return when requested qty exceeds completed fulfilled qty", async () => {
    const {
      prismaService,
      ordersOrderFindFirst,
      ordersOrderItemFindMany,
      ordersFulfillmentItemFindMany,
      ordersReturnRequestCreate,
      ordersReturnRequestFindFirst,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate
    } = create_prisma_mock();
    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_create_qty" });
    ordersOrderFindFirst.mockResolvedValue({ id: "order_1" });
    ordersOrderItemFindMany.mockResolvedValue([{ id: "order_item_1", qty: "2.000" }]);
    ordersFulfillmentItemFindMany.mockResolvedValue([{ orderItemId: "order_item_1", qty: "1.000" }]);
    ordersReturnRequestCreate.mockResolvedValue({ id: "ret_1" });
    ordersReturnRequestFindFirst.mockResolvedValue(build_return_request_record("CREATED"));

    const service = new ReturnRequestsService(prismaService);

    await expect(
      service.createReturnRequest(
        {
          orderId: "order_1",
          reason: "Need return",
          items: [{ orderItemId: "order_item_1", quantity: "1.500" }]
        },
        {
          userId: "seller_1",
          roleCodes: ["seller"]
        },
        {
          idempotencyKey: "idem_create_qty"
        }
      )
    ).rejects.toBeInstanceOf(ConflictException);
    expect(ordersReturnRequestCreate).not.toHaveBeenCalled();
  });

  it("requires ceo approval for stale confirmations (>14 days)", async () => {
    const {
      prismaService,
      ordersReturnRequestFindFirst,
      ordersFulfillmentItemFindMany,
      ordersFulfillmentAggregate,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate
    } = create_prisma_mock();
    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_confirm_1" });
    ordersReturnRequestFindFirst.mockResolvedValue(build_return_request_record("CREATED"));
    ordersFulfillmentItemFindMany.mockResolvedValue([{ orderItemId: "order_item_1", qty: "1.000" }]);
    ordersFulfillmentAggregate.mockResolvedValue({
      _min: {
        fulfilledAt: new Date("2026-03-01T10:00:00.000Z")
      }
    });

    const service = new ReturnRequestsService(prismaService);

    await expect(
      service.confirmReturnRequest(
        "ret_1",
        {
          userId: "seller_1",
          roleCodes: ["seller"]
        },
        { idempotencyKey: "idem_confirm_1" }
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("confirms return and stores anchor + ceo approval metadata", async () => {
    const {
      prismaService,
      ordersReturnRequestFindFirst,
      ordersReturnRequestUpdate,
      ordersFulfillmentItemFindMany,
      ordersFulfillmentAggregate,
      auditLogRecordCreate,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate
    } = create_prisma_mock();
    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_confirm_2" });
    ordersReturnRequestFindFirst
      .mockResolvedValueOnce(build_return_request_record("CREATED"))
      .mockResolvedValueOnce({
        ...build_return_request_record("CONFIRMED"),
        confirmedAt: new Date("2026-04-20T12:00:00.000Z"),
        realizationAnchorAt: new Date("2026-03-01T10:00:00.000Z"),
        requiresCeoApproval: true,
        ceoApprovedBy: "ceo_1",
        ceoApprovedAt: new Date("2026-04-20T12:00:00.000Z")
      });
    ordersFulfillmentItemFindMany.mockResolvedValue([{ orderItemId: "order_item_1", qty: "1.000" }]);
    ordersFulfillmentAggregate.mockResolvedValue({
      _min: {
        fulfilledAt: new Date("2026-03-01T10:00:00.000Z")
      }
    });

    const service = new ReturnRequestsService(prismaService);
    const confirmed = await service.confirmReturnRequest(
      "ret_1",
      {
        userId: "ceo_1",
        roleCodes: ["ceo"]
      },
      { idempotencyKey: "idem_confirm_2" }
    );

    expect(confirmed.status).toBe("confirmed");
    expect(confirmed.requiresCeoApproval).toBe(true);
    expect(ordersReturnRequestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ret_1" },
        data: expect.objectContaining({
          status: "CONFIRMED",
          realizationAnchorAt: expect.any(Date),
          requiresCeoApproval: true,
          ceoApprovedBy: "ceo_1",
          ceoApprovedAt: expect.any(Date)
        })
      })
    );
    expect(auditLogRecordCreate).toHaveBeenCalledOnce();
  });

  it("processes return through quarantine path only", async () => {
    const {
      prismaService,
      ordersReturnRequestFindFirst,
      ordersReturnRequestUpdate,
      inventoryReservationFindFirst,
      inventoryInventoryMovementCreate,
      auditLogRecordCreate,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate
    } = create_prisma_mock();
    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_process_1" });
    ordersReturnRequestFindFirst
      .mockResolvedValueOnce({
        ...build_return_request_record("CONFIRMED"),
        confirmedAt: new Date("2026-04-20T12:00:00.000Z")
      })
      .mockResolvedValueOnce({
        ...build_return_request_record("PROCESSED"),
        processedAt: new Date("2026-04-20T13:00:00.000Z")
      });
    inventoryReservationFindFirst.mockResolvedValue({ warehouseId: "wh_1" });

    const service = new ReturnRequestsService(prismaService);
    const processed = await service.processReturnRequest(
      "ret_1",
      {
        userId: "warehouse_1",
        roleCodes: ["warehouse"]
      },
      { idempotencyKey: "idem_process_1" }
    );

    expect(processed.status).toBe("processed");
    expect(inventoryInventoryMovementCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          movementType: "TRANSFER_TO_QUARANTINE",
          bucketTo: "QUARANTINE",
          returnRequestId: "ret_1"
        })
      })
    );
    expect(ordersReturnRequestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PROCESSED",
          processedAt: expect.any(Date)
        })
      })
    );
    expect(auditLogRecordCreate).toHaveBeenCalledOnce();
  });

  it("blocks close before processed state", async () => {
    const {
      prismaService,
      ordersReturnRequestFindFirst,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate
    } = create_prisma_mock();
    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_close_1" });
    ordersReturnRequestFindFirst.mockResolvedValue(build_return_request_record("CONFIRMED"));

    const service = new ReturnRequestsService(prismaService);

    await expect(
      service.closeReturnRequest(
        "ret_1",
        {
          userId: "finance_1",
          roleCodes: ["finance"]
        },
        { idempotencyKey: "idem_close_1" }
      )
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("returns not found for unknown return request", async () => {
    const {
      prismaService,
      ordersReturnRequestFindFirst,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate
    } = create_prisma_mock();
    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_missing" });
    ordersReturnRequestFindFirst.mockResolvedValue(null);

    const service = new ReturnRequestsService(prismaService);

    await expect(
      service.confirmReturnRequest(
        "ret_missing",
        {
          userId: "ceo_1",
          roleCodes: ["ceo"]
        },
        { idempotencyKey: "idem_missing" }
      )
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
