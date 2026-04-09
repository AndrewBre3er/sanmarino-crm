import { Inject, Injectable } from "@nestjs/common";
import type { CrmLead, LeadStatus as PrismaLeadStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import type { LeadStatus } from "../../transactional/shared/status.contract";
import type {
  ReadCollectionQueryInput,
  ReadCollectionResult
} from "../shared/read-model.contract";
import { build_page_pagination_meta } from "../shared/read-query.dto";
import { from_prisma_enum, to_iso_datetime } from "../shared/prisma-read.mapper";

export interface CrmLeadReadModel {
  id: string;
  source: string;
  status: LeadStatus;
  clientId: string | null;
  contactId: string | null;
  title: string | null;
  notes: string | null;
  responsibleUserId: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface CrmLeadReadScope {
  responsibleUserId?: string;
}

export interface CrmLeadReadRepositoryContract {
  list(
    query: ReadCollectionQueryInput,
    scope?: CrmLeadReadScope
  ): Promise<ReadCollectionResult<CrmLeadReadModel>>;
  getById(leadId: string, scope?: CrmLeadReadScope): Promise<CrmLeadReadModel | null>;
}

const lead_status_to_prisma: Record<string, PrismaLeadStatus> = {
  new: "NEW",
  in_processing: "IN_PROCESSING",
  cancelled: "CANCELLED"
};

function map_read_statuses_to_prisma(statuses: readonly string[]): PrismaLeadStatus[] {
  const mapped = statuses
    .map((status) => lead_status_to_prisma[status.toLowerCase()])
    .filter((status): status is PrismaLeadStatus => Boolean(status));

  return Array.from(new Set(mapped));
}

function map_crm_lead_read_model(record: CrmLead): CrmLeadReadModel {
  return {
    id: record.id,
    source: record.source,
    status: from_prisma_enum(record.status) as LeadStatus,
    clientId: record.clientId,
    contactId: record.contactId,
    title: record.title,
    notes: record.notes,
    responsibleUserId: record.responsibleUserId,
    createdAt: to_iso_datetime(record.createdAt) ?? "",
    updatedAt: to_iso_datetime(record.updatedAt) ?? "",
    version: record.version
  };
}

@Injectable()
export class PrismaCrmLeadReadRepository implements CrmLeadReadRepositoryContract {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async list(
    query: ReadCollectionQueryInput,
    scope?: CrmLeadReadScope
  ): Promise<ReadCollectionResult<CrmLeadReadModel>> {
    const where: Prisma.CrmLeadWhereInput = {};

    if (query.search) {
      where.OR = [
        { source: { contains: query.search, mode: "insensitive" } },
        { title: { contains: query.search, mode: "insensitive" } },
        { notes: { contains: query.search, mode: "insensitive" } }
      ];
    }

    if (query.status && query.status.length > 0) {
      const mapped_statuses = map_read_statuses_to_prisma(query.status);
      const [first_status] = mapped_statuses;
      if (mapped_statuses.length === 1 && first_status) {
        where.status = first_status;
      } else if (mapped_statuses.length > 1) {
        where.status = { in: mapped_statuses };
      }
    }

    if (scope?.responsibleUserId) {
      where.responsibleUserId = scope.responsibleUserId;
    }

    const orderBy = {
      [query.sortField]: query.sortDirection
    } as Prisma.CrmLeadOrderByWithRelationInput;

    const [items, totalItems] = await this.prismaService.$transaction([
      this.prismaService.crmLead.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      this.prismaService.crmLead.count({ where })
    ]);

    return {
      items: items.map(map_crm_lead_read_model),
      pagination: build_page_pagination_meta(totalItems, query.page, query.pageSize),
      ...(query.contract.filters ? { appliedFilters: query.contract.filters } : {}),
      ...(query.contract.sort ? { appliedSort: query.contract.sort } : {})
    };
  }

  async getById(leadId: string, scope?: CrmLeadReadScope): Promise<CrmLeadReadModel | null> {
    const lead = await this.prismaService.crmLead.findFirst({
      where: {
        id: leadId,
        ...(scope?.responsibleUserId ? { responsibleUserId: scope.responsibleUserId } : {})
      }
    });

    return lead ? map_crm_lead_read_model(lead) : null;
  }
}
