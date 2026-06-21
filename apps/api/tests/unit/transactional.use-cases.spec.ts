import { describe, expect, it } from "vitest";
import type {
  PersistenceListQuery,
  PersistenceListResult,
  RepositoryFindOptions,
  RepositorySoftDeleteOptions,
  RepositoryUpdateOptions,
  TransactionBoundaryContract,
  TransactionBoundaryOptions,
  TransactionCallback,
  TransactionContext
} from "../../src/common/persistence";
import {
  TransitionOrderStatusUseCase,
  type LogisticsDeliveryTaskCreateInput,
  type LogisticsDeliveryTaskRecord,
  type LogisticsDeliveryTaskRepositoryContract,
  type EnsureOrderFromDealInput,
  type LogisticsDeliveryTaskUpdateInput,
  type OrdersOrderCreateInput,
  type OrdersOrderRecord,
  type OrdersOrderRepositoryContract,
  type OrdersOrderUpdateInput
} from "../../src/modules/transactional";

class FakeTransactionBoundary implements TransactionBoundaryContract {
  async runInTransaction<TResult>(
    callback: TransactionCallback<TResult>,
    options?: TransactionBoundaryOptions
  ): Promise<TResult> {
    void options;

    const context: TransactionContext = {
      provider: "prisma",
      client: { fake: true }
    };

    return callback(context);
  }
}

class FakeOrderRepository implements OrdersOrderRepositoryContract {
  constructor(private current: OrdersOrderRecord) {}

  withTransaction(context: TransactionContext): OrdersOrderRepositoryContract {
    void context;
    return this;
  }

  async findById(id: string, options?: RepositoryFindOptions): Promise<OrdersOrderRecord | null> {
    void options;
    return this.current.id === id ? this.current : null;
  }

  async list(query?: PersistenceListQuery): Promise<PersistenceListResult<OrdersOrderRecord>> {
    void query;
    return { items: [this.current] };
  }

  async create(input: OrdersOrderCreateInput): Promise<OrdersOrderRecord> {
    void input;
    throw new Error("not needed in test");
  }

  async ensureFromDeal(
    input: EnsureOrderFromDealInput,
    options?: RepositoryUpdateOptions
  ): Promise<OrdersOrderRecord> {
    void input;
    void options;
    throw new Error("not needed in test");
  }

  async updateById(
    id: string,
    input: OrdersOrderUpdateInput,
    options?: RepositoryUpdateOptions
  ): Promise<OrdersOrderRecord> {
    void options;

    if (this.current.id !== id) {
      throw new Error("order not found");
    }

    this.current = {
      ...this.current,
      ...(input.status ? { status: input.status } : {})
    };

    return this.current;
  }

  async softDeleteById(id: string, options?: RepositorySoftDeleteOptions): Promise<void> {
    void id;
    void options;
    throw new Error("not needed in test");
  }

  async restoreById(id: string, options?: RepositoryUpdateOptions): Promise<void> {
    void id;
    void options;
    throw new Error("not needed in test");
  }
}

class FakeDeliveryTaskRepository implements LogisticsDeliveryTaskRepositoryContract {
  constructor(private readonly activeCount: number) {}

  withTransaction(context: TransactionContext): LogisticsDeliveryTaskRepositoryContract {
    void context;
    return this;
  }

  async countActiveByOrderId(orderId: string): Promise<number> {
    void orderId;
    return this.activeCount;
  }

  async findById(
    id: string,
    options?: RepositoryFindOptions
  ): Promise<LogisticsDeliveryTaskRecord | null> {
    void id;
    void options;
    throw new Error("not needed in test");
  }

  async list(
    query?: PersistenceListQuery
  ): Promise<PersistenceListResult<LogisticsDeliveryTaskRecord>> {
    void query;
    throw new Error("not needed in test");
  }

  async create(
    input: LogisticsDeliveryTaskCreateInput,
    options?: RepositoryUpdateOptions
  ): Promise<LogisticsDeliveryTaskRecord> {
    void input;
    void options;
    throw new Error("not needed in test");
  }

  async updateById(
    id: string,
    input: LogisticsDeliveryTaskUpdateInput,
    options?: RepositoryUpdateOptions
  ): Promise<LogisticsDeliveryTaskRecord> {
    void id;
    void input;
    void options;
    throw new Error("not needed in test");
  }

  async softDeleteById(id: string, options?: RepositorySoftDeleteOptions): Promise<void> {
    void id;
    void options;
    throw new Error("not needed in test");
  }

  async restoreById(id: string, options?: RepositoryUpdateOptions): Promise<void> {
    void id;
    void options;
    throw new Error("not needed in test");
  }
}

function build_order_record(
  fulfillmentType: OrdersOrderRecord["fulfillmentType"],
  status: OrdersOrderRecord["status"] = "ready_for_shipment"
): OrdersOrderRecord {
  return {
    id: "order_1",
    orderNumber: "ORD-1",
    dealId: "deal_1",
    clientId: "client_1",
    status,
    paymentControlStatus: "none",
    paymentControlDueAt: null,
    fulfillmentType,
    deliveryStatus: "not_scheduled",
    currency: "RUB",
    subtotalAmount: "0",
    discountAmount: "0",
    totalAmount: "0",
    notes: null,
    readyForPartialShipmentAt: null,
    readyForShipmentAt: null,
    partiallyShippedAt: null,
    shippedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDeleted: false,
    version: 1
  };
}

describe("transition order status use-case", () => {
  it("rejects delivery flow entry without active delivery tasks", async () => {
    const useCase = new TransitionOrderStatusUseCase({
      transactionBoundary: new FakeTransactionBoundary(),
      orderRepository: new FakeOrderRepository(build_order_record("delivery")),
      deliveryTaskRepository: new FakeDeliveryTaskRepository(0)
    });

    await expect(
      useCase.execute({
        orderId: "order_1",
        targetStatus: "partially_shipped"
      })
    ).rejects.toThrowError();
  });

  it("allows delivery flow entry when active delivery task exists", async () => {
    const useCase = new TransitionOrderStatusUseCase({
      transactionBoundary: new FakeTransactionBoundary(),
      orderRepository: new FakeOrderRepository(build_order_record("delivery")),
      deliveryTaskRepository: new FakeDeliveryTaskRepository(1)
    });

    const updated = await useCase.execute({
      orderId: "order_1",
      targetStatus: "partially_shipped"
    });

    expect(updated.status).toBe("partially_shipped");
  });

  it("rejects pickup order when active delivery tasks are present", async () => {
    const useCase = new TransitionOrderStatusUseCase({
      transactionBoundary: new FakeTransactionBoundary(),
      orderRepository: new FakeOrderRepository(build_order_record("pickup")),
      deliveryTaskRepository: new FakeDeliveryTaskRepository(1)
    });

    await expect(
      useCase.execute({
        orderId: "order_1",
        targetStatus: "partially_shipped"
      })
    ).rejects.toThrowError();
  });
});
