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
import type { CrmDeal, DealStatus as PrismaDealStatus } from "@prisma/client";
import { throw_deferred_skeleton } from "../shared/deferred-skeleton.error";
import type { DealStatus } from "../shared/status.contract";

export interface CrmDealRecord extends PersistenceRecordBase {
  leadId?: string | null;
  clientId: string;
  contactId?: string | null;
  status: DealStatus;
  title: string;
  deliveryMode?: string | null;
  expectedValue?: string | null;
  notes?: string | null;
  responsibleUserId: string;
}

export interface CrmDealCreateInput {
  leadId?: string | null;
  clientId: string;
  contactId?: string | null;
  status: DealStatus;
  title: string;
  deliveryMode?: string | null;
  expectedValue?: string | null;
  notes?: string | null;
  responsibleUserId: string;
}

export interface CrmDealUpdateInput {
  leadId?: string | null;
  clientId?: string;
  contactId?: string | null;
  status?: DealStatus;
  title?: string;
  deliveryMode?: string | null;
  expectedValue?: string | null;
  notes?: string | null;
  responsibleUserId?: string;
}

export interface CrmDealRepositoryContract
  extends RepositoryBaseContract<CrmDealRecord, CrmDealCreateInput, CrmDealUpdateInput> {
  withTransaction(context: TransactionContext): CrmDealRepositoryContract;
  ensureFromLead(
    input: EnsureDealFromLeadInput,
    options?: RepositoryUpdateOptions
  ): Promise<CrmDealRecord>;
  markConvertedToOrder(
    dealId: string,
    options?: RepositoryUpdateOptions
  ): Promise<CrmDealRecord>;
}

export interface EnsureDealFromLeadInput {
  leadId: string;
  clientId: string;
  contactId?: string | null;
  responsibleUserId: string;
  title: string;
  notes?: string | null;
}

export class PrismaCrmDealRepository implements CrmDealRepositoryContract {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly transactionContext?: TransactionContext
  ) {}

  withTransaction(context: TransactionContext): CrmDealRepositoryContract {
    return new PrismaCrmDealRepository(this.prismaService, context);
  }

  async ensureFromLead(
    input: EnsureDealFromLeadInput,
    options?: RepositoryUpdateOptions
  ): Promise<CrmDealRecord> {
    void options;

    const client = this.get_client();
    const deal = await client.crmDeal.upsert({
      where: { leadId: input.leadId },
      update: {},
      create: {
        leadId: input.leadId,
        clientId: input.clientId,
        ...(input.contactId !== undefined ? { contactId: input.contactId } : {}),
        status: "IN_PROGRESS",
        title: input.title,
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        responsibleUserId: input.responsibleUserId
      }
    });

    return map_crm_deal_record(deal);
  }

  async markConvertedToOrder(
    dealId: string,
    options?: RepositoryUpdateOptions
  ): Promise<CrmDealRecord> {
    void options;
    const client = this.get_client();

    const transitioned = await client.crmDeal.updateMany({
      where: {
        id: dealId,
        isDeleted: false,
        status: "IN_PROGRESS"
      },
      data: {
        status: "CONVERTED_TO_ORDER"
      }
    });

    if (transitioned.count === 1) {
      const converted = await client.crmDeal.findUnique({
        where: { id: dealId }
      });

      if (converted) {
        return map_crm_deal_record(converted);
      }
    }

    const current = await client.crmDeal.findUnique({
      where: { id: dealId }
    });

    if (!current || current.isDeleted) {
      throw new Error(`Deal '${dealId}' was not found`);
    }

    if (current.status === "CONVERTED_TO_ORDER") {
      return map_crm_deal_record(current);
    }

    throw new Error(
      `Deal '${dealId}' status '${prisma_status_to_deal[current.status]}' cannot be converted to order`
    );
  }

  async findById(id: string, options?: RepositoryFindOptions): Promise<CrmDealRecord | null> {
    const client = this.get_client();
    const deal = await client.crmDeal.findUnique({ where: { id } });
    if (!deal) {
      return null;
    }

    if (!options?.includeDeleted && deal.isDeleted) {
      return null;
    }

    return map_crm_deal_record(deal);
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
    const client = this.get_client();
    void client;
    void id;
  }

  private get_client(): PrismaService {
    return (this.transactionContext?.client ?? this.prismaService) as PrismaService;
  }
}

const prisma_status_to_deal: Record<PrismaDealStatus, DealStatus> = {
  IN_PROGRESS: "in_progress",
  CONVERTED_TO_ORDER: "converted_to_order",
  CANCELLED: "cancelled"
};

function to_iso_datetime(value: Date): string {
  return value.toISOString();
}

function map_decimal_to_string(value: unknown): string | null {
  if (value == null) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return value.toString();
  }

  if (typeof value === "object" && typeof (value as { toString?: unknown }).toString === "function") {
    return (value as { toString: () => string }).toString();
  }

  return null;
}

function map_crm_deal_record(record: CrmDeal): CrmDealRecord {
  return {
    id: record.id,
    leadId: record.leadId,
    clientId: record.clientId,
    contactId: record.contactId,
    status: prisma_status_to_deal[record.status],
    title: record.title,
    deliveryMode: record.deliveryMode,
    expectedValue: map_decimal_to_string(record.expectedValue),
    notes: record.notes,
    responsibleUserId: record.responsibleUserId,
    createdAt: to_iso_datetime(record.createdAt),
    updatedAt: to_iso_datetime(record.updatedAt),
    version: record.version,
    deletedAt: record.deletedAt ? to_iso_datetime(record.deletedAt) : null,
    deletedBy: record.deletedBy,
    deleteReason: record.deleteReason,
    isDeleted: record.isDeleted
  };
}
