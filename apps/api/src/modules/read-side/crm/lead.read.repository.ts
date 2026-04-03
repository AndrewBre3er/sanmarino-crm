import { Inject, Injectable } from "@nestjs/common";
import type { CrmLead, Prisma } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import type {
  ReadCollectionQueryInput,
  ReadCollectionResult
} from "../shared/read-model.contract";
import { build_page_pagination_meta } from "../shared/read-query.dto";
import { to_iso_datetime } from "../shared/prisma-read.mapper";

export interface CrmLeadReadModel {
  id: string;
  source: string;
  status: string;
  title: string | null;
  notes: string | null;
  responsibleUserId: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface CrmLeadReadRepositoryContract {
  list(query: ReadCollectionQueryInput): Promise<ReadCollectionResult<CrmLeadReadModel>>;
  getById(leadId: string): Promise<CrmLeadReadModel | null>;
}

function map_crm_lead_read_model(record: CrmLead): CrmLeadReadModel {
  return {
    id: record.id,
    source: record.source,
    status: record.status,
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

  async list(query: ReadCollectionQueryInput): Promise<ReadCollectionResult<CrmLeadReadModel>> {
    const where: Prisma.CrmLeadWhereInput = {};

    if (query.search) {
      where.OR = [
        { source: { contains: query.search, mode: "insensitive" } },
        { title: { contains: query.search, mode: "insensitive" } },
        { notes: { contains: query.search, mode: "insensitive" } }
      ];
    }

    if (query.status && query.status.length > 0) {
      const [first_status] = query.status;
      if (query.status.length === 1 && first_status) {
        where.status = first_status;
      } else {
        where.status = { in: query.status };
      }
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

  async getById(leadId: string): Promise<CrmLeadReadModel | null> {
    const lead = await this.prismaService.crmLead.findUnique({
      where: { id: leadId }
    });

    return lead ? map_crm_lead_read_model(lead) : null;
  }
}
