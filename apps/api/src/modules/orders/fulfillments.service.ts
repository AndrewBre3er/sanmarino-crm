import { createHash } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  FulfillmentStatus as PrismaFulfillmentStatus,
  IdempotencyStatus as PrismaIdempotencyStatus,
  InventoryBucket as PrismaInventoryBucket,
  InventoryMovementType as PrismaInventoryMovementType,
  ReservationStatus as PrismaReservationStatus,
  OrderFulfillmentType as PrismaOrderFulfillmentType,
  OrderStatus as PrismaOrderStatus
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
import { assert_order_status_transition } from "../transactional/orders/order.transition.guard";
import type {
  FulfillmentStatus,
  OrderFulfillmentType,
  OrderStatus
} from "../transactional/shared/status.contract";
import {
  evaluate_order_shipment_progress,
  OrderShipmentProgressError
} from "./order-shipment-status.policy";

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

export interface ConfirmExecutionContext {
  idempotencyKey: string;
  requestId?: string;
  correlationId?: string;
}

const confirm_execution_idempotency_scope = "orders.fulfillment.confirm_execution.v1";

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
        OR: [{ failureReason: { contains: query.search, mode: "insensitive" } }]
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
        payload.fulfillmentType !==
          (from_prisma_enum(order.fulfillmentType) as OrderFulfillmentType)
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
          createdBy: actor.userId,
          fulfillmentType: payload.fulfillmentType
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

  async confirmExecution(
    fulfillmentId: string,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    context: ConfirmExecutionContext
  ): Promise<FulfillmentDetailReadModel> {
    const scope = resolve_order_read_scope(actor, undefined);
    const requestHash = build_confirm_execution_request_hash(fulfillmentId);
    const idempotencyRecord = await this.acquire_confirm_execution_idempotency(
      context.idempotencyKey,
      requestHash
    );

    if (idempotencyRecord.replayed) {
      return this.getFulfillment(fulfillmentId, actor);
    }

    try {
      await this.prismaService.$transaction(async (transactionClient) => {
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

        const fulfillment = await transactionClient.ordersFulfillment.findFirst({
          where: {
            AND: and_clauses
          },
          select: {
            id: true,
            orderId: true,
            status: true,
            fulfilledAt: true,
            order: {
              select: {
                id: true,
                status: true,
                partiallyShippedAt: true,
                shippedAt: true
              }
            }
          }
        });

        if (!fulfillment) {
          throw new NotFoundException(`Fulfillment '${fulfillmentId}' was not found`);
        }

        if (fulfillment.status === "FAILED" || fulfillment.status === "CANCELLED") {
          throw new ConflictException({
            code: "TRANSITION_NOT_ALLOWED",
            message: "Only pending/completed fulfillment can be confirmed"
          });
        }

        const executedAt = fulfillment.fulfilledAt ?? new Date();
        if (fulfillment.status === "PENDING") {
          await transactionClient.ordersFulfillment.update({
            where: { id: fulfillment.id },
            data: {
              status: "COMPLETED",
              fulfilledAt: executedAt
            }
          });
        }

        const createdIssueMovementsCount = await this.create_inventory_issue_side_effects(
          transactionClient,
          fulfillment.id,
          fulfillment.orderId,
          actor.userId
        );

        const shipment_progress = await this.read_order_shipment_progress(
          transactionClient,
          fulfillment.orderId
        );
        const target_status = shipment_progress.recommendedStatus;
        let appliedOrderStatus: Extract<OrderStatus, "partially_shipped" | "shipped"> | null = null;
        if (target_status) {
          const current_order_status = from_prisma_enum(fulfillment.order.status) as OrderStatus;
          if (current_order_status !== target_status) {
            this.assert_order_status_transition(current_order_status, target_status);

            await transactionClient.ordersOrder.update({
              where: { id: fulfillment.orderId },
              data: {
                status: to_prisma_enum<PrismaOrderStatus>(target_status),
                ...(target_status === "partially_shipped" && !fulfillment.order.partiallyShippedAt
                  ? { partiallyShippedAt: executedAt }
                  : {}),
                ...(target_status === "shipped" && !fulfillment.order.shippedAt
                  ? { shippedAt: executedAt }
                  : {})
              }
            });
          }
          appliedOrderStatus = target_status;
        }

        await transactionClient.auditLogRecord.create({
          data: {
            eventId: build_fulfillment_execution_audit_event_id(
              fulfillment.id,
              context.idempotencyKey
            ),
            occurredAt: executedAt,
            action: "orders.fulfillment.confirm_execution",
            entityType: "orders.fulfillment",
            entityId: fulfillment.id,
            actorUserId: actor.userId,
            ...(context.requestId ? { requestId: context.requestId } : {}),
            ...(context.correlationId ? { correlationId: context.correlationId } : {}),
            payload: {
              orderId: fulfillment.orderId,
              fulfillmentStatus: "completed",
              executedAt: executedAt.toISOString(),
              shipmentStatus: appliedOrderStatus,
              createdIssueMovementsCount
            }
          }
        });
      });

      await this.prismaService.systemIdempotencyRecord.update({
        where: { id: idempotencyRecord.recordId },
        data: {
          status: to_prisma_enum<PrismaIdempotencyStatus>("completed"),
          responseStatusCode: 200,
          responseBody: { fulfillmentId },
          lockedUntil: null
        }
      });
    } catch (error) {
      await this.prismaService.systemIdempotencyRecord.update({
        where: { id: idempotencyRecord.recordId },
        data: {
          status: to_prisma_enum<PrismaIdempotencyStatus>("failed"),
          responseStatusCode: resolve_error_status_code(error),
          responseBody: {
            message: error instanceof Error ? error.message : "Fulfillment execution failed"
          },
          lockedUntil: null
        }
      });

      throw error;
    }

    return this.getFulfillment(fulfillmentId, actor);
  }

  private async acquire_confirm_execution_idempotency(
    idempotencyKey: string,
    requestHash: string,
    canRetryOnConflict = true
  ): Promise<{ recordId: string; replayed: boolean }> {
    const existingRecord = await this.prismaService.systemIdempotencyRecord.findUnique({
      where: {
        scope_idempotencyKey: {
          scope: confirm_execution_idempotency_scope,
          idempotencyKey
        }
      },
      select: {
        id: true,
        requestHash: true,
        status: true,
        lockedUntil: true
      }
    });

    const now = new Date();
    const lockUntil = new Date(now.getTime() + 5 * 60 * 1000);
    if (existingRecord) {
      if (existingRecord.requestHash !== requestHash) {
        throw new ConflictException({
          code: "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD",
          message: "Idempotency key is already used with a different command payload"
        });
      }

      if (existingRecord.status === "COMPLETED") {
        return { recordId: existingRecord.id, replayed: true };
      }

      if (
        existingRecord.status === "STARTED" &&
        existingRecord.lockedUntil &&
        existingRecord.lockedUntil > now
      ) {
        throw new ConflictException({
          code: "CONFLICT",
          message: "Command with this Idempotency-Key is already in progress"
        });
      }

      const restarted = await this.prismaService.systemIdempotencyRecord.update({
        where: { id: existingRecord.id },
        data: {
          status: to_prisma_enum<PrismaIdempotencyStatus>("started"),
          lockedUntil: lockUntil,
          responseStatusCode: null,
          responseBody: Prisma.DbNull
        },
        select: { id: true }
      });

      return { recordId: restarted.id, replayed: false };
    }

    try {
      const created = await this.prismaService.systemIdempotencyRecord.create({
        data: {
          scope: confirm_execution_idempotency_scope,
          idempotencyKey,
          requestHash,
          status: to_prisma_enum<PrismaIdempotencyStatus>("started"),
          lockedUntil: lockUntil
        },
        select: { id: true }
      });

      return { recordId: created.id, replayed: false };
    } catch (error) {
      if (canRetryOnConflict && is_unique_constraint_error(error)) {
        return this.acquire_confirm_execution_idempotency(idempotencyKey, requestHash, false);
      }
      throw error;
    }
  }

  private async create_inventory_issue_side_effects(
    transactionClient: Prisma.TransactionClient,
    fulfillmentId: string,
    orderId: string,
    actorUserId: string
  ): Promise<number> {
    const existingIssueCount = await transactionClient.inventoryInventoryMovement.count({
      where: {
        fulfillmentId,
        movementType: to_prisma_enum<PrismaInventoryMovementType>("issue")
      }
    });
    if (existingIssueCount > 0) {
      return 0;
    }

    const fulfillmentItems = await transactionClient.ordersFulfillmentItem.findMany({
      where: { fulfillmentId },
      select: {
        id: true,
        orderItemId: true,
        qty: true,
        orderItem: {
          select: {
            productId: true
          }
        }
      }
    });

    if (fulfillmentItems.length === 0) {
      throw new ConflictException({
        code: "VALIDATION_ERROR",
        message: "Fulfillment must contain items before execution confirmation"
      });
    }

    const productIds = [...new Set(fulfillmentItems.map((item) => item.orderItem.productId))];
    const reservations = await transactionClient.inventoryReservation.findMany({
      where: {
        orderId,
        productId: { in: productIds },
        status: {
          in: [
            to_prisma_enum<PrismaReservationStatus>("active"),
            to_prisma_enum<PrismaReservationStatus>("consumed")
          ]
        }
      },
      orderBy: [{ createdAt: "asc" }],
      select: {
        id: true,
        productId: true,
        warehouseId: true,
        qty: true
      }
    });

    const reservationIds = reservations.map((reservation) => reservation.id);
    const existingIssueByReservation =
      reservationIds.length > 0
        ? await transactionClient.inventoryInventoryMovement.findMany({
            where: {
              reservationId: { in: reservationIds },
              movementType: to_prisma_enum<PrismaInventoryMovementType>("issue")
            },
            select: {
              reservationId: true,
              qty: true
            }
          })
        : [];

    const issuedQtyByReservation = new Map<string, number>();
    for (const issue of existingIssueByReservation) {
      if (!issue.reservationId) {
        continue;
      }
      const issued =
        (issuedQtyByReservation.get(issue.reservationId) ?? 0) + to_quantity_number(issue.qty);
      issuedQtyByReservation.set(issue.reservationId, issued);
    }

    const reservationsByProduct = new Map<
      string,
      Array<{ id: string; warehouseId: string; remainingQty: number }>
    >();
    for (const reservation of reservations) {
      const remainingQty = Math.max(
        0,
        to_quantity_number(reservation.qty) - (issuedQtyByReservation.get(reservation.id) ?? 0)
      );
      const bucket = reservationsByProduct.get(reservation.productId) ?? [];
      bucket.push({
        id: reservation.id,
        warehouseId: reservation.warehouseId,
        remainingQty
      });
      reservationsByProduct.set(reservation.productId, bucket);
    }

    const issueMovements: Prisma.InventoryInventoryMovementCreateManyInput[] = [];
    for (const item of fulfillmentItems) {
      let qtyToIssue = to_quantity_number(item.qty);
      if (qtyToIssue <= 0) {
        continue;
      }

      const reservationBucket = reservationsByProduct.get(item.orderItem.productId) ?? [];
      for (const reservation of reservationBucket) {
        if (qtyToIssue <= 0) {
          break;
        }
        if (reservation.remainingQty <= 0) {
          continue;
        }

        const allocatedQty = Math.min(qtyToIssue, reservation.remainingQty);
        qtyToIssue -= allocatedQty;
        reservation.remainingQty -= allocatedQty;

        issueMovements.push({
          movementType: to_prisma_enum<PrismaInventoryMovementType>("issue"),
          productId: item.orderItem.productId,
          warehouseId: reservation.warehouseId,
          qty: allocatedQty.toString(),
          bucketFrom: to_prisma_enum<PrismaInventoryBucket>("reserved"),
          bucketTo: null,
          orderId,
          fulfillmentId,
          reservationId: reservation.id,
          reason: "fulfillment_confirm_execution",
          performedBy: actorUserId
        });
      }

      if (qtyToIssue > 0.000001) {
        throw new ConflictException({
          code: "INSUFFICIENT_STOCK",
          message: `Insufficient reserved stock for product '${item.orderItem.productId}' to confirm execution`
        });
      }
    }

    if (issueMovements.length > 0) {
      await transactionClient.inventoryInventoryMovement.createMany({
        data: issueMovements
      });
    }

    return issueMovements.length;
  }

  private async read_order_shipment_progress(
    transactionClient: Prisma.TransactionClient,
    orderId: string
  ) {
    const [
      order_items,
      completed_fulfillment_count,
      pending_fulfillment_count,
      completed_fulfillment_items
    ] = await Promise.all([
      transactionClient.ordersOrderItem.findMany({
        where: { orderId },
        select: {
          id: true,
          qty: true
        }
      }),
      transactionClient.ordersFulfillment.count({
        where: {
          orderId,
          status: "COMPLETED"
        }
      }),
      transactionClient.ordersFulfillment.count({
        where: {
          orderId,
          status: "PENDING"
        }
      }),
      transactionClient.ordersFulfillmentItem.findMany({
        where: {
          fulfillment: {
            orderId,
            status: "COMPLETED"
          }
        },
        select: {
          orderItemId: true,
          qty: true
        }
      })
    ]);

    try {
      return evaluate_order_shipment_progress({
        orderItems: order_items.map((item) => ({
          orderItemId: item.id,
          qty: to_quantity_number(item.qty)
        })),
        completedFulfillmentCount: completed_fulfillment_count,
        pendingFulfillmentCount: pending_fulfillment_count,
        completedShipmentItems: completed_fulfillment_items.map((item) => ({
          orderItemId: item.orderItemId,
          qty: to_quantity_number(item.qty)
        }))
      });
    } catch (error) {
      if (error instanceof OrderShipmentProgressError) {
        throw new ConflictException({
          code: "FULFILLMENT_PROGRESS_INVALID",
          message: error.message
        });
      }

      throw error;
    }
  }

  private assert_order_status_transition(from: OrderStatus, to: OrderStatus): void {
    try {
      assert_order_status_transition(from, to);
    } catch (error) {
      throw new ConflictException({
        code: "TRANSITION_NOT_ALLOWED",
        message: error instanceof Error ? error.message : "Order status transition is not allowed"
      });
    }
  }
}

function normalize_create_items(
  items: CreateFulfillmentItemInput[] | undefined
): CreateFulfillmentItemInput[] {
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

function to_quantity_number(value: number | string | { toString: () => string }): number {
  const quantity = Number(typeof value === "number" ? value : value.toString());
  return Number.isFinite(quantity) ? quantity : 0;
}

function build_confirm_execution_request_hash(fulfillmentId: string): string {
  return createHash("sha256").update(JSON.stringify({ fulfillmentId })).digest("hex");
}

function build_fulfillment_execution_audit_event_id(
  fulfillmentId: string,
  idempotencyKey: string
): string {
  const hash = createHash("sha256").update(`${fulfillmentId}:${idempotencyKey}`).digest("hex");
  return `fulfillment_confirm_execution_${hash.slice(0, 40)}`;
}

function resolve_error_status_code(error: unknown): number {
  if (error instanceof NotFoundException) {
    return 404;
  }

  if (error instanceof ConflictException) {
    return 409;
  }

  if (error instanceof BadRequestException) {
    return 422;
  }

  return 500;
}

function is_unique_constraint_error(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const code = (error as { code?: string }).code;
  return code === "P2002";
}
