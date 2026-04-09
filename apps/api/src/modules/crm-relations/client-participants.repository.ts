import { Inject, Injectable } from "@nestjs/common";
import type { CrmClientParticipant, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type {
  ReadCollectionQueryInput,
  ReadCollectionResult
} from "../read-side/shared/read-model.contract";
import { build_page_pagination_meta } from "../read-side/shared/read-query.dto";

export const crm_client_participant_role_types = ["installer", "designer"] as const;
export type CrmClientParticipantRoleType = (typeof crm_client_participant_role_types)[number];

export interface CrmClientParticipantRecord {
  id: string;
  clientId: string;
  dealId: string | null;
  orderId: string | null;
  roleType: CrmClientParticipantRoleType;
  name: string;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrmClientParticipantCreateInput {
  clientId: string;
  dealId?: string | null;
  roleType: CrmClientParticipantRoleType;
  name: string;
  phone?: string | null;
  notes?: string | null;
}

export interface CrmClientParticipantListFilters {
  clientId?: string;
  dealId?: string;
  roleType?: CrmClientParticipantRoleType;
}

export interface CrmClientParticipantAccessScope {
  responsibleUserId?: string;
}

function to_iso_datetime(value: Date): string {
  return value.toISOString();
}

function map_role_type(value: string): CrmClientParticipantRoleType {
  if (value === "installer") {
    return "installer";
  }

  if (value === "designer") {
    return "designer";
  }

  throw new Error(`Unsupported client participant role type '${value}'`);
}

function map_client_participant_record(record: CrmClientParticipant): CrmClientParticipantRecord {
  return {
    id: record.id,
    clientId: record.clientId,
    dealId: record.dealId,
    orderId: record.orderId,
    roleType: map_role_type(record.roleType),
    name: record.name,
    phone: record.phone,
    notes: record.notes,
    createdAt: to_iso_datetime(record.createdAt),
    updatedAt: to_iso_datetime(record.updatedAt)
  };
}

@Injectable()
export class PrismaCrmClientParticipantRepository {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async list(
    query: ReadCollectionQueryInput,
    filters: CrmClientParticipantListFilters = {},
    scope?: CrmClientParticipantAccessScope
  ): Promise<ReadCollectionResult<CrmClientParticipantRecord>> {
    const where: Prisma.CrmClientParticipantWhereInput = {};
    const andClauses: Prisma.CrmClientParticipantWhereInput[] = [];

    if (query.search) {
      andClauses.push({
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { phone: { contains: query.search, mode: "insensitive" } },
          { notes: { contains: query.search, mode: "insensitive" } },
          { roleType: { contains: query.search, mode: "insensitive" } }
        ]
      });
    }

    if (filters.clientId) {
      andClauses.push({ clientId: filters.clientId });
    }

    if (filters.dealId) {
      andClauses.push({ dealId: filters.dealId });
    }

    if (filters.roleType) {
      andClauses.push({ roleType: filters.roleType });
    }

    if (scope?.responsibleUserId) {
      andClauses.push({
        OR: [
          { client: { leads: { some: { responsibleUserId: scope.responsibleUserId } } } },
          { client: { deals: { some: { responsibleUserId: scope.responsibleUserId } } } },
          { deal: { responsibleUserId: scope.responsibleUserId } }
        ]
      });
    }

    if (andClauses.length > 0) {
      where.AND = andClauses;
    }

    const orderBy = {
      [query.sortField]: query.sortDirection
    } as Prisma.CrmClientParticipantOrderByWithRelationInput;

    const [items, totalItems] = await this.prismaService.$transaction([
      this.prismaService.crmClientParticipant.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      this.prismaService.crmClientParticipant.count({ where })
    ]);

    return {
      items: items.map(map_client_participant_record),
      pagination: build_page_pagination_meta(totalItems, query.page, query.pageSize),
      ...(query.contract.filters ? { appliedFilters: query.contract.filters } : {}),
      ...(query.contract.sort ? { appliedSort: query.contract.sort } : {})
    };
  }

  async findById(
    id: string,
    scope?: CrmClientParticipantAccessScope
  ): Promise<CrmClientParticipantRecord | null> {
    const andClauses: Prisma.CrmClientParticipantWhereInput[] = [{ id }];

    if (scope?.responsibleUserId) {
      andClauses.push({
        OR: [
          { client: { leads: { some: { responsibleUserId: scope.responsibleUserId } } } },
          { client: { deals: { some: { responsibleUserId: scope.responsibleUserId } } } },
          { deal: { responsibleUserId: scope.responsibleUserId } }
        ]
      });
    }

    const participant = await this.prismaService.crmClientParticipant.findFirst({
      where: {
        AND: andClauses
      }
    });
    return participant ? map_client_participant_record(participant) : null;
  }

  async create(input: CrmClientParticipantCreateInput): Promise<CrmClientParticipantRecord> {
    const created = await this.prismaService.crmClientParticipant.create({
      data: {
        clientId: input.clientId,
        ...(input.dealId !== undefined ? { dealId: input.dealId } : {}),
        roleType: input.roleType,
        name: input.name,
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {})
      }
    });

    return map_client_participant_record(created);
  }
}
