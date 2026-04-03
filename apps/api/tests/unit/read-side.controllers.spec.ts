import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { OrdersReadController } from "../../src/modules/read-side/orders/order.read.controller";
import type {
  GetOrderDetailUseCase,
  ListOrdersUseCase
} from "../../src/modules/read-side/orders/order.read.use-cases";

describe("read-side controllers", () => {
  it("returns normalized list envelope for orders", async () => {
    const listUseCase = {
      execute: vi.fn().mockResolvedValue({
        items: [
          {
            id: "order_1",
            orderNumber: "ORD-1",
            dealId: "deal_1",
            status: "draft",
            fulfillmentType: "manual",
            deliveryStatus: "not_scheduled",
            currency: "RUB",
            totalAmount: "0.00",
            confirmedAt: null,
            completedAt: null,
            closedAt: null,
            cancelledAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: 1,
            deletedAt: null,
            deletedBy: null,
            deleteReason: null,
            isDeleted: false
          }
        ],
        pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
        appliedSort: [{ field: "createdAt", direction: "desc" }]
      })
    } as unknown as ListOrdersUseCase;

    const getUseCase = {
      execute: vi.fn()
    } as unknown as GetOrderDetailUseCase;

    const controller = new OrdersReadController(listUseCase, getUseCase);
    const result = await controller.list({});

    expect(listUseCase.execute).toHaveBeenCalledOnce();
    expect(result.data).toHaveLength(1);
    expect(result.meta.pagination.mode).toBe("page");
  });

  it("throws not found for missing order detail", async () => {
    const listUseCase = {
      execute: vi.fn()
    } as unknown as ListOrdersUseCase;

    const getUseCase = {
      execute: vi.fn().mockResolvedValue(null)
    } as unknown as GetOrderDetailUseCase;

    const controller = new OrdersReadController(listUseCase, getUseCase);

    await expect(controller.detail("missing_order")).rejects.toBeInstanceOf(NotFoundException);
  });
});
