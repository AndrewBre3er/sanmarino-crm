import { createHash } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  NotFoundException
} from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { LogisticsResourcesService } from "../../src/modules/logistics/logistics-resources.service";
import type { ReadCollectionQueryInput } from "../../src/modules/read-side/shared/read-model.contract";
import type { PrismaService } from "../../src/prisma/prisma.service";

function build_query(status?: string[]): ReadCollectionQueryInput {
  return {
    page: 1,
    pageSize: 20,
    includeDeleted: false,
    sortField: "createdAt",
    sortDirection: "desc",
    ...(status ? { status } : {}),
    contract: {
      pagination: {
        mode: "page",
        page: {
          page: 1,
          pageSize: 20
        }
      }
    }
  };
}

function build_delivery_slot_record() {
  return {
    id: "slot_1",
    slotDate: new Date("2026-04-12T00:00:00.000Z"),
    windowStart: new Date("2026-04-12T09:00:00.000Z"),
    windowEnd: new Date("2026-04-12T11:00:00.000Z"),
    capacity: 5,
    reservedCount: 0,
    status: "OPEN",
    createdAt: new Date("2026-04-10T00:00:00.000Z"),
    updatedAt: new Date("2026-04-10T00:00:00.000Z")
  };
}

function build_driver_record() {
  return {
    id: "driver_1",
    userId: null,
    name: "Driver One",
    phone: "+79990000000",
    isActive: true,
    createdAt: new Date("2026-04-10T00:00:00.000Z"),
    updatedAt: new Date("2026-04-10T00:00:00.000Z")
  };
}

function build_vehicle_record() {
  return {
    id: "vehicle_1",
    plateNumber: "A111AA77",
    name: "Van 1",
    capacityNotes: "up to 2 tons",
    isActive: true,
    createdAt: new Date("2026-04-10T00:00:00.000Z"),
    updatedAt: new Date("2026-04-10T00:00:00.000Z")
  };
}

