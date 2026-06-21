import { createHash } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import type { CrmClient, CrmClientMergeCase, Prisma } from "@prisma/client";
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
  addressText: string | null;
  addressComment: string | null;
  installerReferralComment: string | null;
  designerReferralComment: string | null;
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
  addressText?: string | null;
  addressComment?: string | null;
  installerReferralComment?: string | null;
  designerReferralComment?: string | null;
  notes?: string | null;
}

export interface CrmClientUpdateInput {
  clientType?: string;
  name?: string;
  legalName?: string | null;
  phone?: string | null;
  email?: string | null;
  taxId?: string | null;
  addressText?: string | null;
  addressComment?: string | null;
  installerReferralComment?: string | null;
  designerReferralComment?: string | null;
  notes?: string | null;
}

export interface CrmClientAccessScope {
  responsibleUserId?: string;
}

export interface CrmClientMergeCaseRecord {
  id: string;
  primaryClientId: string;
  candidateClientId: string;
  status: "open" | "merged" | "rejected";
  reason: string | null;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  mergedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrmClientMergeInput {
  sourceClientId: string;
  targetClientId: string;
  reason: string | null;
  actorUserId: string;
}

export interface CrmClientDedupCandidateReadModel extends CrmClientMergeCaseRecord {
  primaryClient: Pick<CrmClientRecord, "id" | "name" | "phone" | "email">;
  candidateClient: Pick<CrmClientRecord, "id" | "name" | "phone" | "email">;
}

type CrmClientMergeCaseWithClients = CrmClientMergeCase & {
  primaryClient: Pick<CrmClient, "id" | "name" | "phone" | "email">;
  candidateClient: Pick<CrmClient, "id" | "name" | "phone" | "email">;
};

function to_iso_datetime(value: Date): string {
  return value.toISOString();
}

function to_iso_datetime_nullable(value: Date | null): string | null {
  return value ? value.toISOString() : null;
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
    addressText: record.addressText,
    addressComment: record.addressComment,
    installerReferralComment: record.installerReferralComment,
    designerReferralComment: record.designerReferralComment,
    notes: record.notes,
    createdAt: to_iso_datetime(record.createdAt),
    updatedAt: to_iso_datetime(record.updatedAt)
  };
}

function map_client_merge_case_record(
  record: CrmClientMergeCase
): CrmClientMergeCaseRecord {
  return {
    id: record.id,
    primaryClientId: record.primaryClientId,
    candidateClientId: record.candidateClientId,
    status: record.status as "open" | "merged" | "rejected",
    reason: record.reason,
    reviewedByUserId: record.reviewedByUserId,
    reviewedAt: to_iso_datetime_nullable(record.reviewedAt),
    mergedAt: to_iso_datetime_nullable(record.mergedAt),
    createdAt: to_iso_datetime(record.createdAt),
    updatedAt: to_iso_datetime(record.updatedAt)
  };
}

function map_dedup_candidate_record(
  record: CrmClientMergeCaseWithClients
): CrmClientDedupCandidateReadModel {
  return {
    ...map_client_merge_case_record(record),
    primaryClient: {
      id: record.primaryClient.id,
      name: record.primaryClient.name,
      phone: record.primaryClient.phone,
      email: record.primaryClient.email
    },
    candidateClient: {
      id: record.candidateClient.id,
      name: record.candidateClient.name,
      phone: record.candidateClient.phone,
      email: record.candidateClient.email
    }
  };
}

@Injectable()
export class PrismaCrmClientRepository {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async list(
    query: ReadCollectionQueryInput,
    scope?: CrmClientAccessScope
  ): Promise<ReadCollectionResult<CrmClientRecord>> {
    const where: Prisma.CrmClientWhereInput = {};
    const andClauses: Prisma.CrmClientWhereInput[] = [];

    if (query.search) {
      andClauses.push({
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { legalName: { contains: query.search, mode: "insensitive" } },
          { phone: { contains: query.search, mode: "insensitive" } },
          { email: { contains: query.search, mode: "insensitive" } },
          { taxId: { contains: query.search, mode: "insensitive" } },
          { addressText: { contains: query.search, mode: "insensitive" } }
        ]
      });
    }

