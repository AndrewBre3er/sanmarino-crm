import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type {
  FulfillmentStatus as PrismaFulfillmentStatus,
  OrderFulfillmentType as PrismaOrderFulfillmentType,
  Prisma
} from "@prisma/client";
import type { AuthPrincipal } from "../auth/auth.contract";
import { build_page_pagination_meta } from "../read-side/shared/read-query.dto";
import {
  from_prisma_enum,
  to_decimal_string,
  to_iso_datetime,
  to_prisma_enum
} from "../read-side/shared/prisma-read.mapper";
import type {
  ReadCollectionQueryInput,
  ReadCollectionResult
} from "../read-side/shared/read-model.contract";
import { PrismaService } from "../../prisma/prisma.service";
import { resolve_order_read_scope } from "./orders.service";
import type {
  FulfillmentStatus,
  OrderFulfillmentType
} from "../transactional/shared/status.contract";

export interface FulfillmentItemReadModel {
  id: string;
  fulfillmentId: string;
  orderItemId: string;
  qty: string;
  createdAt: string;
  updatedAt: string;
}

export interface FulfillmentReadModel {
  id: string;
  orderId: string;
  status: FulfillmentStatus;
  fulfillmentType: OrderFulfillmentType;
  fulfilledAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  itemsCount: number;
}

export interface FulfillmentDetailReadModel extends FulfillmentReadModel {
  items: FulfillmentItemReadModel[];
}

export interface FulfillmentsListFilters {
  orderId?: string;
}

export interface CreateFulfillmentItemInput {
  orderItemId: string;
  qty: string;
}

export interface CreateFulfillmentInput {
  orderId: string;
  fulfillmentType?: OrderFulfillmentType;
  items?: CreateFulfillmentItemInput[];
}

function map_fulfillment_item(record: {
  id: string;
  fulfillmentId: string;
  orderItemId: string;
  qty: string | number | { toString: () => string } | null | undefined;
  createdAt: Date;
  updatedAt: Date;
}): FulfillmentItemReadModel {
  return {
    id: record.id,
    fulfillmentId: record.fulfillmentId,
    orderItemId: record.orderItemId,
    qty: to_decimal_string(record.qty) ?? "0",
    createdAt: to_iso_datetime(record.createdAt) ?? "",
    updatedAt: to_iso_datetime(record.updatedAt) ?? ""
  };
}

function map_fulfillment(record: {
  id: string;
  orderId: string;
  status: PrismaFulfillmentStatus;
  fulfillmentType: PrismaOrderFulfillmentType;
  fulfilledAt: Date | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  _count?: { items?: number };
}): FulfillmentReadModel {
  return {
    id: record.id,
    orderId: record.orderId,
    status: from_prisma_enum(record.status) as FulfillmentStatus,
    fulfillmentType: from_prisma_enum(record.fulfillmentType) as OrderFulfillmentType,
    fulfilledAt: to_iso_datetime(record.fulfilledAt),
    failureReason: record.failureReason,
    createdAt: to_iso_datetime(record.createdAt) ?? "",
    updatedAt: to_iso_datetime(record.updatedAt) ?? "",
    version: record.version,
    itemsCount: record._count?.items ?? 0
  };
}

