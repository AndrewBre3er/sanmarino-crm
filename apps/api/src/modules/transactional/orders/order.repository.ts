import type {
  PersistenceListQuery,
  PersistenceRecordBase,
  RepositoryBaseContract,
  RepositoryFindOptions,
  RepositorySoftDeleteOptions,
  RepositoryUpdateOptions,
  TransactionContext
} from "../../../common/persistence";
import type { PrismaService } from "../../../prisma/prisma.service";
import { throw_deferred_skeleton } from "../shared/deferred-skeleton.error";
import type {
  OrderControlOverlayStatus,
  OrderDeliveryStatus,
  OrderFulfillmentType,
  OrderStatus
} from "../shared/status.contract";

export interface OrdersOrderRecord extends PersistenceRecordBase {
  orderNumber: string;
  dealId: string;
  clientId: string;
  status: OrderStatus;
  paymentControlStatus: OrderControlOverlayStatus;
  paymentControlDueAt?: string | null;
  fulfillmentType: OrderFulfillmentType;
  deliveryStatus: OrderDeliveryStatus;
  currency: string;
  subtotalAmount: string;
  discountAmount: string;
  totalAmount: string;
  notes?: string | null;
  readyForPartialShipmentAt?: string | null;
  readyForShipmentAt?: string | null;
  partiallyShippedAt?: string | null;
  shippedAt?: string | null;
}

export interface OrdersOrderCreateInput {
  orderNumber: string;
  dealId: string;
  clientId: string;
  status: OrderStatus;
  paymentControlStatus?: OrderControlOverlayStatus;
  paymentControlDueAt?: string | null;
  fulfillmentType: OrderFulfillmentType;
  deliveryStatus?: OrderDeliveryStatus;
  currency?: string;
  subtotalAmount?: string;
  discountAmount?: string;
  totalAmount?: string;
  notes?: string | null;
  readyForPartialShipmentAt?: string | null;
  readyForShipmentAt?: string | null;
  partiallyShippedAt?: string | null;
  shippedAt?: string | null;
}

export interface OrdersOrderUpdateInput {
  status?: OrderStatus;
  paymentControlStatus?: OrderControlOverlayStatus;
  paymentControlDueAt?: string | null;
  fulfillmentType?: OrderFulfillmentType;
  deliveryStatus?: OrderDeliveryStatus;
  subtotalAmount?: string;
  discountAmount?: string;
  totalAmount?: string;
  notes?: string | null;
  readyForPartialShipmentAt?: string | null;
  readyForShipmentAt?: string | null;
  partiallyShippedAt?: string | null;
  shippedAt?: string | null;
}

export interface OrdersOrderRepositoryContract
  extends RepositoryBaseContract<OrdersOrderRecord, OrdersOrderCreateInput, OrdersOrderUpdateInput> {
  withTransaction(context: TransactionContext): OrdersOrderRepositoryContract;
}

export class PrismaOrdersOrderRepository implements OrdersOrderRepositoryContract {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly transactionContext?: TransactionContext
  ) {}

  withTransaction(context: TransactionContext): OrdersOrderRepositoryContract {
    return new PrismaOrdersOrderRepository(this.prismaService, context);
  }

  async findById(id: string, options?: RepositoryFindOptions): Promise<OrdersOrderRecord | null> {
    void options;
    this.touch_context(id);
    throw_deferred_skeleton("PrismaOrdersOrderRepository", "findById");
  }

  async list(
    query?: PersistenceListQuery
  ): Promise<{ items: OrdersOrderRecord[]; nextCursor?: string }> {
    void query;
    this.touch_context("list");
    throw_deferred_skeleton("PrismaOrdersOrderRepository", "list");
  }

  async create(
    input: OrdersOrderCreateInput,
    options?: RepositoryUpdateOptions
  ): Promise<OrdersOrderRecord> {
    void options;
    void input;
    this.touch_context("create");
    throw_deferred_skeleton("PrismaOrdersOrderRepository", "create");
  }

  async updateById(
    id: string,
    input: OrdersOrderUpdateInput,
    options?: RepositoryUpdateOptions
  ): Promise<OrdersOrderRecord> {
    void options;
    void input;
    this.touch_context(id);
    throw_deferred_skeleton("PrismaOrdersOrderRepository", "updateById");
  }

  async softDeleteById(id: string, options?: RepositorySoftDeleteOptions): Promise<void> {
    void options;
    this.touch_context(id);
    throw_deferred_skeleton("PrismaOrdersOrderRepository", "softDeleteById");
  }

  async restoreById(id: string, options?: RepositoryUpdateOptions): Promise<void> {
    void options;
    this.touch_context(id);
    throw_deferred_skeleton("PrismaOrdersOrderRepository", "restoreById");
  }

  private touch_context(id: string): void {
    const client = this.transactionContext?.client ?? this.prismaService;
    void client;
    void id;
  }
}
