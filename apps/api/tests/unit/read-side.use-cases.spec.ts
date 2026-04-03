import { describe, expect, it, vi } from "vitest";
import type { ReadCollectionQueryInput } from "../../src/modules/read-side/shared/read-model.contract";
import { to_read_collection_response } from "../../src/modules/read-side/shared/read-response";
import {
  GetOrderDetailUseCase,
  ListOrdersUseCase
} from "../../src/modules/read-side/orders/order.read.use-cases";
import type {
  OrdersOrderDetailReadModel,
  OrdersOrderReadModel
} from "../../src/modules/read-side/orders/order.read.repository";
import type { PrismaOrdersOrderReadRepository } from "../../src/modules/read-side/orders/order.read.repository";

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

function build_order(): OrdersOrderReadModel {
  return {
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
  };
}

function build_order_detail(): OrdersOrderDetailReadModel {
  return {
    ...build_order(),
    items: [],
    paymentIds: [],
    deliveryTaskIds: [],
    returnRequestIds: []
  };
}

describe("read-side use-cases", () => {
  it("delegates order list query to repository", async () => {
    const repository = {
      list: vi.fn().mockResolvedValue({
        items: [build_order()],
        pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
        appliedSort: [{ field: "createdAt", direction: "desc" }]
      }),
      getById: vi.fn()
    } as unknown as PrismaOrdersOrderReadRepository;

    const useCase = new ListOrdersUseCase(repository);
    const result = await useCase.execute(build_query());

    expect(repository.list).toHaveBeenCalledOnce();
    expect(result.items).toHaveLength(1);
    expect(result.pagination.totalItems).toBe(1);
  });

  it("returns order detail passthrough from repository", async () => {
    const repository = {
      list: vi.fn(),
      getById: vi.fn().mockResolvedValue(build_order_detail())
    } as unknown as PrismaOrdersOrderReadRepository;

    const useCase = new GetOrderDetailUseCase(repository);
    const result = await useCase.execute("order_1");

    expect(repository.getById).toHaveBeenCalledWith("order_1", false);
    expect(result?.id).toBe("order_1");
  });

  it("keeps read response envelope pagination shape", () => {
    const response = to_read_collection_response({
      items: [build_order()],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
      appliedFilters: [{ field: "status", operator: "eq", value: "draft" }],
      appliedSort: [{ field: "createdAt", direction: "desc" }]
    });

    expect(response.meta.pagination.mode).toBe("page");
    expect(response.meta.pagination.page.totalItems).toBe(1);
    expect(response.meta.appliedFilters?.[0]?.field).toBe("status");
  });
});
