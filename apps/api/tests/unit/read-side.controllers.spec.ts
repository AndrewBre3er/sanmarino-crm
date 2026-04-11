import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedRequestLike } from "../../src/modules/auth/auth.access.helpers";
import { DealsReadController } from "../../src/modules/read-side/crm/deal.read.controller";
import type {
  GetDealDetailUseCase,
  ListDealsUseCase
} from "../../src/modules/read-side/crm/deal.read.use-cases";
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
            clientId: "client_1",
            status: "assembling",
            paymentControlStatus: "none",
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

  it("applies seller deal scope in list/detail requests", async () => {
    const listUseCase = {
      execute: vi.fn().mockResolvedValue({
        items: [],
        pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 }
      })
    } as unknown as ListDealsUseCase;

    const getUseCase = {
      execute: vi.fn().mockResolvedValue({
        id: "deal_1"
      })
    } as unknown as GetDealDetailUseCase;

    const controller = new DealsReadController(listUseCase, getUseCase);
    const request = {
      auth: {
        user: {
          userId: "seller_1",
          roleCodes: ["seller"]
        }
      }
    } as unknown as AuthenticatedRequestLike;

    await controller.list({}, request);
    await controller.detail("deal_1", request);

    expect(listUseCase.execute).toHaveBeenCalledWith(
      expect.any(Object),
      { responsibleUserId: "seller_1" }
    );
    expect(getUseCase.execute).toHaveBeenCalledWith(
      "deal_1",
      false,
      { responsibleUserId: "seller_1" }
    );
  });

  it("rejects seller filter by чужой responsibleUserId in deal list", async () => {
    const listUseCase = {
      execute: vi.fn()
    } as unknown as ListDealsUseCase;

    const getUseCase = {
      execute: vi.fn()
    } as unknown as GetDealDetailUseCase;

    const controller = new DealsReadController(listUseCase, getUseCase);
    const request = {
      auth: {
        user: {
          userId: "seller_1",
          roleCodes: ["seller"]
        }
      }
    } as unknown as AuthenticatedRequestLike;

    await expect(
      controller.list({ responsibleUserId: "seller_other" }, request)
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows admin to filter deals by responsibleUserId", async () => {
    const listUseCase = {
      execute: vi.fn().mockResolvedValue({
        items: [],
        pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 }
      })
    } as unknown as ListDealsUseCase;

    const getUseCase = {
      execute: vi.fn()
    } as unknown as GetDealDetailUseCase;

    const controller = new DealsReadController(listUseCase, getUseCase);
    const request = {
      auth: {
        user: {
          userId: "admin_1",
          roleCodes: ["admin"]
        }
      }
    } as unknown as AuthenticatedRequestLike;

    await controller.list({ responsibleUserId: "seller_2" }, request);

    expect(listUseCase.execute).toHaveBeenCalledWith(
      expect.any(Object),
      { responsibleUserId: "seller_2" }
    );
  });
});