function create_prisma_mock() {
  const logisticsDeliverySlotFindMany = vi.fn();
  const logisticsDeliverySlotCount = vi.fn();
  const logisticsDeliverySlotFindFirst = vi.fn();
  const logisticsDeliverySlotFindUnique = vi.fn();
  const logisticsDeliverySlotCreate = vi.fn();
  const logisticsDeliverySlotUpdate = vi.fn();

  const logisticsPickupWindowFindMany = vi.fn();
  const logisticsPickupWindowCount = vi.fn();
  const logisticsPickupWindowFindFirst = vi.fn();
  const logisticsPickupWindowFindUnique = vi.fn();
  const logisticsPickupWindowCreate = vi.fn();
  const logisticsPickupWindowUpdate = vi.fn();

  const logisticsDriverFindMany = vi.fn();
  const logisticsDriverCount = vi.fn();
  const logisticsDriverFindFirst = vi.fn();
  const logisticsDriverFindUnique = vi.fn();
  const logisticsDriverCreate = vi.fn();
  const logisticsDriverUpdate = vi.fn();

  const logisticsVehicleFindMany = vi.fn();
  const logisticsVehicleCount = vi.fn();
  const logisticsVehicleFindFirst = vi.fn();
  const logisticsVehicleFindUnique = vi.fn();
  const logisticsVehicleCreate = vi.fn();
  const logisticsVehicleUpdate = vi.fn();

  const logisticsRouteDayFindMany = vi.fn();
  const logisticsRouteDayCount = vi.fn();
  const logisticsRouteDayFindFirst = vi.fn();
  const logisticsRouteDayFindUnique = vi.fn();
  const logisticsRouteDayCreate = vi.fn();
  const logisticsRouteDayUpdate = vi.fn();

  const usersUserFindFirst = vi.fn();
  const systemIdempotencyRecordFindUnique = vi.fn();
  const systemIdempotencyRecordCreate = vi.fn();
  const systemIdempotencyRecordUpdate = vi.fn();

  const transactionClient = {
    logisticsDeliverySlot: {
      findFirst: logisticsDeliverySlotFindFirst,
      findUnique: logisticsDeliverySlotFindUnique,
      create: logisticsDeliverySlotCreate,
      update: logisticsDeliverySlotUpdate
    },
    logisticsPickupWindow: {
      findFirst: logisticsPickupWindowFindFirst,
      findUnique: logisticsPickupWindowFindUnique,
      create: logisticsPickupWindowCreate,
      update: logisticsPickupWindowUpdate
    },
    logisticsDriver: {
      findFirst: logisticsDriverFindFirst,
      findUnique: logisticsDriverFindUnique,
      create: logisticsDriverCreate,
      update: logisticsDriverUpdate
    },
    logisticsVehicle: {
      findFirst: logisticsVehicleFindFirst,
      findUnique: logisticsVehicleFindUnique,
      create: logisticsVehicleCreate,
      update: logisticsVehicleUpdate
    },
    logisticsRouteDay: {
      findFirst: logisticsRouteDayFindFirst,
      findUnique: logisticsRouteDayFindUnique,
      create: logisticsRouteDayCreate,
      update: logisticsRouteDayUpdate
    },
    usersUser: {
      findFirst: usersUserFindFirst
    },
    systemIdempotencyRecord: {
      update: systemIdempotencyRecordUpdate
    }
  };

  const prismaService = {
    logisticsDeliverySlot: {
      findMany: logisticsDeliverySlotFindMany,
      count: logisticsDeliverySlotCount,
      findFirst: logisticsDeliverySlotFindFirst,
      findUnique: logisticsDeliverySlotFindUnique,
      create: logisticsDeliverySlotCreate,
      update: logisticsDeliverySlotUpdate
    },
    logisticsPickupWindow: {
      findMany: logisticsPickupWindowFindMany,
      count: logisticsPickupWindowCount,
      findFirst: logisticsPickupWindowFindFirst,
      findUnique: logisticsPickupWindowFindUnique,
      create: logisticsPickupWindowCreate,
      update: logisticsPickupWindowUpdate
    },
    logisticsDriver: {
      findMany: logisticsDriverFindMany,
      count: logisticsDriverCount,
      findFirst: logisticsDriverFindFirst,
      findUnique: logisticsDriverFindUnique,
      create: logisticsDriverCreate,
      update: logisticsDriverUpdate
    },
    logisticsVehicle: {
      findMany: logisticsVehicleFindMany,
      count: logisticsVehicleCount,
      findFirst: logisticsVehicleFindFirst,
      findUnique: logisticsVehicleFindUnique,
      create: logisticsVehicleCreate,
      update: logisticsVehicleUpdate
    },
    logisticsRouteDay: {
      findMany: logisticsRouteDayFindMany,
      count: logisticsRouteDayCount,
      findFirst: logisticsRouteDayFindFirst,
      findUnique: logisticsRouteDayFindUnique,
      create: logisticsRouteDayCreate,
      update: logisticsRouteDayUpdate
    },
    usersUser: {
      findFirst: usersUserFindFirst
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
    logisticsDeliverySlotFindMany,
    logisticsDeliverySlotCount,
    logisticsDeliverySlotFindFirst,
    logisticsDeliverySlotFindUnique,
    logisticsDeliverySlotCreate,
    logisticsDeliverySlotUpdate,
    logisticsPickupWindowCreate,
    logisticsDriverFindFirst,
    logisticsDriverFindUnique,
    logisticsDriverCreate,
    logisticsDriverUpdate,
    logisticsVehicleFindFirst,
    logisticsVehicleFindUnique,
    logisticsVehicleCreate,
    logisticsVehicleUpdate,
    logisticsRouteDayFindFirst,
    logisticsRouteDayFindUnique,
    logisticsRouteDayCreate,
    logisticsRouteDayUpdate,
    usersUserFindFirst,
    systemIdempotencyRecordFindUnique,
    systemIdempotencyRecordCreate,
    systemIdempotencyRecordUpdate
  };
}

function create_service_with_mocks() {
  const prisma = create_prisma_mock();
  const service = new LogisticsResourcesService(prisma.prismaService);

  return {
    service,
    ...prisma
  };
}

const logistics_actor = { roleCodes: ["logistics"] as const };

describe("logistics resources service", () => {
  it("returns list/detail baseline for resources", async () => {
    const {
      service,
      logisticsDeliverySlotFindMany,
      logisticsDeliverySlotCount,
      logisticsVehicleFindFirst
    } = create_service_with_mocks();

    logisticsDeliverySlotFindMany.mockResolvedValue([build_delivery_slot_record()]);
    logisticsDeliverySlotCount.mockResolvedValue(1);
    logisticsVehicleFindFirst.mockResolvedValue(build_vehicle_record());

    const listResult = await service.listDeliverySlots(build_query(["open"]));
    const vehicle = await service.getVehicle("vehicle_1");

    expect(listResult.items).toHaveLength(1);
    expect(listResult.items[0]?.status).toBe("open");
    expect(vehicle.id).toBe("vehicle_1");
  });

  it("creates and patches resources with idempotent command envelope", async () => {
    const {
      service,
      logisticsDeliverySlotFindFirst,
      logisticsDeliverySlotCreate,
      logisticsDeliverySlotFindUnique,
      logisticsVehicleFindFirst,
      logisticsVehicleFindUnique,
      logisticsVehicleUpdate,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate,
      systemIdempotencyRecordUpdate
    } = create_service_with_mocks();

    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_1" });
    logisticsDeliverySlotCreate.mockResolvedValue({ id: "slot_1" });
    logisticsDeliverySlotFindFirst.mockResolvedValue(build_delivery_slot_record());

    const createdSlot = await service.createDeliverySlot(
      {
        slotDate: "2026-04-12T00:00:00.000Z",
        windowStart: "2026-04-12T09:00:00.000Z",
        windowEnd: "2026-04-12T11:00:00.000Z",
        capacity: 5,
        status: "open"
      },
      logistics_actor,
      { idempotencyKey: "idem_1" }
    );

    expect(createdSlot.id).toBe("slot_1");
    expect(systemIdempotencyRecordUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "COMPLETED" })
      })
    );

    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_2" });
    logisticsVehicleFindUnique.mockResolvedValue({ id: "vehicle_1" });
    logisticsVehicleUpdate.mockResolvedValue({ id: "vehicle_1" });
    logisticsVehicleFindFirst.mockResolvedValue({
      ...build_vehicle_record(),
      name: "Van 2"
    });

    const patchedVehicle = await service.patchVehicle(
      "vehicle_1",
      { name: "Van 2" },
      logistics_actor,
      { idempotencyKey: "idem_2" }
    );

    expect(logisticsDeliverySlotFindUnique).not.toHaveBeenCalled();
    expect(patchedVehicle.name).toBe("Van 2");
  });

  it("validates slot and route-day statuses against approved enums", async () => {
    const { service } = create_service_with_mocks();

    await expect(
      service.createDeliverySlot(
        {
          slotDate: "2026-04-12T00:00:00.000Z",
          windowStart: "2026-04-12T09:00:00.000Z",
          windowEnd: "2026-04-12T11:00:00.000Z",
          status: "unexpected" as never
        },
        logistics_actor,
        { idempotencyKey: "idem_invalid_1" }
      )
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.createRouteDay(
        {
          routeDate: "2026-04-12T00:00:00.000Z",
          status: "unexpected" as never
        },
        logistics_actor,
        { idempotencyKey: "idem_invalid_2" }
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("replays idempotent create without creating duplicate resource", async () => {
    const {
      service,
      logisticsDriverCreate,
      logisticsDriverFindFirst,
      systemIdempotencyRecordFindUnique
    } = create_service_with_mocks();

    const requestHash = createHash("sha256")
      .update(
        JSON.stringify({
          userId: null,
          name: "Driver One",
          phone: null,
          isActive: true
        })
      )
      .digest("hex");

    systemIdempotencyRecordFindUnique.mockResolvedValue({
      id: "idem_replay_1",
      requestHash,
      status: "COMPLETED",
      lockedUntil: null,
      responseBody: { driverId: "driver_1" }
    });
    logisticsDriverFindFirst.mockResolvedValue(build_driver_record());

    const replayed = await service.createDriver(
      { name: "Driver One" },
      logistics_actor,
      { idempotencyKey: "idem_replay_1" }
    );

    expect(replayed.id).toBe("driver_1");
    expect(logisticsDriverCreate).not.toHaveBeenCalled();
  });

  it("returns idempotency conflict for same key with different payload", async () => {
    const { service, logisticsVehicleCreate, systemIdempotencyRecordFindUnique } =
      create_service_with_mocks();

    systemIdempotencyRecordFindUnique.mockResolvedValue({
      id: "idem_conflict_1",
      requestHash: "another_hash",
      status: "COMPLETED",
      lockedUntil: null,
      responseBody: { vehicleId: "vehicle_1" }
    });

    await expect(
      service.createVehicle(
        { name: "Van 1" },
        logistics_actor,
        { idempotencyKey: "idem_conflict_1" }
      )
    ).rejects.toBeInstanceOf(ConflictException);

    expect(logisticsVehicleCreate).not.toHaveBeenCalled();
  });

  it("validates route-day linkage to existing driver and vehicle", async () => {
    const {
      service,
      logisticsDriverFindFirst,
      logisticsVehicleFindFirst,
      logisticsRouteDayFindUnique,
      logisticsRouteDayCreate,
      logisticsRouteDayUpdate,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate,
      systemIdempotencyRecordUpdate
    } = create_service_with_mocks();

    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_route_create_1" });
    logisticsDriverFindFirst.mockResolvedValue(null);

    await expect(
      service.createRouteDay(
        {
          routeDate: "2026-04-12T00:00:00.000Z",
          driverId: "driver_missing"
        },
        logistics_actor,
        { idempotencyKey: "idem_route_create_1" }
      )
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(logisticsRouteDayCreate).not.toHaveBeenCalled();
    expect(systemIdempotencyRecordUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED" })
      })
    );

    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_route_patch_1" });
    logisticsRouteDayFindUnique.mockResolvedValue({ id: "route_1" });
    logisticsVehicleFindFirst.mockResolvedValue(null);

    await expect(
      service.patchRouteDay(
        "route_1",
        { vehicleId: "vehicle_missing" },
        logistics_actor,
        { idempotencyKey: "idem_route_patch_1" }
      )
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(logisticsRouteDayUpdate).not.toHaveBeenCalled();
  });
});
