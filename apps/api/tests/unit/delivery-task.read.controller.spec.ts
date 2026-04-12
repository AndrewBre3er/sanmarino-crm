import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { DeliveryTasksReadController } from "../../src/modules/read-side/logistics/delivery-task.read.controller";
import type { GetDeliveryTaskDetailUseCase } from "../../src/modules/read-side/logistics/delivery-task.read.use-cases";
import type { ListDeliveryTasksUseCase } from "../../src/modules/read-side/logistics/delivery-task.read.use-cases";

function build_delivery_task_read_model() {
  return {
    id: "task_1",
    orderId: "order_1",
    routeDayId: null,
    deliverySlotId: null,
    driverId: null,
    vehicleId: null,
    status: "planned",
    sequenceNo: 1,
    plannedDate: null,
    deliveredAt: null,
    failureReason: null,
    addressText: "Address 1",
    recipientName: "Client",
    recipientPhone: "+79990000000",
    createdBy: "logistics_1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1
  };
}

function create_controller() {
  const listUseCase = {
    execute: vi.fn()
  } as unknown as ListDeliveryTasksUseCase;
  const detailUseCase = {
    execute: vi.fn()
  } as unknown as GetDeliveryTaskDetailUseCase;

  const controller = new DeliveryTasksReadController(listUseCase, detailUseCase);
  return { controller, listUseCase, detailUseCase };
}

const seller_request = {
  auth: {
    user: {
      userId: "seller_1",
      email: "seller_1@local",
      login: "seller_1@local",
      displayName: "Seller 1",
      primaryRole: "seller",
      roleCodes: ["seller"],
      allowedWorkspaces: ["seller"],
      permissionCodes: [],
      roleCode: "seller",
      optionalRole: false
    },
    session: {
      sessionId: "s1",
      issuedAt: "2026-04-06T00:00:00.000Z",
      refreshExpiresAt: "2026-04-07T00:00:00.000Z"
    }
  }
} as const;

describe("delivery task read controller", () => {
  it("returns list baseline response", async () => {
    const { controller, listUseCase } = create_controller();
    (listUseCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [build_delivery_task_read_model()],
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1
      }
    });

    const response = await controller.list({}, seller_request);

    expect(response).toEqual({
      data: [expect.objectContaining({ id: "task_1", orderId: "order_1" })],
      meta: {
        pagination: {
          mode: "page",
          page: {
            page: 1,
            pageSize: 20,
            totalItems: 1,
            totalPages: 1
          }
        }
      }
    });
  });

  it("returns detail baseline response", async () => {
    const { controller, detailUseCase } = create_controller();
    (detailUseCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue(
      build_delivery_task_read_model()
    );

    const response = await controller.detail("task_1", seller_request);

    expect(response).toEqual({
      data: expect.objectContaining({
        id: "task_1",
        orderId: "order_1"
      })
    });
  });

  it("returns not found for missing delivery task", async () => {
    const { controller, detailUseCase } = create_controller();
    (detailUseCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(controller.detail("missing", seller_request)).rejects.toBeInstanceOf(
      NotFoundException
    );
  });
});
