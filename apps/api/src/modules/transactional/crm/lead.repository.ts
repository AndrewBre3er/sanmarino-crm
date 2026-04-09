import type {
  PersistenceListQuery,
  PersistenceRecordBase,
  RepositoryBaseContract,
  RepositoryFindOptions,
  RepositorySoftDeleteOptions,
  RepositoryUpdateOptions,
  TransactionContext
} from "../../../common/persistence";
import { normalize_persistence_limit } from "../../../common/persistence";
import type { PrismaService } from "../../../prisma/prisma.service";
import type { CrmLead, LeadStatus as PrismaLeadStatus } from "@prisma/client";
import {
  DeferredSkeletonError,
  throw_deferred_skeleton
} from "../shared/deferred-skeleton.error";
import type { LeadStatus } from "../shared/status.contract";

export interface CrmLeadRecord extends PersistenceRecordBase {
  source: string;
  status: LeadStatus;
  clientId?: string | null;
  contactId?: string | null;
  title?: string | null;
  notes?: string | null;
  responsibleUserId?: string | null;
}

export interface CrmLeadCreateInput {
  source: string;
  status: LeadStatus;
  clientId?: string | null;
  contactId?: string | null;
  title?: string | null;
  notes?: string | null;
  responsibleUserId?: string | null;
}

export interface CrmLeadUpdateInput {
  source?: string;
  status?: LeadStatus;
  clientId?: string | null;
  contactId?: string | null;
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
    const client = this.get_client();
    const lead = await client.crmLead.findUnique({ where: { id } });
    return lead ? map_crm_lead_record(lead) : null;
  }

  async list(
    query?: PersistenceListQuery
  ): Promise<{ items: CrmLeadRecord[]; nextCursor?: string }> {
    const client = this.get_client();
    const limit = normalize_persistence_limit(query);
    const items = await client.crmLead.findMany({
      ...(query?.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1
    });

    const hasMore = items.length > limit;
    const pageItems = hasMore ? items.slice(0, limit) : items;
    const lastItem = pageItems.at(-1);

    return {
      items: pageItems.map(map_crm_lead_record),
      ...(hasMore && lastItem ? { nextCursor: lastItem.id } : {})
    };
  }

  async create(
    input: CrmLeadCreateInput,
    options?: RepositoryUpdateOptions
  ): Promise<CrmLeadRecord> {
    void options;
    const client = this.get_client();
    const created = await client.crmLead.create({
      data: {
        source: input.source,
        status: to_prisma_lead_status(input.status),
        ...(input.clientId !== undefined ? { clientId: input.clientId } : {}),
        ...(input.contactId !== undefined ? { contactId: input.contactId } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.responsibleUserId !== undefined
          ? { responsibleUserId: input.responsibleUserId }
          : {})
      }
    });

    return map_crm_lead_record(created);
  }

  async updateById(
    id: string,
    input: CrmLeadUpdateInput,
    options?: RepositoryUpdateOptions
  ): Promise<CrmLeadRecord> {
    void options;
    const client = this.get_client();
    const updated = await client.crmLead.update({
      where: { id },
      data: {
        ...(input.source !== undefined ? { source: input.source } : {}),
        ...(input.status !== undefined ? { status: to_prisma_lead_status(input.status) } : {}),
        ...(input.clientId !== undefined ? { clientId: input.clientId } : {}),
        ...(input.contactId !== undefined ? { contactId: input.contactId } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.responsibleUserId !== undefined
          ? { responsibleUserId: input.responsibleUserId }
          : {}),
        version: {
          increment: 1
        }
      }
    });

    return map_crm_lead_record(updated);
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
    const client = this.get_client();
    void client;
    void id;
  }

  private get_client(): PrismaService {
    return (this.transactionContext?.client ?? this.prismaService) as PrismaService;
  }
}

export function is_deferred_crm_lead_repository_error(error: unknown): error is DeferredSkeletonError {
  return error instanceof DeferredSkeletonError && error.componentName === "PrismaCrmLeadRepository";
}

const lead_status_to_prisma: Record<LeadStatus, PrismaLeadStatus> = {
  new: "NEW",
  in_processing: "IN_PROCESSING",
  cancelled: "CANCELLED"
};

const prisma_status_to_lead: Record<PrismaLeadStatus, LeadStatus> = {
  NEW: "new",
  IN_PROCESSING: "in_processing",
  CANCELLED: "cancelled"
};

function to_prisma_lead_status(status: LeadStatus): PrismaLeadStatus {
  return lead_status_to_prisma[status];
}

function to_iso_datetime(value: Date): string {
  return value.toISOString();
}

function map_crm_lead_record(record: CrmLead): CrmLeadRecord {
  return {
    id: record.id,
    source: record.source,
    status: prisma_status_to_lead[record.status],
    clientId: record.clientId,
    contactId: record.contactId,
    title: record.title,
    notes: record.notes,
    responsibleUserId: record.responsibleUserId,
    createdAt: to_iso_datetime(record.createdAt),
    updatedAt: to_iso_datetime(record.updatedAt),
    version: record.version
  };
}
