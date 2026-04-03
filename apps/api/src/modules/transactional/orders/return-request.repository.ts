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
import type { ReturnRequestStatus } from "../shared/status.contract";

export interface OrdersReturnRequestRecord extends PersistenceRecordBase {
  orderId: string;
  status: ReturnRequestStatus;
  reason: string;
  requestedRefundAmount?: string | null;
  approvedRefundAmount?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  processedAt?: string | null;
  closedAt?: string | null;
}

export interface OrdersReturnRequestCreateInput {
  orderId: string;
  status: ReturnRequestStatus;
  reason: string;
  requestedRefundAmount?: string | null;
}

export interface OrdersReturnRequestUpdateInput {
  status?: ReturnRequestStatus;
  reason?: string;
  approvedRefundAmount?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  processedAt?: string | null;
  closedAt?: string | null;
}

export interface OrdersReturnRequestRepositoryContract
  extends RepositoryBaseContract<
    OrdersReturnRequestRecord,
    OrdersReturnRequestCreateInput,
    OrdersReturnRequestUpdateInput
  > {
  withTransaction(context: TransactionContext): OrdersReturnRequestRepositoryContract;
}

export class PrismaOrdersReturnRequestRepository implements OrdersReturnRequestRepositoryContract {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly transactionContext?: TransactionContext
  ) {}

  withTransaction(context: TransactionContext): OrdersReturnRequestRepositoryContract {
    return new PrismaOrdersReturnRequestRepository(this.prismaService, context);
  }

  async findById(
    id: string,
    options?: RepositoryFindOptions
  ): Promise<OrdersReturnRequestRecord | null> {
    void options;
    this.touch_context(id);
    throw_deferred_skeleton("PrismaOrdersReturnRequestRepository", "findById");
  }

  async list(
    query?: PersistenceListQuery
  ): Promise<{ items: OrdersReturnRequestRecord[]; nextCursor?: string }> {
    void query;
    this.touch_context("list");
    throw_deferred_skeleton("PrismaOrdersReturnRequestRepository", "list");
  }

  async create(
    input: OrdersReturnRequestCreateInput,
    options?: RepositoryUpdateOptions
  ): Promise<OrdersReturnRequestRecord> {
    void options;
    void input;
    this.touch_context("create");
    throw_deferred_skeleton("PrismaOrdersReturnRequestRepository", "create");
  }

  async updateById(
    id: string,
    input: OrdersReturnRequestUpdateInput,
    options?: RepositoryUpdateOptions
  ): Promise<OrdersReturnRequestRecord> {
    void options;
    void input;
    this.touch_context(id);
    throw_deferred_skeleton("PrismaOrdersReturnRequestRepository", "updateById");
  }

  async softDeleteById(id: string, options?: RepositorySoftDeleteOptions): Promise<void> {
    void options;
    this.touch_context(id);
    throw_deferred_skeleton("PrismaOrdersReturnRequestRepository", "softDeleteById");
  }

  async restoreById(id: string, options?: RepositoryUpdateOptions): Promise<void> {
    void options;
    this.touch_context(id);
    throw_deferred_skeleton("PrismaOrdersReturnRequestRepository", "restoreById");
  }

  private touch_context(id: string): void {
    const client = this.transactionContext?.client ?? this.prismaService;
    void client;
    void id;
  }
}
