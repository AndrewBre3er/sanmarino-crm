import { createHash } from "node:crypto";
import { ConflictException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { LogisticsService } from "../../src/modules/logistics/logistics.service";
import type { PrismaLogisticsDeliveryTaskReadRepository } from "../../src/modules/read-side/logistics/delivery-task.read.repository";
import type { PrismaService } from "../../src/prisma/prisma.service";

function build_delivery_task_read_model(
  status: "planned" | "assigned" | "in_transit" | "delivered" | "failed" | "rescheduled" = "planned"
) {
  return {
    id: "task_1",
    orderId: "order_1",
    routeDayId: null,
    deliverySlotId: null,
    driverId: null,
    vehicleId: null,
    status,
    sequenceNo: null,
    plannedDate: null,
    deliveredAt: status === "delivered" ? new Date().toISOString() : null,
    failureReason: status === "failed" ? "failed" : null,
    addressText: null,
    recipientName: null,
    recipientPhone: null,
    createdBy: "logistics_1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1
  };
}

function create_prisma_mock() {
  const ordersOrderFindFirst = vi.fn();
  const ordersOrderUpdate = vi.fn().mockResolvedValue({ id: "order_1" });
  const logisticsDeliveryTaskFindUnique = vi.fn();
  const logisticsDeliveryTaskFindMany = vi.fn().mockResolvedValue([]);
  const logisticsDeliveryTaskCreate = vi.fn();
  const logisticsDeliveryTaskUpdate = vi.fn();
  const systemIdempotencyRecordFindUnique = vi.fn();
  const systemIdempotencyRecordCreate = vi.fn();
  const systemIdempotencyRecordUpdate = vi.fn();

  const transactionClient = {
    ordersOrder: {
      findFirst: ordersOrderFindFirst,
      update: ordersOrderUpdate
    },
    logisticsDeliveryTask: {
      findUnique: logisticsDeliveryTaskFindUnique,
      findMany: logisticsDeliveryTaskFindMany,
      create: logisticsDeliveryTaskCreate,
      update: logisticsDeliveryTaskUpdate
    },
    systemIdempotencyRecord: {
      update: systemIdempotencyRecordUpdate
    }
  };

  const prismaService = {
    ordersOrder: {
      findFirst: ordersOrderFindFirst,
      update: ordersOrderUpdate
    },
    logisticsDeliveryTask: {
      findUnique: logisticsDeliveryTaskFindUnique,
      findMany: logisticsDeliveryTaskFindMany,
      create: logisticsDeliveryTaskCreate,
      update: logisticsDeliveryTaskUpdate
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
    ordersOrderUpdate,
    logisticsDeliveryTaskFindUnique,
    logisticsDeliveryTaskFindMany,
    logisticsDeliveryTaskCreate,
    logisticsDeliveryTaskUpdate,
    systemIdempotencyRecordFindUnique,
    systemIdempotencyRecordCreate,
    systemIdempotencyRecordUpdate
  };
}

function create_service_with_mocks() {
  const prisma = create_prisma_mock();
  const deliveryTaskReadRepository = {
    getById: vi.fn(),
    list: vi.fn()
  } as unknown as PrismaLogisticsDeliveryTaskReadRepository;
  const service = new LogisticsService(prisma.prismaService, deliveryTaskReadRepository);

  return {
    service,
    deliveryTaskReadRepository,
    ...prisma
  };
}

describe("logistics service", () => {
  it("creates delivery task, keeps createdBy from actor, and aggregates delivery status to scheduled", async () => {
    const {
      service,
      deliveryTaskReadRepository,
      ordersOrderFindFirst,
      ordersOrderUpdate,
      logisticsDeliveryTaskFindMany,
      logisticsDeliveryTaskCreate,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate
    } = create_service_with_mocks();

    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_create_1" });
    ordersOrderFindFirst.mockResolvedValue({ id: "order_1" });
    logisticsDeliveryTaskCreate.mockResolvedValue({ id: "task_1" });
    logisticsDeliveryTaskFindMany.mockResolvedValue([{ status: "PLANNED" }]);
    (deliveryTaskReadRepository.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      build_delivery_task_read_model("planned")
    );

    const result = await service.createDeliveryTask(
      { orderId: "order_1" },
      { userId: "logistics_1", roleCodes: ["logistics"] },
      { idempotencyKey: "idem_create_1" }
    );

    expect(result.id).toBe("task_1");
    expect(logisticsDeliveryTaskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          createdBy: "logistics_1"
        })
      })
    );
    expect(ordersOrderUpdate).toHaveBeenCalledWith({
      where: { id: "order_1" },
      data: { deliveryStatus: "SCHEDULED" }
    });
    const orderUpdatePayload = ordersOrderUpdate.mock.calls[0]?.[0]?.data as Record<
      string,
      unknown
    >;
    expect(orderUpdatePayload.status).toBeUndefined();
    expect(orderUpdatePayload.paymentControlStatus).toBeUndefined();
  });

  it("supports valid transition planned -> assigned and keeps aggregate scheduled", async () => {
    const {
      service,
      deliveryTaskReadRepository,
      ordersOrderUpdate,
      logisticsDeliveryTaskFindUnique,
      logisticsDeliveryTaskFindMany,
      logisticsDeliveryTaskUpdate,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate
    } = create_service_with_mocks();

    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_assign_1" });
    logisticsDeliveryTaskFindUnique.mockResolvedValue({
      id: "task_1",
      orderId: "order_1",
      status: "PLANNED"
    });
    logisticsDeliveryTaskUpdate.mockResolvedValue({ id: "task_1" });
    logisticsDeliveryTaskFindMany.mockResolvedValue([{ status: "ASSIGNED" }]);
    (deliveryTaskReadRepository.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      build_delivery_task_read_model("assigned")
    );

    const result = await service.assignDeliveryTask(
      "task_1",
      { sequenceNo: 1 },
      { userId: "logistics_1", roleCodes: ["logistics"] },
      { idempotencyKey: "idem_assign_1" }
    );

    expect(result.status).toBe("assigned");
    expect(logisticsDeliveryTaskUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "ASSIGNED"
        })
      })
    );
    expect(ordersOrderUpdate).toHaveBeenCalledWith({
      where: { id: "order_1" },
      data: { deliveryStatus: "SCHEDULED" }
    });
  });

  it("aggregates partially_delivered for mixed delivery task states", async () => {
    const {
      service,
      deliveryTaskReadRepository,
      ordersOrderUpdate,
      logisticsDeliveryTaskFindUnique,
      logisticsDeliveryTaskFindMany,
      logisticsDeliveryTaskUpdate,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate
    } = create_service_with_mocks();

    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_deliver_partial_1" });
    logisticsDeliveryTaskFindUnique.mockResolvedValue({
      id: "task_1",
      orderId: "order_1",
      status: "IN_TRANSIT",
      deliveredAt: null
    });
    logisticsDeliveryTaskUpdate.mockResolvedValue({ id: "task_1" });
    logisticsDeliveryTaskFindMany.mockResolvedValue([
      { status: "DELIVERED" },
      { status: "ASSIGNED" }
    ]);
    (deliveryTaskReadRepository.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      build_delivery_task_read_model("delivered")
    );

    const result = await service.deliverDeliveryTask(
      "task_1",
      {},
      { userId: "logistics_1", roleCodes: ["logistics"] },
      { idempotencyKey: "idem_deliver_partial_1" }
    );

    expect(result.status).toBe("delivered");
    expect(ordersOrderUpdate).toHaveBeenCalledWith({
      where: { id: "order_1" },
      data: { deliveryStatus: "PARTIALLY_DELIVERED" }
    });
  });

  it("aggregates delivered when all delivery tasks are delivered", async () => {
    const {
      service,
      deliveryTaskReadRepository,
      ordersOrderUpdate,
      logisticsDeliveryTaskFindUnique,
      logisticsDeliveryTaskFindMany,
      logisticsDeliveryTaskUpdate,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate
    } = create_service_with_mocks();

    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_deliver_full_1" });
    logisticsDeliveryTaskFindUnique.mockResolvedValue({
      id: "task_1",
      orderId: "order_1",
      status: "IN_TRANSIT",
      deliveredAt: null
    });
    logisticsDeliveryTaskUpdate.mockResolvedValue({ id: "task_1" });
    logisticsDeliveryTaskFindMany.mockResolvedValue([
      { status: "DELIVERED" },
      { status: "DELIVERED" }
    ]);
    (deliveryTaskReadRepository.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      build_delivery_task_read_model("delivered")
    );

    await service.deliverDeliveryTask(
      "task_1",
      {},
      { userId: "logistics_1", roleCodes: ["logistics"] },
      { idempotencyKey: "idem_deliver_full_1" }
    );

    expect(ordersOrderUpdate).toHaveBeenCalledWith({
      where: { id: "order_1" },
      data: { deliveryStatus: "DELIVERED" }
    });
  });

  it("aggregates failed only when all delivery tasks are failed", async () => {
    const {
      service,
      deliveryTaskReadRepository,
      ordersOrderUpdate,
      logisticsDeliveryTaskFindUnique,
      logisticsDeliveryTaskFindMany,
      logisticsDeliveryTaskUpdate,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate
    } = create_service_with_mocks();

    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_fail_1" });
    logisticsDeliveryTaskFindUnique.mockResolvedValue({
      id: "task_1",
      orderId: "order_1",
      status: "IN_TRANSIT"
    });
    logisticsDeliveryTaskUpdate.mockResolvedValue({ id: "task_1" });
    logisticsDeliveryTaskFindMany.mockResolvedValue([{ status: "FAILED" }]);
    (deliveryTaskReadRepository.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      build_delivery_task_read_model("failed")
    );

    await service.failDeliveryTask(
      "task_1",
      { failureReason: "client_absent" },
      { userId: "logistics_1", roleCodes: ["logistics"] },
      { idempotencyKey: "idem_fail_1" }
    );

    expect(ordersOrderUpdate).toHaveBeenCalledWith({
      where: { id: "order_1" },
      data: { deliveryStatus: "FAILED" }
    });
  });

  it("does not aggregate failed for mixed failed + active tasks (keeps scheduled)", async () => {
    const {
      service,
      deliveryTaskReadRepository,
      ordersOrderUpdate,
      logisticsDeliveryTaskFindUnique,
      logisticsDeliveryTaskFindMany,
      logisticsDeliveryTaskUpdate,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate
    } = create_service_with_mocks();

    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_fail_2" });
    logisticsDeliveryTaskFindUnique.mockResolvedValue({
      id: "task_1",
      orderId: "order_1",
      status: "ASSIGNED"
    });
    logisticsDeliveryTaskUpdate.mockResolvedValue({ id: "task_1" });
    logisticsDeliveryTaskFindMany.mockResolvedValue([
      { status: "FAILED" },
      { status: "PLANNED" }
    ]);
    (deliveryTaskReadRepository.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      build_delivery_task_read_model("failed")
    );

    await service.failDeliveryTask(
      "task_1",
      { failureReason: "address_not_found" },
      { userId: "logistics_1", roleCodes: ["logistics"] },
      { idempotencyKey: "idem_fail_2" }
    );

    expect(ordersOrderUpdate).toHaveBeenCalledWith({
      where: { id: "order_1" },
      data: { deliveryStatus: "SCHEDULED" }
    });
  });

  it("rejects invalid transition delivered -> assigned", async () => {
    const {
      service,
      logisticsDeliveryTaskFindUnique,
      logisticsDeliveryTaskUpdate,
      ordersOrderUpdate,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate,
      systemIdempotencyRecordUpdate
    } = create_service_with_mocks();

    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_assign_2" });
    logisticsDeliveryTaskFindUnique.mockResolvedValue({
      id: "task_1",
      orderId: "order_1",
      status: "DELIVERED"
    });

    await expect(
      service.assignDeliveryTask(
        "task_1",
        {},
        { userId: "logistics_1", roleCodes: ["logistics"] },
        { idempotencyKey: "idem_assign_2" }
      )
    ).rejects.toBeInstanceOf(ConflictException);

    expect(logisticsDeliveryTaskUpdate).not.toHaveBeenCalled();
    expect(ordersOrderUpdate).not.toHaveBeenCalled();
    expect(systemIdempotencyRecordUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED"
        })
      })
    );
  });

  it("replays idempotent create without second mutation", async () => {
    const {
      service,
      deliveryTaskReadRepository,
      ordersOrderFindFirst,
      ordersOrderUpdate,
      logisticsDeliveryTaskCreate,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate
    } = create_service_with_mocks();

    const requestHash = createHash("sha256")
      .update(
        JSON.stringify({
          orderId: "order_1",
          routeDayId: null,
          deliverySlotId: null,
          driverId: null,
          vehicleId: null,
          sequenceNo: null,
          plannedDate: null,
          addressText: null,
          recipientName: null,
          recipientPhone: null
        })
      )
      .digest("hex");
    systemIdempotencyRecordFindUnique.mockResolvedValue({
      id: "idem_replay_create_1",
      requestHash,
      status: "COMPLETED",
      lockedUntil: null,
      responseBody: { taskId: "task_1" }
    });
    (deliveryTaskReadRepository.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      build_delivery_task_read_model("planned")
    );

    const result = await service.createDeliveryTask(
      { orderId: "order_1" },
      { userId: "logistics_1", roleCodes: ["logistics"] },
      { idempotencyKey: "idem_replay_create_1" }
    );

    expect(result.id).toBe("task_1");
    expect(ordersOrderFindFirst).not.toHaveBeenCalled();
    expect(ordersOrderUpdate).not.toHaveBeenCalled();
    expect(logisticsDeliveryTaskCreate).not.toHaveBeenCalled();
    expect(systemIdempotencyRecordCreate).not.toHaveBeenCalled();
  });

  it("returns idempotency conflict when same key is reused with different payload", async () => {
    const {
      service,
      ordersOrderFindFirst,
      ordersOrderUpdate,
      logisticsDeliveryTaskCreate,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate
    } = create_service_with_mocks();

    systemIdempotencyRecordFindUnique.mockResolvedValue({
      id: "idem_conflict_1",
      requestHash: "another_hash",
      status: "COMPLETED",
      lockedUntil: null,
      responseBody: { taskId: "task_1" }
    });

    await expect(
      service.createDeliveryTask(
        { orderId: "order_1" },
        { userId: "logistics_1", roleCodes: ["logistics"] },
        { idempotencyKey: "idem_conflict_1" }
      )
    ).rejects.toBeInstanceOf(ConflictException);

    expect(ordersOrderFindFirst).not.toHaveBeenCalled();
    expect(ordersOrderUpdate).not.toHaveBeenCalled();
    expect(logisticsDeliveryTaskCreate).not.toHaveBeenCalled();
    expect(systemIdempotencyRecordCreate).not.toHaveBeenCalled();
  });
});

