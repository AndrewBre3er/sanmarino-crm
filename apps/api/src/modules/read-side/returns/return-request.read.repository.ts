import { Inject, Injectable } from "@nestjs/common";
import type {
  OrdersReturnRequest,
  Prisma,
  ReturnRequestStatus as PrismaReturnRequestStatus
} from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import type {
  ReadCollectionQueryInput,
  ReadCollectionResult
} from "../shared/read-model.contract";
import { build_page_pagination_meta } from "../shared/read-query.dto";
import {
  from_prisma_enum,
  to_decimal_string,
  to_iso_datetime
} from "../shared/prisma-read.mapper";

type ReturnRequestReadStatus = "created" | "confirmed" | "processed" | "closed";

export interface OrdersReturnRequestReadModel {
  id: string;
  orderId: string;
  status: ReturnRequestReadStatus;
  reason: string;
  requestedRefundAmount: string | null;
  approvedRefundAmount: string | null;
  realizationAnchorAt: string | null;
  confirmedAt: string | null;
  requiresCeoApproval: boolean;
  ceoApprovedAt: string | null;
  processedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  deletedAt: string | null;
  deletedBy: string | null;
  deleteReason: string | null;
  isDeleted: boolean;
}

const return_request_status_to_prisma: Record<string, PrismaReturnRequestStatus> = {
  created: "CREATED",
  confirmed: "CONFIRMED",
  processed: "PROCESSED",
  closed: "CLOSED"
};

function map_read_statuses_to_prisma(statuses: readonly string[]): PrismaReturnRequestStatus[] {
  const mapped = statuses
    .map((status) => return_request_status_to_prisma[status.toLowerCase()])
    .filter((status): status is PrismaReturnRequestStatus => Boolean(status));

  return Array.from(new Set(mapped));
}

export interface OrdersReturnRequestReadRepositoryContract {
  list(
    query: ReadCollectionQueryInput
  ): Promise<ReadCollectionResult<OrdersReturnRequestReadModel>>;
  getById(
    returnRequestId: string,
    includeDeleted?: boolean
  ): Promise<OrdersReturnRequestReadModel | null>;
}

function map_return_request_read_model(record: OrdersReturnRequest): OrdersReturnRequestReadModel {
  return {
    id: record.id,
    orderId: record.orderId,
    status: from_prisma_enum(record.status) as ReturnRequestReadStatus,
    reason: record.reason,
    requestedRefundAmount: to_decimal_string(record.requestedRefundAmount),
    approvedRefundAmount: to_decimal_string(record.approvedRefundAmount),
    realizationAnchorAt: to_iso_datetime(record.realizationAnchorAt),
    confirmedAt: to_iso_datetime(record.confirmedAt),
    requiresCeoApproval: record.requiresCeoApproval,
    ceoApprovedAt: to_iso_datetime(record.ceoApprovedAt),
    processedAt: to_iso_datetime(record.processedAt),
    closedAt: to_iso_datetime(record.closedAt),
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
export class PrismaOrdersReturnRequestReadRepository
  implements OrdersReturnRequestReadRepositoryContract
{
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async list(
    query: ReadCollectionQueryInput
  ): Promise<ReadCollectionResult<OrdersReturnRequestReadModel>> {
    const where: Prisma.OrdersReturnRequestWhereInput = {};

    if (!query.includeDeleted) {
      where.isDeleted = false;
    }

    if (query.search) {
      where.OR = [
        { reason: { contains: query.search, mode: "insensitive" } }
      ];
    }

    if (query.status && query.status.length > 0) {
      const mapped = map_read_statuses_to_prisma(query.status);
      const [first_status] = mapped;
      if (mapped.length === 1 && first_status) {
        where.status = first_status;
      } else if (mapped.length > 1) {
        where.status = { in: mapped };
      }
    }

    const orderBy = {
      [query.sortField]: query.sortDirection
    } as Prisma.OrdersReturnRequestOrderByWithRelationInput;

    const [items, totalItems] = await this.prismaService.$transaction([
      this.prismaService.ordersReturnRequest.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      this.prismaService.ordersReturnRequest.count({ where })
    ]);

    return {
      items: items.map(map_return_request_read_model),
      pagination: build_page_pagination_meta(totalItems, query.page, query.pageSize),
      ...(query.contract.filters ? { appliedFilters: query.contract.filters } : {}),
      ...(query.contract.sort ? { appliedSort: query.contract.sort } : {})
    };
  }

  async getById(
    returnRequestId: string,
    includeDeleted = false
  ): Promise<OrdersReturnRequestReadModel | null> {
    const returnRequest = await this.prismaService.ordersReturnRequest.findUnique({
      where: { id: returnRequestId }
    });

    if (!returnRequest) {
      return null;
    }

    if (!includeDeleted && returnRequest.isDeleted) {
      return null;
    }

    return map_return_request_read_model(returnRequest);
  }
}
