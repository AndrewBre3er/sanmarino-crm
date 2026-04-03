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
import {
  DeferredSkeletonError,
  throw_deferred_skeleton
} from "../shared/deferred-skeleton.error";
import type { LeadStatus } from "../shared/status.contract";

export interface CrmLeadRecord extends PersistenceRecordBase {
  source: string;
  status: LeadStatus;
  title?: string | null;
  notes?: string | null;
  responsibleUserId?: string | null;
}

export interface CrmLeadCreateInput {
  source: string;
  status: LeadStatus;
  title?: string | null;
  notes?: string | null;
  responsibleUserId?: string | null;
}

export interface CrmLeadUpdateInput {
  source?: string;
  status?: LeadStatus;
  title?: string | null;
  notes?: string | null;
  responsibleUserId?: string | null;
}

export interface CrmLeadRepositoryContract
  extends RepositoryBaseContract<CrmLeadRecord, CrmLeadCreateInput, CrmLeadUpdateInput> {
  withTransaction(context: TransactionContext): CrmLeadRepositoryContract;
}

export class PrismaCrmLeadRepository implements CrmLeadRepositoryContract {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly transactionContext?: TransactionContext
  ) {}

  withTransaction(context: TransactionContext): CrmLeadRepositoryContract {
    return new PrismaCrmLeadRepository(this.prismaService, context);
  }

  async findById(id: string, options?: RepositoryFindOptions): Promise<CrmLeadRecord | null> {
    void options;
    this.touch_context(id);
    throw_deferred_skeleton("PrismaCrmLeadRepository", "findById");
  }

  async list(
    query?: PersistenceListQuery
  ): Promise<{ items: CrmLeadRecord[]; nextCursor?: string }> {
    void query;
    this.touch_context("list");
    throw_deferred_skeleton("PrismaCrmLeadRepository", "list");
  }

  async create(
    input: CrmLeadCreateInput,
    options?: RepositoryUpdateOptions
  ): Promise<CrmLeadRecord> {
    void options;
    void input;
    this.touch_context("create");
    throw_deferred_skeleton("PrismaCrmLeadRepository", "create");
  }

  async updateById(
    id: string,
    input: CrmLeadUpdateInput,
    options?: RepositoryUpdateOptions
  ): Promise<CrmLeadRecord> {
    void options;
    void input;
    this.touch_context(id);
    throw_deferred_skeleton("PrismaCrmLeadRepository", "updateById");
  }

  async softDeleteById(id: string, options?: RepositorySoftDeleteOptions): Promise<void> {
    void options;
    this.touch_context(id);
    throw_deferred_skeleton("PrismaCrmLeadRepository", "softDeleteById");
  }

  async restoreById(id: string, options?: RepositoryUpdateOptions): Promise<void> {
    void options;
    this.touch_context(id);
    throw_deferred_skeleton("PrismaCrmLeadRepository", "restoreById");
  }

  private touch_context(id: string): void {
    const client = this.transactionContext?.client ?? this.prismaService;
    void client;
    void id;
  }
}

export function is_deferred_crm_lead_repository_error(error: unknown): error is DeferredSkeletonError {
  return error instanceof DeferredSkeletonError && error.componentName === "PrismaCrmLeadRepository";
}
