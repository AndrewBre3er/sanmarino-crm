import { Inject, Injectable } from "@nestjs/common";
import type { CrmDeal, DealStatus as PrismaDealStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import type { DealStatus } from "../../transactional/shared/status.contract";
import type {
  ReadCollectionQueryInput,
  ReadCollectionResult
} from "../shared/read-model.contract";
import { build_page_pagination_meta } from "../shared/read-query.dto";
import {
  from_prisma_enum,
  to_iso_datetime,
  to_prisma_enum
} from "../shared/prisma-read.mapper";

export interface CrmDealReadModel {
  id: string;
  leadId: string | null;
  status: DealStatus;
  title: string;
  notes: string | null;
  responsibleUserId: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  deletedAt: string | null;
  deletedBy: string | null;
  deleteReason: string | null;
  isDeleted: boolean;
}

export interface CrmDealReadRepositoryContract {
  list(query: ReadCollectionQueryInput): Promise<ReadCollectionResult<CrmDealReadModel>>;
  getById(dealId: string, includeDeleted?: boolean): Promise<CrmDealReadModel | null>;
}

function map_crm_deal_read_model(record: CrmDeal): CrmDealReadModel {
  return {
    id: record.id,
    leadId: record.leadId,
    status: from_prisma_enum(record.status) as DealStatus,
    title: record.title,
    notes: record.notes,
    responsibleUserId: record.responsibleUserId,
    createdAt: to_iso_datetime(record.createdAt) ?? "",
    updatedAt: to_iso_datetime(record.updatedAt) ?? "",
    version: record.version,
    deletedAt: to_iso_datetime(record.deletedAt),
    deletedBy: record.deletedBy,
    deleteReason: record.deleteReason,
    isDeleted: record.isDeleted
  };
}

@Injectable()
export class PrismaCrmDealReadRepository implements CrmDealReadRepositoryContract {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async list(query: ReadCollectionQueryInput): Promise<ReadCollectionResult<CrmDealReadModel>> {
    const where: Prisma.CrmDealWhereInput = {};

    if (!query.includeDeleted) {
      where.isDeleted = false;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { notes: { contains: query.search, mode: "insensitive" } }
      ];
    }

    if (query.status && query.status.length > 0) {
      const mapped = query.status.map((value) => to_prisma_enum<PrismaDealStatus>(value));
      const [first_status] = mapped;
      if (mapped.length === 1 && first_status) {
        where.status = first_status;
      } else {
        where.status = { in: mapped };
      }
    }

    const orderBy = {
      [query.sortField]: query.sortDirection
    } as Prisma.CrmDealOrderByWithRelationInput;

    const [items, totalItems] = await this.prismaService.$transaction([
      this.prismaService.crmDeal.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      this.prismaService.crmDeal.count({ where })
    ]);

    return {
      items: items.map(map_crm_deal_read_model),
      pagination: build_page_pagination_meta(totalItems, query.page, query.pageSize),
      ...(query.contract.filters ? { appliedFilters: query.contract.filters } : {}),
      ...(query.contract.sort ? { appliedSort: query.contract.sort } : {})
    };
  }

  async getById(dealId: string, includeDeleted = false): Promise<CrmDealReadModel | null> {
    const deal = await this.prismaService.crmDeal.findUnique({
      where: { id: dealId }
    });

    if (!deal) {
      return null;
    }

    if (!includeDeleted && deal.isDeleted) {
      return null;
    }

    return map_crm_deal_read_model(deal);
  }
}
