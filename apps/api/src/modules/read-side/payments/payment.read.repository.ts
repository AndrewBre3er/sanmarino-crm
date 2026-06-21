import { Inject, Injectable } from "@nestjs/common";
import type { PaymentsPayment, PaymentStatus as PrismaPaymentStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import type {
  PaymentExternalSource,
  PaymentMethod,
  PaymentSourceType,
  PaymentStatus
} from "../../transactional/shared/status.contract";
import type {
  PaymentsPaymentReadScope,
} from "./payment.read.scope";
import type {
  ReadCollectionQueryInput,
  ReadCollectionResult
} from "../shared/read-model.contract";
import { build_page_pagination_meta } from "../shared/read-query.dto";
import {
  from_prisma_enum,
  to_decimal_string,
  to_iso_datetime,
  to_prisma_enum
} from "../shared/prisma-read.mapper";

export interface PaymentsPaymentReadModel {
  id: string;
  paymentNumber: string;
  orderId: string;
  status: PaymentStatus;
  sourceType: PaymentSourceType;
  externalSource: PaymentExternalSource;
  externalEventId: string;
  paymentMethod: PaymentMethod;
  amount: string;
  refundedAmount: string;
  receivedAt: string | null;
  intakedAt: string;
  confirmedBy: string | null;
  confirmedAt: string | null;
  rejectedAt: string | null;
  externalReference: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  deletedAt: string | null;
  deletedBy: string | null;
  deleteReason: string | null;
  isDeleted: boolean;
}

export interface PaymentsPaymentReadRepositoryContract {
  list(
    query: ReadCollectionQueryInput,
    scope?: PaymentsPaymentReadScope
  ): Promise<ReadCollectionResult<PaymentsPaymentReadModel>>;
  getById(
    paymentId: string,
    includeDeleted?: boolean,
    scope?: PaymentsPaymentReadScope
  ): Promise<PaymentsPaymentReadModel | null>;
}

function map_payment_read_model(record: PaymentsPayment): PaymentsPaymentReadModel {
  return {
    id: record.id,
    paymentNumber: record.paymentNumber,
    orderId: record.orderId,
    status: from_prisma_enum(record.status) as PaymentStatus,
    sourceType: from_prisma_enum(record.sourceType) as PaymentSourceType,
    externalSource: record.externalSource as PaymentExternalSource,
    externalEventId: record.externalEventId,
    paymentMethod: from_prisma_enum(record.paymentMethod) as PaymentMethod,
    amount: to_decimal_string(record.amount) ?? "0",
    refundedAmount: to_decimal_string(record.refundedAmount) ?? "0",
    receivedAt: to_iso_datetime(record.receivedAt),
    intakedAt: to_iso_datetime(record.intakedAt) ?? "",
    confirmedBy: record.confirmedBy,
    confirmedAt: to_iso_datetime(record.confirmedAt),
    rejectedAt: to_iso_datetime(record.rejectedAt),
    externalReference: record.externalReference,
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
export class PrismaPaymentsPaymentReadRepository implements PaymentsPaymentReadRepositoryContract {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async list(
    query: ReadCollectionQueryInput,
    scope?: PaymentsPaymentReadScope
  ): Promise<ReadCollectionResult<PaymentsPaymentReadModel>> {
    const where: Prisma.PaymentsPaymentWhereInput = {};

    if (!query.includeDeleted) {
      where.isDeleted = false;
    }

    if (query.search) {
      where.OR = [
        { paymentNumber: { contains: query.search, mode: "insensitive" } },
        { externalEventId: { contains: query.search, mode: "insensitive" } },
        { externalReference: { contains: query.search, mode: "insensitive" } }
      ];
    }

    if (query.status && query.status.length > 0) {
      const mapped = query.status.map((value) => to_prisma_enum<PrismaPaymentStatus>(value));
      const [first_status] = mapped;
      if (mapped.length === 1 && first_status) {
        where.status = first_status;
      } else {
        where.status = { in: mapped };
      }
    }

    if (scope?.responsibleUserId) {
      where.order = {
        deal: {
          responsibleUserId: scope.responsibleUserId
        }
      };
    }

    const orderBy = {
      [query.sortField]: query.sortDirection
    } as Prisma.PaymentsPaymentOrderByWithRelationInput;

    const [items, totalItems] = await this.prismaService.$transaction([
      this.prismaService.paymentsPayment.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      this.prismaService.paymentsPayment.count({ where })
    ]);

    return {
      items: items.map(map_payment_read_model),
      pagination: build_page_pagination_meta(totalItems, query.page, query.pageSize),
      ...(query.contract.filters ? { appliedFilters: query.contract.filters } : {}),
      ...(query.contract.sort ? { appliedSort: query.contract.sort } : {})
    };
  }

  async getById(
    paymentId: string,
    includeDeleted = false,
    scope?: PaymentsPaymentReadScope
  ): Promise<PaymentsPaymentReadModel | null> {
    const and_clauses: Prisma.PaymentsPaymentWhereInput[] = [{ id: paymentId }];
    if (scope?.responsibleUserId) {
      and_clauses.push({
        order: {
          deal: {
            responsibleUserId: scope.responsibleUserId
          }
        }
      });
    }

    const payment = await this.prismaService.paymentsPayment.findFirst({
      where: {
        AND: and_clauses
      }
    });

    if (!payment) {
      return null;
    }

    if (!includeDeleted && payment.isDeleted) {
      return null;
    }

    return map_payment_read_model(payment);
  }
}