@Injectable()
export class FulfillmentsService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async listFulfillments(
    query: ReadCollectionQueryInput,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    filters: FulfillmentsListFilters = {}
  ): Promise<ReadCollectionResult<FulfillmentReadModel>> {
    const scope = resolve_order_read_scope(actor, undefined);
    const and_clauses: Prisma.OrdersFulfillmentWhereInput[] = [];

    if (filters.orderId) {
      and_clauses.push({ orderId: filters.orderId });
    }

    if (query.search) {
      and_clauses.push({
        OR: [
          { failureReason: { contains: query.search, mode: "insensitive" } }
        ]
      });
    }

    if (query.status && query.status.length > 0) {
      const mapped = query.status.map((value) => to_prisma_enum<PrismaFulfillmentStatus>(value));
      const [first_status] = mapped;
      if (mapped.length === 1 && first_status) {
        and_clauses.push({ status: first_status });
      } else {
        and_clauses.push({ status: { in: mapped } });
      }
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

    const where: Prisma.OrdersFulfillmentWhereInput =
      and_clauses.length > 0 ? { AND: and_clauses } : {};

    const orderBy = {
      [query.sortField]: query.sortDirection
    } as Prisma.OrdersFulfillmentOrderByWithRelationInput;

    const [items, totalItems] = await this.prismaService.$transaction([
      this.prismaService.ordersFulfillment.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          _count: {
            select: {
              items: true
            }
          }
        }
      }),
      this.prismaService.ordersFulfillment.count({ where })
    ]);

    return {
      items: items.map(map_fulfillment),
      pagination: build_page_pagination_meta(totalItems, query.page, query.pageSize),
      ...(query.contract.filters ? { appliedFilters: query.contract.filters } : {}),
      ...(query.contract.sort ? { appliedSort: query.contract.sort } : {})
    };
  }

  async getFulfillment(
    fulfillmentId: string,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">
  ): Promise<FulfillmentDetailReadModel> {
    const scope = resolve_order_read_scope(actor, undefined);
    const and_clauses: Prisma.OrdersFulfillmentWhereInput[] = [{ id: fulfillmentId }];

    if (scope?.responsibleUserId) {
      and_clauses.push({
        order: {
          deal: {
            responsibleUserId: scope.responsibleUserId
          }
        }
      });
    }

    const fulfillment = await this.prismaService.ordersFulfillment.findFirst({
      where: {
        AND: and_clauses
      },
      include: {
        items: {
          orderBy: { createdAt: "asc" }
        },
        _count: {
          select: {
            items: true
          }
        }
      }
    });

    if (!fulfillment) {
      throw new NotFoundException(`Fulfillment '${fulfillmentId}' was not found`);
    }

    return {
      ...map_fulfillment(fulfillment),
      items: fulfillment.items.map(map_fulfillment_item)
    };
  }

  async createFulfillment(
    payload: CreateFulfillmentInput,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">
  ): Promise<FulfillmentDetailReadModel> {
    const scope = resolve_order_read_scope(actor, undefined);
    const normalizedItems = normalize_create_items(payload.items);

    const fulfillment_id = await this.prismaService.$transaction(async (transactionClient) => {
      const order_scope_clauses: Prisma.OrdersOrderWhereInput[] = [
        { id: payload.orderId },
        { isDeleted: false }
      ];

      if (scope?.responsibleUserId) {
        order_scope_clauses.push({
          deal: {
            responsibleUserId: scope.responsibleUserId
          }
        });
      }

      const order = await transactionClient.ordersOrder.findFirst({
        where: {
          AND: order_scope_clauses
        },
        select: {
          id: true,
          fulfillmentType: true
        }
      });

      if (!order) {
        throw new NotFoundException(`Order '${payload.orderId}' was not found`);
      }

      if (
        payload.fulfillmentType &&
        payload.fulfillmentType !== (from_prisma_enum(order.fulfillmentType) as OrderFulfillmentType)
      ) {
        throw new ConflictException({
          code: "VALIDATION_ERROR",
          message: "Fulfillment type must match order fulfillment type"
        });
      }

      if (normalizedItems.length > 0) {
        const requested_ids = normalizedItems.map((item) => item.orderItemId);
        const order_items = await transactionClient.ordersOrderItem.findMany({
          where: {
            orderId: order.id,
            id: { in: requested_ids }
          },
          select: {
            id: true,
            qty: true
          }
        });

        const order_item_by_id = new Map(
          order_items.map((item) => [item.id, Number(to_decimal_string(item.qty) ?? "0")])
        );

        for (const item of normalizedItems) {
          const max_qty = order_item_by_id.get(item.orderItemId);
          if (max_qty === undefined) {
            throw new ConflictException({
              code: "VALIDATION_ERROR",
              message: `Order item '${item.orderItemId}' is not linked to order '${order.id}'`
            });
          }

          if (Number(item.qty) > max_qty) {
            throw new ConflictException({
              code: "VALIDATION_ERROR",
              message: `Fulfillment qty exceeds order item qty for '${item.orderItemId}'`
            });
          }
        }
      }

      const created = await transactionClient.ordersFulfillment.create({
        data: {
          orderId: order.id,
          status: "PENDING",
          fulfillmentType:
            payload.fulfillmentType
              ? to_prisma_enum<PrismaOrderFulfillmentType>(payload.fulfillmentType)
              : order.fulfillmentType
        },
        select: {
          id: true
        }
      });

      if (normalizedItems.length > 0) {
        await transactionClient.ordersFulfillmentItem.createMany({
          data: normalizedItems.map((item) => ({
            fulfillmentId: created.id,
            orderItemId: item.orderItemId,
            qty: item.qty
          }))
        });
      }

      return created.id;
    });

    return this.getFulfillment(fulfillment_id, actor);
  }
}

function normalize_create_items(items: CreateFulfillmentItemInput[] | undefined): CreateFulfillmentItemInput[] {
  if (!items || items.length === 0) {
    return [];
  }

  const seen_order_item_ids = new Set<string>();
  return items.map((item) => {
    const orderItemId = item.orderItemId.trim();
    const qty = item.qty.trim();

    if (!orderItemId) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "orderItemId is required"
      });
    }

    if (seen_order_item_ids.has(orderItemId)) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: `Duplicate orderItemId '${orderItemId}' is not allowed`
      });
    }
    seen_order_item_ids.add(orderItemId);

    const qty_value = Number(qty);
    if (!Number.isFinite(qty_value) || qty_value <= 0) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: `qty must be a positive number for orderItemId '${orderItemId}'`
      });
    }

    return { orderItemId, qty };
  });
}
