import { Inject, Injectable } from "@nestjs/common";
import type { CrmContact, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type {
  ReadCollectionQueryInput,
  ReadCollectionResult
} from "../read-side/shared/read-model.contract";
import { build_page_pagination_meta } from "../read-side/shared/read-query.dto";

export interface CrmContactRecord {
  id: string;
  clientId: string;
  name: string;
  phone: string | null;
  email: string | null;
  position: string | null;
  isPrimary: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrmContactCreateInput {
  clientId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  position?: string | null;
  isPrimary?: boolean;
  notes?: string | null;
}

export interface CrmContactListFilters {
  clientId?: string;
}

export interface CrmContactAccessScope {
  responsibleUserId?: string;
}

function to_iso_datetime(value: Date): string {
  return value.toISOString();
}

function map_contact_record(record: CrmContact): CrmContactRecord {
  return {
    id: record.id,
    clientId: record.clientId,
    name: record.name,
    phone: record.phone,
    email: record.email,
    position: record.position,
    isPrimary: record.isPrimary,
    notes: record.notes,
    createdAt: to_iso_datetime(record.createdAt),
    updatedAt: to_iso_datetime(record.updatedAt)
  };
}

@Injectable()
export class PrismaCrmContactRepository {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async list(
    query: ReadCollectionQueryInput,
    filters: CrmContactListFilters = {},
    scope?: CrmContactAccessScope
  ): Promise<ReadCollectionResult<CrmContactRecord>> {
    const where: Prisma.CrmContactWhereInput = {};
    const andClauses: Prisma.CrmContactWhereInput[] = [];

    if (query.search) {
      andClauses.push({
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { phone: { contains: query.search, mode: "insensitive" } },
          { email: { contains: query.search, mode: "insensitive" } },
          { position: { contains: query.search, mode: "insensitive" } }
        ]
      });
    }

    if (filters.clientId) {
      andClauses.push({ clientId: filters.clientId });
    }

    if (scope?.responsibleUserId) {
      andClauses.push({
        OR: [
          { client: { leads: { some: { responsibleUserId: scope.responsibleUserId } } } },
          { client: { deals: { some: { responsibleUserId: scope.responsibleUserId } } } },
          { leads: { some: { responsibleUserId: scope.responsibleUserId } } },
          { deals: { some: { responsibleUserId: scope.responsibleUserId } } }
        ]
      });
    }

    if (andClauses.length > 0) {
      where.AND = andClauses;
    }

    const orderBy = {
      [query.sortField]: query.sortDirection
    } as Prisma.CrmContactOrderByWithRelationInput;

    const [items, totalItems] = await this.prismaService.$transaction([
      this.prismaService.crmContact.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      this.prismaService.crmContact.count({ where })
    ]);

    return {
      items: items.map(map_contact_record),
      pagination: build_page_pagination_meta(totalItems, query.page, query.pageSize),
      ...(query.contract.filters ? { appliedFilters: query.contract.filters } : {}),
      ...(query.contract.sort ? { appliedSort: query.contract.sort } : {})
    };
  }

  async findById(id: string, scope?: CrmContactAccessScope): Promise<CrmContactRecord | null> {
    const andClauses: Prisma.CrmContactWhereInput[] = [{ id }];

    if (scope?.responsibleUserId) {
      andClauses.push({
        OR: [
          { client: { leads: { some: { responsibleUserId: scope.responsibleUserId } } } },
          { client: { deals: { some: { responsibleUserId: scope.responsibleUserId } } } },
          { leads: { some: { responsibleUserId: scope.responsibleUserId } } },
          { deals: { some: { responsibleUserId: scope.responsibleUserId } } }
        ]
      });
    }

    const contact = await this.prismaService.crmContact.findFirst({
      where: {
        AND: andClauses
      }
    });
    return contact ? map_contact_record(contact) : null;
  }

  async create(input: CrmContactCreateInput): Promise<CrmContactRecord> {
    const created = await this.prismaService.crmContact.create({
      data: {
        clientId: input.clientId,
        name: input.name,
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.position !== undefined ? { position: input.position } : {}),
        ...(input.isPrimary !== undefined ? { isPrimary: input.isPrimary } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {})
      }
    });

    return map_contact_record(created);
  }
}
