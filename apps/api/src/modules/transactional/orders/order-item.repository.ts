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

export interface OrdersOrderItemRecord extends PersistenceRecordBase {
  orderId: string;
  lineNo: number;
  productId: string;
  productNameSnapshot: string;
  qty: string;
  unit: string;
  retailPrice: string;
  discountAmount: string;
  lineTotal: string;
  costSnapshot?: string | null;
  notes?: string | null;
}

export interface OrdersOrderItemCreateInput {
  orderId: string;
  lineNo: number;
  productId: string;
  productNameSnapshot: string;
  qty: string;
  unit: string;
  retailPrice: string;
  discountAmount?: string;
  lineTotal: string;
  costSnapshot?: string | null;
  notes?: string | null;
}

export interface OrdersOrderItemUpdateInput {
  unit?: string;
  qty?: string;
  retailPrice?: string;
  discountAmount?: string;
  lineTotal?: string;
  costSnapshot?: string | null;
  notes?: string | null;
}

export interface OrdersOrderItemRepositoryContract
  extends RepositoryBaseContract<
    OrdersOrderItemRecord,
    OrdersOrderItemCreateInput,
    OrdersOrderItemUpdateInput
  > {
  withTransaction(context: TransactionContext): OrdersOrderItemRepositoryContract;
}

export class PrismaOrdersOrderItemRepository implements OrdersOrderItemRepositoryContract {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly transactionContext?: TransactionContext
  ) {}

  withTransaction(context: TransactionContext): OrdersOrderItemRepositoryContract {
    return new PrismaOrdersOrderItemRepository(this.prismaService, context);
  }

  async findById(id: string, options?: RepositoryFindOptions): Promise<OrdersOrderItemRecord | null> {
    void options;
    this.touch_context(id);
    throw_deferred_skeleton("PrismaOrdersOrderItemRepository", "findById");
  }

  async list(
    query?: PersistenceListQuery
  ): Promise<{ items: OrdersOrderItemRecord[]; nextCursor?: string }> {
    void query;
    this.touch_context("list");
    throw_deferred_skeleton("PrismaOrdersOrderItemRepository", "list");
  }

  async create(
    input: OrdersOrderItemCreateInput,
    options?: RepositoryUpdateOptions
  ): Promise<OrdersOrderItemRecord> {
    void options;
    void input;
    this.touch_context("create");
    throw_deferred_skeleton("PrismaOrdersOrderItemRepository", "create");
  }

  async updateById(
    id: string,
    input: OrdersOrderItemUpdateInput,
    options?: RepositoryUpdateOptions
  ): Promise<OrdersOrderItemRecord> {
    void options;
    void input;
    this.touch_context(id);
    throw_deferred_skeleton("PrismaOrdersOrderItemRepository", "updateById");
  }

  async softDeleteById(id: string, options?: RepositorySoftDeleteOptions): Promise<void> {
    void options;
    this.touch_context(id);
    throw_deferred_skeleton("PrismaOrdersOrderItemRepository", "softDeleteById");
  }

  async restoreById(id: string, options?: RepositoryUpdateOptions): Promise<void> {
    void options;
    this.touch_context(id);
    throw_deferred_skeleton("PrismaOrdersOrderItemRepository", "restoreById");
  }

  private touch_context(id: string): void {
    const client = this.transactionContext?.client ?? this.prismaService;
    void client;
    void id;
  }
}
