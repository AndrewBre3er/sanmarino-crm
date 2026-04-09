import { Inject, Injectable } from "@nestjs/common";
import type { CrmClient, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type {
  ReadCollectionQueryInput,
  ReadCollectionResult
} from "../read-side/shared/read-model.contract";
import { build_page_pagination_meta } from "../read-side/shared/read-query.dto";

export interface CrmClientRecord {
  id: string;
  clientType: string;
  name: string;
  legalName: string | null;
  phone: string | null;
  email: string | null;
  taxId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrmClientCreateInput {
  clientType: string;
  name: string;
  legalName?: string | null;
  phone?: string | null;
  email?: string | null;
  taxId?: string | null;
  notes?: string | null;
}

function to_iso_datetime(value: Date): string {
  return value.toISOString();
}

function map_client_record(record: CrmClient): CrmClientRecord {
  return {
    id: record.id,
    clientType: record.clientType,
    name: record.name,
    legalName: record.legalName,
    phone: record.phone,
    email: record.email,
    taxId: record.taxId,
    notes: record.notes,
    createdAt: to_iso_datetime(record.createdAt),
    updatedAt: to_iso_datetime(record.updatedAt)
  };
}

@Injectable()
export class PrismaCrmClientRepository {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async list(query: ReadCollectionQueryInput): Promise<ReadCollectionResult<CrmClientRecord>> {
    const where: Prisma.CrmClientWhereInput = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { legalName: { contains: query.search, mode: "insensitive" } },
        { phone: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
        { taxId: { contains: query.search, mode: "insensitive" } }
      ];
    }

    const orderBy = {
      [query.sortField]: query.sortDirection
    } as Prisma.CrmClientOrderByWithRelationInput;

    const [items, totalItems] = await this.prismaService.$transaction([
      this.prismaService.crmClient.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      this.prismaService.crmClient.count({ where })
    ]);

    return {
      items: items.map(map_client_record),
      pagination: build_page_pagination_meta(totalItems, query.page, query.pageSize),
      ...(query.contract.filters ? { appliedFilters: query.contract.filters } : {}),
      ...(query.contract.sort ? { appliedSort: query.contract.sort } : {})
    };
  }

  async findById(id: string): Promise<CrmClientRecord | null> {
    const client = await this.prismaService.crmClient.findUnique({ where: { id } });
    return client ? map_client_record(client) : null;
  }

  async create(input: CrmClientCreateInput): Promise<CrmClientRecord> {
    const created = await this.prismaService.crmClient.create({
      data: {
        clientType: input.clientType,
        name: input.name,
        ...(input.legalName !== undefined ? { legalName: input.legalName } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.taxId !== undefined ? { taxId: input.taxId } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {})
      }
    });

    return map_client_record(created);
  }
}
