import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { LogisticsResourcesController } from "../../src/modules/logistics/logistics-resources.controller";
import type { LogisticsResourcesService } from "../../src/modules/logistics/logistics-resources.service";

function create_controller() {
  const service = {
    listDeliverySlots: vi.fn(),
    getDeliverySlot: vi.fn(),
    createDeliverySlot: vi.fn(),
    patchDeliverySlot: vi.fn(),
    listPickupWindows: vi.fn(),
    getPickupWindow: vi.fn(),
    createPickupWindow: vi.fn(),
    patchPickupWindow: vi.fn(),
    listRouteDays: vi.fn(),
    getRouteDay: vi.fn(),
    createRouteDay: vi.fn(),
    patchRouteDay: vi.fn(),
    listDrivers: vi.fn(),
    getDriver: vi.fn(),
    createDriver: vi.fn(),
    patchDriver: vi.fn(),
    listVehicles: vi.fn(),
    getVehicle: vi.fn(),
    createVehicle: vi.fn(),
    patchVehicle: vi.fn()
  } as unknown as LogisticsResourcesService;

  const controller = new LogisticsResourcesController(service);
  return { controller, service };
}

const logistics_request = {
  auth: {
    user: {
      userId: "logistics_1",
      email: "logistics_1@local",
      login: "logistics_1@local",
      displayName: "Logistics 1",
      primaryRole: "logistics",
      roleCodes: ["logistics"],
      allowedWorkspaces: ["logistics"],
      permissionCodes: [],
      roleCode: "logistics",
      optionalRole: false
    },
    session: {
      sessionId: "s1",
      issuedAt: "2026-04-06T00:00:00.000Z",
      refreshExpiresAt: "2026-04-07T00:00:00.000Z"
    }
  },
  shellContext: {
    idempotencyKey: "idem_1"
  }
} as const;

describe("logistics resources controller", () => {
  it("returns list/detail baseline responses", async () => {
    const { controller, service } = create_controller();
    (service.listDeliverySlots as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [
        {
          id: "slot_1",
          slotDate: "2026-04-12T00:00:00.000Z",
          windowStart: "2026-04-12T09:00:00.000Z",
          windowEnd: "2026-04-12T11:00:00.000Z",
          capacity: 5,
          reservedCount: 0,
          status: "open",
          createdAt: "2026-04-10T00:00:00.000Z",
          updatedAt: "2026-04-10T00:00:00.000Z"
        }
      ],
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1
      }
    });
    (service.getRouteDay as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "route_1",
      routeDate: "2026-04-12T00:00:00.000Z",
      driverId: null,
      vehicleId: null,
      status: "planned",
      notes: null,
      createdAt: "2026-04-10T00:00:00.000Z",
      updatedAt: "2026-04-10T00:00:00.000Z"
    });

    const listResponse = await controller.listDeliverySlots({}, logistics_request);
    const detailResponse = await controller.detailRouteDay("route_1", logistics_request);

    expect(listResponse.data).toHaveLength(1);
    expect(listResponse.meta.pagination.mode).toBe("page");
    expect(detailResponse).toEqual({
      data: expect.objectContaining({ id: "route_1", status: "planned" })
    });
  });

  it("forwards create/patch commands with command context", async () => {
    const { controller, service } = create_controller();
    (service.createDriver as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "driver_1"
    });
    (service.patchVehicle as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "vehicle_1"
    });

    await controller.createDriver({ name: "Driver One" }, logistics_request);
    await controller.patchVehicle("vehicle_1", { name: "Van 2" }, logistics_request);

    expect(service.createDriver).toHaveBeenCalledWith(
      { name: "Driver One" },
      logistics_request.auth.user,
      expect.objectContaining({ idempotencyKey: "idem_1" })
    );
    expect(service.patchVehicle).toHaveBeenCalledWith(
      "vehicle_1",
      { name: "Van 2" },
      logistics_request.auth.user,
      expect.objectContaining({ idempotencyKey: "idem_1" })
    );
  });

  it("rejects command calls without Idempotency-Key header", async () => {
    const { controller } = create_controller();
    const requestWithoutIdempotency = {
      auth: logistics_request.auth
    };

    await expect(
      controller.createVehicle({ name: "Van 1" }, requestWithoutIdempotency)
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
