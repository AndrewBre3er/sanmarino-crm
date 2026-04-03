import { Inject, Injectable } from "@nestjs/common";
import type {
  OrderStatus as PrismaOrderStatus,
  OrdersOrder,
  OrdersOrderItem,
  Prisma
} from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import type {
  OrderDeliveryStatus,
  OrderFulfillmentType,
  OrderStatus
} from "../../transactional/shared/status.contract";
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

export interface OrdersOrderItemReadModel {
  id: string;
  lineNo: number;
  productRef: string;
  productNameSnapshot: string;
  qty: string;
  retailPrice: string;
  discountAmount: string;
  lineTotal: string;
  costSnapshot: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface OrdersOrderReadModel {
  id: string;
  orderNumber: string;
  dealId: string;
  status: OrderStatus;
  fulfillmentType: OrderFulfillmentType;
  deliveryStatus: OrderDeliveryStatus;
  currency: string;
  totalAmount: string;
  confirmedAt: string | null;
  completedAt: string | null;
  closedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  deletedAt: string | null;
  deletedBy: string | null;
  deleteReason: string | null;
  isDeleted: boolean;
}

export interface OrdersOrderDetailReadModel extends OrdersOrderReadModel {
  items: OrdersOrderItemReadModel[];
  paymentIds: string[];
  deliveryTaskIds: string[];
  returnRequestIds: string[];
}

export interface OrdersOrderReadRepositoryContract {
  list(query: ReadCollectionQueryInput): Promise<ReadCollectionResult<OrdersOrderReadModel>>;
  getById(orderId: string, includeDeleted?: boolean): Promise<OrdersOrderDetailReadModel | null>;
}

function map_order_item_read_model(record: OrdersOrderItem): OrdersOrderItemReadModel {
  return {
    id: record.id,
    lineNo: record.lineNo,
    productRef: record.productRef,
    productNameSnapshot: record.productNameSnapshot,
    qty: to_decimal_string(record.qty) ?? "0",
    retailPrice: to_decimal_string(record.retailPrice) ?? "0",
    discountAmount: to_decimal_string(record.discountAmount) ?? "0",
    lineTotal: to_decimal_string(record.lineTotal) ?? "0",
    costSnapshot: to_decimal_string(record.costSnapshot),
    notes: record.notes,
    createdAt: to_iso_datetime(record.createdAt) ?? "",
    updatedAt: to_iso_datetime(record.updatedAt) ?? "",
    version: record.version
  };
}

function map_order_read_model(record: OrdersOrder): OrdersOrderReadModel {
  return {
    id: record.id,
    orderNumber: record.orderNumber,
    dealId: record.dealId,
    status: from_prisma_enum(record.status) as OrderStatus,
    fulfillmentType: from_prisma_enum(record.fulfillmentType) as OrderFulfillmentType,
    deliveryStatus: from_prisma_enum(record.deliveryStatus) as OrderDeliveryStatus,
    currency: record.currency,
    totalAmount: to_decimal_string(record.totalAmount) ?? "0",
    confirmedAt: to_iso_datetime(record.confirmedAt),
    completedAt: to_iso_datetime(record.completedAt),
    closedAt: to_iso_datetime(record.closedAt),
    cancelledAt: to_iso_datetime(record.cancelledAt),
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
export class PrismaOrdersOrderReadRepository implements OrdersOrderReadRepositoryContract {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async list(query: ReadCollectionQueryInput): Promise<ReadCollectionResult<OrdersOrderReadModel>> {
    const where: Prisma.OrdersOrderWhereInput = {};

    if (!query.includeDeleted) {
      where.isDeleted = false;
    }

    if (query.search) {
      where.OR = [
        { orderNumber: { contains: query.search, mode: "insensitive" } },
        { currency: { contains: query.search, mode: "insensitive" } }
      ];
    }

    if (query.status && query.status.length > 0) {
      const mapped = query.status.map((value) => to_prisma_enum<PrismaOrderStatus>(value));
      const [first_status] = mapped;
      if (mapped.length === 1 && first_status) {
        where.status = first_status;
      } else {
        where.status = { in: mapped };
      }
    }

    const orderBy = {
      [query.sortField]: query.sortDirection
    } as Prisma.OrdersOrderOrderByWithRelationInput;

    const [items, totalItems] = await this.prismaService.$transaction([
      this.prismaService.ordersOrder.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      this.prismaService.ordersOrder.count({ where })
    ]);

    return {
      items: items.map(map_order_read_model),
      pagination: build_page_pagination_meta(totalItems, query.page, query.pageSize),
      ...(query.contract.filters ? { appliedFilters: query.contract.filters } : {}),
      ...(query.contract.sort ? { appliedSort: query.contract.sort } : {})
    };
  }

  async getById(orderId: string, includeDeleted = false): Promise<OrdersOrderDetailReadModel | null> {
    const order = await this.prismaService.ordersOrder.findUnique({
      where: { id: orderId },
      include: {
        items: {
          orderBy: { lineNo: "asc" }
        },
        payments: {
          where: { isDeleted: false },
          select: { id: true }
        },
        deliveryTasks: {
          select: { id: true }
        },
        returnRequests: {
          where: { isDeleted: false },
          select: { id: true }
        }
      }
    });

    if (!order) {
      return null;
    }

    if (!includeDeleted && order.isDeleted) {
      return null;
    }

    return {
      ...map_order_read_model(order),
      items: order.items.map(map_order_item_read_model),
      paymentIds: order.payments.map((payment) => payment.id),
      deliveryTaskIds: order.deliveryTasks.map((task) => task.id),
      returnRequestIds: order.returnRequests.map((request) => request.id)
    };
  }
}