    if (scope?.responsibleUserId) {
      andClauses.push({
        OR: [
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

  async findById(id: string, scope?: CrmClientAccessScope): Promise<CrmClientRecord | null> {
    const andClauses: Prisma.CrmClientWhereInput[] = [{ id }];

    if (scope?.responsibleUserId) {
      andClauses.push({
        OR: [
          { leads: { some: { responsibleUserId: scope.responsibleUserId } } },
          { deals: { some: { responsibleUserId: scope.responsibleUserId } } }
        ]
      });
    }

    const client = await this.prismaService.crmClient.findFirst({
      where: {
        AND: andClauses
      }
    });
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
        ...(input.addressText !== undefined ? { addressText: input.addressText } : {}),
        ...(input.addressComment !== undefined ? { addressComment: input.addressComment } : {}),
        ...(input.installerReferralComment !== undefined
          ? { installerReferralComment: input.installerReferralComment }
          : {}),
        ...(input.designerReferralComment !== undefined
          ? { designerReferralComment: input.designerReferralComment }
          : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {})
      }
    });

    return map_client_record(created);
  }

  async updateById(
    id: string,
    input: CrmClientUpdateInput,
    scope?: CrmClientAccessScope
  ): Promise<CrmClientRecord | null> {
    const current = await this.findById(id, scope);
    if (!current) {
      return null;
    }

    const updated = await this.prismaService.crmClient.update({
      where: { id },
      data: {
        ...(input.clientType !== undefined ? { clientType: input.clientType } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.legalName !== undefined ? { legalName: input.legalName } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.taxId !== undefined ? { taxId: input.taxId } : {}),
        ...(input.addressText !== undefined ? { addressText: input.addressText } : {}),
        ...(input.addressComment !== undefined ? { addressComment: input.addressComment } : {}),
        ...(input.installerReferralComment !== undefined
          ? { installerReferralComment: input.installerReferralComment }
          : {}),
        ...(input.designerReferralComment !== undefined
          ? { designerReferralComment: input.designerReferralComment }
          : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {})
      }
    });

    return map_client_record(updated);
  }

  async listDedupCandidates(
    query: ReadCollectionQueryInput,
    scope?: CrmClientAccessScope
  ): Promise<ReadCollectionResult<CrmClientDedupCandidateReadModel>> {
    const where: Prisma.CrmClientMergeCaseWhereInput = {
      status: "open"
    };

    if (scope?.responsibleUserId) {
      where.OR = [
        { primaryClient: { deals: { some: { responsibleUserId: scope.responsibleUserId } } } },
        { candidateClient: { deals: { some: { responsibleUserId: scope.responsibleUserId } } } },
        { primaryClient: { leads: { some: { responsibleUserId: scope.responsibleUserId } } } },
        { candidateClient: { leads: { some: { responsibleUserId: scope.responsibleUserId } } } }
      ];
    }

    const [items, totalItems] = await this.prismaService.$transaction([
      this.prismaService.crmClientMergeCase.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          primaryClient: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true
            }
          },
          candidateClient: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true
            }
          }
        }
      }),
      this.prismaService.crmClientMergeCase.count({ where })
    ]);

    return {
      items: items.map((item) =>
        map_dedup_candidate_record(item as CrmClientMergeCaseWithClients)
      ),
      pagination: build_page_pagination_meta(totalItems, query.page, query.pageSize),
      ...(query.contract.filters ? { appliedFilters: query.contract.filters } : {}),
      ...(query.contract.sort ? { appliedSort: query.contract.sort } : {})
    };
  }

  async mergeClients(input: CrmClientMergeInput): Promise<CrmClientMergeCaseRecord> {
    const merged = await this.prismaService.$transaction(async (transactionClient) => {
      const [sourceClient, targetClient] = await Promise.all([
        transactionClient.crmClient.findUnique({
          where: { id: input.sourceClientId },
          select: { id: true }
        }),
        transactionClient.crmClient.findUnique({
          where: { id: input.targetClientId },
          select: { id: true }
        })
      ]);

      if (!sourceClient || !targetClient) {
        throw new Error("Source and target clients must exist before merge");
      }

      const mergedAt = new Date();
      const mergeCase = await transactionClient.crmClientMergeCase.create({
        data: {
          primaryClientId: input.targetClientId,
          candidateClientId: input.sourceClientId,
          status: "merged",
          reason: input.reason,
          reviewedByUserId: input.actorUserId,
          reviewedAt: mergedAt,
          mergedAt
        }
      });

      await transactionClient.crmContact.updateMany({
        where: { clientId: input.sourceClientId },
        data: { clientId: input.targetClientId }
      });
      await transactionClient.crmLead.updateMany({
        where: { clientId: input.sourceClientId },
        data: { clientId: input.targetClientId }
      });
      await transactionClient.crmDeal.updateMany({
        where: { clientId: input.sourceClientId },
        data: { clientId: input.targetClientId }
      });
      await transactionClient.ordersOrder.updateMany({
        where: { clientId: input.sourceClientId },
        data: { clientId: input.targetClientId }
      });
      await transactionClient.crmClientParticipant.updateMany({
        where: { clientId: input.sourceClientId },
        data: { clientId: input.targetClientId }
      });

      await transactionClient.systemOutboxRecord.create({
        data: {
          eventType: "client.merged",
          aggregateType: "crm.client",
          aggregateId: input.targetClientId,
          payload: {
            targetClientId: input.targetClientId,
            mergedClientId: input.sourceClientId,
            mergedAt: mergedAt.toISOString(),
            actorUserId: input.actorUserId
          } as Prisma.InputJsonValue
        }
      });

      await transactionClient.auditLogRecord.create({
        data: {
          eventId: build_client_merge_audit_event_id(input, mergedAt),
          occurredAt: mergedAt,
          action: "crm.client.merge",
          entityType: "crm.client",
          entityId: input.targetClientId,
          actorUserId: input.actorUserId,
          payload: {
            sourceClientId: input.sourceClientId,
            targetClientId: input.targetClientId,
            reason: input.reason
          } as Prisma.InputJsonValue
        }
      });

      return mergeCase;
    });

    return map_client_merge_case_record(merged);
  }
}

function build_client_merge_audit_event_id(
  input: CrmClientMergeInput,
  mergedAt: Date
): string {
  const hash = createHash("sha256")
    .update(`${input.sourceClientId}:${input.targetClientId}:${input.actorUserId}:${mergedAt.toISOString()}`)
    .digest("hex");

  return `client_merge_${hash.slice(0, 40)}`;
}
