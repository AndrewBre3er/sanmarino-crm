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
  const logisticsDeliveryTaskFindUnique = vi.fn();
  const logisticsDeliveryTaskCreate = vi.fn();
  const logisticsDeliveryTaskUpdate = vi.fn();
  const systemIdempotencyRecordFindUnique = vi.fn();
  const systemIdempotencyRecordCreate = vi.fn();
  const systemIdempotencyRecordUpdate = vi.fn();

  const transactionClient = {
    ordersOrder: {
      findFirst: ordersOrderFindFirst
    },
    logisticsDeliveryTask: {
      findUnique: logisticsDeliveryTaskFindUnique,
      create: logisticsDeliveryTaskCreate,
      update: logisticsDeliveryTaskUpdate
    },
    systemIdempotencyRecord: {
      update: systemIdempotencyRecordUpdate
    }
  };

  const prismaService = {
    ordersOrder: {
      findFirst: ordersOrderFindFirst
    },
    logisticsDeliveryTask: {
      findUnique: logisticsDeliveryTaskFindUnique,
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
    logisticsDeliveryTaskFindUnique,
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
  it("creates delivery task and keeps createdBy from actor context", async () => {
    const {
      service,
      deliveryTaskReadRepository,
      ordersOrderFindFirst,
      logisticsDeliveryTaskCreate,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate
    } = create_service_with_mocks();

    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_create_1" });
    ordersOrderFindFirst.mockResolvedValue({ id: "order_1" });
    logisticsDeliveryTaskCreate.mockResolvedValue({ id: "task_1" });
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
  });

  it("supports valid transition planned -> assigned", async () => {
    const {
      service,
      deliveryTaskReadRepository,
      logisticsDeliveryTaskFindUnique,
      logisticsDeliveryTaskUpdate,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate
    } = create_service_with_mocks();

    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_assign_1" });
    logisticsDeliveryTaskFindUnique.mockResolvedValue({
      id: "task_1",
      status: "PLANNED"
    });
    logisticsDeliveryTaskUpdate.mockResolvedValue({ id: "task_1" });
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
  });

  it("supports valid transition assigned -> in_transit", async () => {
    const {
      service,
      deliveryTaskReadRepository,
      logisticsDeliveryTaskFindUnique,
      logisticsDeliveryTaskUpdate,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate
    } = create_service_with_mocks();

    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_start_1" });
    logisticsDeliveryTaskFindUnique.mockResolvedValue({
      id: "task_1",
      status: "ASSIGNED"
    });
    logisticsDeliveryTaskUpdate.mockResolvedValue({ id: "task_1" });
    (deliveryTaskReadRepository.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      build_delivery_task_read_model("in_transit")
    );

    const result = await service.startTransitDeliveryTask(
      "task_1",
      { userId: "logistics_1", roleCodes: ["logistics"] },
      { idempotencyKey: "idem_start_1" }
    );

    expect(result.status).toBe("in_transit");
    expect(logisticsDeliveryTaskUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "IN_TRANSIT"
        })
      })
    );
  });

  it("rejects invalid transition delivered -> assigned", async () => {
    const {
      service,
      logisticsDeliveryTaskFindUnique,
      logisticsDeliveryTaskUpdate,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate,
      systemIdempotencyRecordUpdate
    } = create_service_with_mocks();

    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_assign_2" });
    logisticsDeliveryTaskFindUnique.mockResolvedValue({
      id: "task_1",
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
    expect(logisticsDeliveryTaskCreate).not.toHaveBeenCalled();
    expect(systemIdempotencyRecordCreate).not.toHaveBeenCalled();
  });

  it("returns idempotency conflict when same key is reused with different payload", async () => {
    const {
      service,
      ordersOrderFindFirst,
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
    expect(logisticsDeliveryTaskCreate).not.toHaveBeenCalled();
    expect(systemIdempotencyRecordCreate).not.toHaveBeenCalled();
  });
});

