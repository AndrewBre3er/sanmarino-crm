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
import type { DealStatus } from "../shared/status.contract";

export interface CrmDealRecord extends PersistenceRecordBase {
  leadId?: string | null;
  status: DealStatus;
  title: string;
  notes?: string | null;
  responsibleUserId?: string | null;
}

export interface CrmDealCreateInput {
  leadId?: string | null;
  status: DealStatus;
  title: string;
  notes?: string | null;
  responsibleUserId?: string | null;
}

export interface CrmDealUpdateInput {
  leadId?: string | null;
  status?: DealStatus;
  title?: string;
  notes?: string | null;
  responsibleUserId?: string | null;
}

export interface CrmDealRepositoryContract
  extends RepositoryBaseContract<CrmDealRecord, CrmDealCreateInput, CrmDealUpdateInput> {
  withTransaction(context: TransactionContext): CrmDealRepositoryContract;
}

export class PrismaCrmDealRepository implements CrmDealRepositoryContract {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly transactionContext?: TransactionContext
  ) {}

  withTransaction(context: TransactionContext): CrmDealRepositoryContract {
    return new PrismaCrmDealRepository(this.prismaService, context);
  }

  async findById(id: string, options?: RepositoryFindOptions): Promise<CrmDealRecord | null> {
    void options;
    this.touch_context(id);
    throw_deferred_skeleton("PrismaCrmDealRepository", "findById");
  }

  async list(
    query?: PersistenceListQuery
  ): Promise<{ items: CrmDealRecord[]; nextCursor?: string }> {
    void query;
    this.touch_context("list");
    throw_deferred_skeleton("PrismaCrmDealRepository", "list");
  }

  async create(
    input: CrmDealCreateInput,
    options?: RepositoryUpdateOptions
  ): Promise<CrmDealRecord> {
    void options;
    void input;
    this.touch_context("create");
    throw_deferred_skeleton("PrismaCrmDealRepository", "create");
  }

  async updateById(
    id: string,
    input: CrmDealUpdateInput,
    options?: RepositoryUpdateOptions
  ): Promise<CrmDealRecord> {
    void options;
    void input;
    this.touch_context(id);
    throw_deferred_skeleton("PrismaCrmDealRepository", "updateById");
  }

  async softDeleteById(id: string, options?: RepositorySoftDeleteOptions): Promise<void> {
    void options;
    this.touch_context(id);
    throw_deferred_skeleton("PrismaCrmDealRepository", "softDeleteById");
  }

  async restoreById(id: string, options?: RepositoryUpdateOptions): Promise<void> {
    void options;
    this.touch_context(id);
    throw_deferred_skeleton("PrismaCrmDealRepository", "restoreById");
  }

  private touch_context(id: string): void {
    const client = this.transactionContext?.client ?? this.prismaService;
    void client;
    void id;
  }
}
