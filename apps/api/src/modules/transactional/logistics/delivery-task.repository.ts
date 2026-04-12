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
import type { DeliveryTaskStatus } from "../shared/status.contract";

export interface LogisticsDeliveryTaskRecord extends PersistenceRecordBase {
  orderId: string;
  routeDayId?: string | null;
  deliverySlotId?: string | null;
  driverId?: string | null;
  vehicleId?: string | null;
  status: DeliveryTaskStatus;
  sequenceNo?: number | null;
  plannedDate?: string | null;
  deliveredAt?: string | null;
  failureReason?: string | null;
  addressText?: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  createdBy: string;
}

export interface LogisticsDeliveryTaskCreateInput {
  orderId: string;
  routeDayId?: string | null;
  deliverySlotId?: string | null;
  driverId?: string | null;
  vehicleId?: string | null;
  status: DeliveryTaskStatus;
  sequenceNo?: number | null;
  plannedDate?: string | null;
  addressText?: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  createdBy: string;
}

export interface LogisticsDeliveryTaskUpdateInput {
  routeDayId?: string | null;
  deliverySlotId?: string | null;
  driverId?: string | null;
  vehicleId?: string | null;
  status?: DeliveryTaskStatus;
  sequenceNo?: number | null;
  plannedDate?: string | null;
  deliveredAt?: string | null;
  failureReason?: string | null;
  addressText?: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
}

export interface LogisticsDeliveryTaskRepositoryContract
  extends RepositoryBaseContract<
    LogisticsDeliveryTaskRecord,
    LogisticsDeliveryTaskCreateInput,
    LogisticsDeliveryTaskUpdateInput
  > {
  withTransaction(context: TransactionContext): LogisticsDeliveryTaskRepositoryContract;
  countActiveByOrderId(orderId: string): Promise<number>;
}

export class PrismaLogisticsDeliveryTaskRepository
  implements LogisticsDeliveryTaskRepositoryContract
{
  constructor(
    private readonly prismaService: PrismaService,
    private readonly transactionContext?: TransactionContext
  ) {}

  withTransaction(context: TransactionContext): LogisticsDeliveryTaskRepositoryContract {
    return new PrismaLogisticsDeliveryTaskRepository(this.prismaService, context);
  }

  async findById(
    id: string,
    options?: RepositoryFindOptions
  ): Promise<LogisticsDeliveryTaskRecord | null> {
    void options;
    this.touch_context(id);
    throw_deferred_skeleton("PrismaLogisticsDeliveryTaskRepository", "findById");
  }

  async list(
    query?: PersistenceListQuery
  ): Promise<{ items: LogisticsDeliveryTaskRecord[]; nextCursor?: string }> {
    void query;
    this.touch_context("list");
    throw_deferred_skeleton("PrismaLogisticsDeliveryTaskRepository", "list");
  }

  async create(
    input: LogisticsDeliveryTaskCreateInput,
    options?: RepositoryUpdateOptions
  ): Promise<LogisticsDeliveryTaskRecord> {
    void options;
    void input;
    this.touch_context("create");
    throw_deferred_skeleton("PrismaLogisticsDeliveryTaskRepository", "create");
  }

  async updateById(
    id: string,
    input: LogisticsDeliveryTaskUpdateInput,
    options?: RepositoryUpdateOptions
  ): Promise<LogisticsDeliveryTaskRecord> {
    void options;
    void input;
    this.touch_context(id);
    throw_deferred_skeleton("PrismaLogisticsDeliveryTaskRepository", "updateById");
  }

  async softDeleteById(id: string, options?: RepositorySoftDeleteOptions): Promise<void> {
    void options;
    this.touch_context(id);
    throw_deferred_skeleton("PrismaLogisticsDeliveryTaskRepository", "softDeleteById");
  }

  async restoreById(id: string, options?: RepositoryUpdateOptions): Promise<void> {
    void options;
    this.touch_context(id);
    throw_deferred_skeleton("PrismaLogisticsDeliveryTaskRepository", "restoreById");
  }

  async countActiveByOrderId(orderId: string): Promise<number> {
    this.touch_context(orderId);
    throw_deferred_skeleton("PrismaLogisticsDeliveryTaskRepository", "countActiveByOrderId");
  }

  private touch_context(id: string): void {
    const client = this.transactionContext?.client ?? this.prismaService;
    void client;
    void id;
  }
}
