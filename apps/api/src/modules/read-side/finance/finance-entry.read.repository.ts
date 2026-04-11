import { Inject, Injectable } from "@nestjs/common";
import type {
  FinanceEntryType as PrismaFinanceEntryType,
  FinanceFinanceEntry,
  Prisma
} from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import type { FinanceEntryType } from "../../transactional/shared/status.contract";
import type { ReadCollectionQueryInput, ReadCollectionResult } from "../shared/read-model.contract";
import { build_page_pagination_meta } from "../shared/read-query.dto";
import {
  from_prisma_enum,
  to_decimal_string,
  to_iso_datetime,
  to_prisma_enum
} from "../shared/prisma-read.mapper";
import type { FinanceEntryReadScope } from "./finance-entry.read.scope";

export interface FinanceEntryReadModel {
  id: string;
  entryType: FinanceEntryType;
  amount: string;
  currency: string;
  recognizedAt: string;
  paymentId: string | null;
  orderId: string | null;
  cashOperationId: string | null;
  description: string | null;
}

export interface FinanceEntryReadRepositoryContract {
  list(
    query: ReadCollectionQueryInput,
    scope?: FinanceEntryReadScope
  ): Promise<ReadCollectionResult<FinanceEntryReadModel>>;
  getById(
    financeEntryId: string,
    includeDeleted?: boolean,
    scope?: FinanceEntryReadScope
  ): Promise<FinanceEntryReadModel | null>;
}

function map_finance_entry_read_model(record: FinanceFinanceEntry): FinanceEntryReadModel {
  return {
    id: record.id,
    entryType: from_prisma_enum(record.entryType) as FinanceEntryType,
    amount: to_decimal_string(record.amount) ?? "0",
    currency: record.currency,
    recognizedAt: to_iso_datetime(record.recognizedAt) ?? "",
    paymentId: record.paymentId,
    orderId: record.orderId,
    cashOperationId: record.cashOperationId,
    description: record.description
  };
}

function extract_eq_filter(query: ReadCollectionQueryInput, field: string): string | undefined {
  const filters = query.contract.filters ?? [];
  for (const filter of filters) {
    if (filter.field !== field || filter.operator !== "eq") {
      continue;
    }

    if (typeof filter.value !== "string") {
      continue;
    }

    const normalized = filter.value.trim();
    if (normalized.length > 0) {
      return normalized;
    }
  }

  return undefined;
}

@Injectable()
export class PrismaFinanceEntryReadRepository implements FinanceEntryReadRepositoryContract {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async list(
    query: ReadCollectionQueryInput,
    scope?: FinanceEntryReadScope
  ): Promise<ReadCollectionResult<FinanceEntryReadModel>> {
    const and_clauses: Prisma.FinanceFinanceEntryWhereInput[] = [];

    if (query.search) {
      and_clauses.push({
        description: { contains: query.search, mode: "insensitive" }
      });
    }

    if (query.status && query.status.length > 0) {
      const mapped = query.status.map((value) => to_prisma_enum<PrismaFinanceEntryType>(value));
      const [first_entry_type] = mapped;
      if (mapped.length === 1 && first_entry_type) {
        and_clauses.push({ entryType: first_entry_type });
      } else {
        and_clauses.push({ entryType: { in: mapped } });
      }
    }

    const orderId = extract_eq_filter(query, "orderId");
    if (orderId) {
      and_clauses.push({ orderId });
    }

    const paymentId = extract_eq_filter(query, "paymentId");
    if (paymentId) {
      and_clauses.push({ paymentId });
    }

    if (scope?.responsibleUserId) {
      and_clauses.push({
        order: {
          deal: {
            responsibleUserId: scope.responsibleUserId
          }
        }
      });
    }

    const where: Prisma.FinanceFinanceEntryWhereInput =
      and_clauses.length > 0 ? { AND: and_clauses } : {};

    const orderBy = {
      [query.sortField]: query.sortDirection
    } as Prisma.FinanceFinanceEntryOrderByWithRelationInput;

    const [items, totalItems] = await this.prismaService.$transaction([
      this.prismaService.financeFinanceEntry.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      this.prismaService.financeFinanceEntry.count({ where })
    ]);

    return {
      items: items.map(map_finance_entry_read_model),
      pagination: build_page_pagination_meta(totalItems, query.page, query.pageSize),
      ...(query.contract.filters ? { appliedFilters: query.contract.filters } : {}),
      ...(query.contract.sort ? { appliedSort: query.contract.sort } : {})
    };
  }

  async getById(
    financeEntryId: string,
    _includeDeleted = false,
    scope?: FinanceEntryReadScope
  ): Promise<FinanceEntryReadModel | null> {
    const and_clauses: Prisma.FinanceFinanceEntryWhereInput[] = [{ id: financeEntryId }];
    if (scope?.responsibleUserId) {
      and_clauses.push({
        order: {
          deal: {
            responsibleUserId: scope.responsibleUserId
          }
        }
      });
    }

    const entry = await this.prismaService.financeFinanceEntry.findFirst({
      where: {
        AND: and_clauses
      }
    });

    if (!entry) {
      return null;
    }

    return map_finance_entry_read_model(entry);
  }
}
