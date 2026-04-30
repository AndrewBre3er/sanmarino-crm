import { createHash } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
  ReturnRequestStatus as PrismaReturnRequestStatus
} from "@prisma/client";
import type { AuthPrincipal } from "../auth/auth.contract";
import { from_prisma_enum, to_decimal_string, to_iso_datetime, to_prisma_enum } from "../read-side/shared/prisma-read.mapper";
import { resolve_order_read_scope } from "./orders.service";

import { PrismaService } from "../../prisma/prisma.service";
import { assert_return_request_status_transition } from "../transactional/orders/return-request.transition.guard";

export type ReturnRequestItemResolution = "return_to_quarantine" | "writeoff" | "refund_only";

export interface ReturnRequestItemInput {
  orderItemId: string;
  quantity: string;
  resolution?: ReturnRequestItemResolution;
}

export interface CreateReturnRequestInput {
  orderId: string;
  reason: string;
  requestedRefundAmount?: string;
  items: ReturnRequestItemInput[];
}

export interface ReturnRequestCommandContext {
  idempotencyKey: string;
  requestId?: string;
  correlationId?: string;
}

export interface ReturnRequestItemModel {
  id: string;
  orderItemId: string;
  qty: string;
  resolution: ReturnRequestItemResolution;
}

export interface ReturnRequestDetailModel {
  id: string;
  orderId: string;
  status: "created" | "confirmed" | "processed" | "closed";
  reason: string;
  requestedRefundAmount: string | null;
  approvedRefundAmount: string | null;
  realizationAnchorAt: string | null;
  confirmedAt: string | null;
  requiresCeoApproval: boolean;
  ceoApprovedBy: string | null;
  ceoApprovedAt: string | null;
  processedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  items: ReturnRequestItemModel[];
}

interface AcquiredIdempotencyRecord {
  recordId: string;
  replayed: boolean;
  responseBody: Prisma.JsonValue | null;
}

const create_return_request_idempotency_scope = "orders.return_request.create.v1";
const confirm_return_request_idempotency_scope = "orders.return_request.confirm.v1";
const process_return_request_idempotency_scope = "orders.return_request.process.v1";
const close_return_request_idempotency_scope = "orders.return_request.close.v1";
const ceo_approval_threshold_days = 14;

@Injectable()
export class ReturnRequestsService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async createReturnRequest(
    payload: CreateReturnRequestInput,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    context: ReturnRequestCommandContext
  ): Promise<ReturnRequestDetailModel> {
    const normalizedReason = normalize_reason(payload.reason);
    const normalizedRequestedRefundAmount = normalize_optional_amount(payload.requestedRefundAmount);
    const normalizedItems = normalize_return_request_items(payload.items);
    const requestHash = build_create_return_request_hash({
      orderId: payload.orderId,
      reason: normalizedReason,
      ...(normalizedRequestedRefundAmount
        ? { requestedRefundAmount: normalizedRequestedRefundAmount }
        : {}),
      items: normalizedItems
    });
    const idempotency = await this.acquire_idempotency(
      create_return_request_idempotency_scope,
      context.idempotencyKey,
      requestHash
    );

    if (idempotency.replayed) {
      return this.resolve_replayed_return_request(idempotency.responseBody, actor);
    }

    try {
      const returnRequestId = await this.prismaService.$transaction(async transactionClient => {
        const orderScope = resolve_order_read_scope(actor);
        const order = await transactionClient.ordersOrder.findFirst({
          where: {
            AND: [
              { id: payload.orderId },
              { isDeleted: false },
              ...(orderScope?.responsibleUserId
                ? [{ deal: { responsibleUserId: orderScope.responsibleUserId } }]
                : [])
            ]
          },
          select: { id: true }
        });

        if (!order) {
          throw new NotFoundException(`Order '${payload.orderId}' was not found`);
        }

        const orderItems = await transactionClient.ordersOrderItem.findMany({
          where: {
            orderId: order.id,
            id: {
              in: normalizedItems.map(item => item.orderItemId)
            }
          },
          select: {
            id: true,
            qty: true
          }
        });

        const orderItemById = new Map(
          orderItems.map(item => [item.id, Number(to_decimal_string(item.qty) ?? "0")])
        );

        for (const item of normalizedItems) {
          const maxQty = orderItemById.get(item.orderItemId);
          if (maxQty === undefined) {
            throw new ConflictException({
              code: "VALIDATION_ERROR",
              message: `Order item '${item.orderItemId}' is not linked to order '${order.id}'`
            });
          }

          if (Number(item.quantity) > maxQty) {
            throw new ConflictException({
              code: "VALIDATION_ERROR",
              message: `Return qty exceeds order item qty for '${item.orderItemId}'`
            });
          }
        }

        const fulfilledQtyByOrderItem = await this.resolve_completed_fulfilled_qty_by_order_item(
          transactionClient,
          order.id,
          normalizedItems.map(item => item.orderItemId)
        );
        assert_return_items_do_not_exceed_fulfilled_qty(
          normalizedItems,
          fulfilledQtyByOrderItem
        );

        const created = await transactionClient.ordersReturnRequest.create({
          data: {
            orderId: order.id,
            status: "CREATED",
            requestedByUserId: actor.userId,
            reason: normalizedReason,
            ...(normalizedRequestedRefundAmount
              ? { requestedRefundAmount: normalizedRequestedRefundAmount }
              : {})
          },
          select: {
            id: true
          }
        });

        await transactionClient.ordersReturnRequestItem.createMany({
          data: normalizedItems.map(item => ({
            returnRequestId: created.id,
            orderItemId: item.orderItemId,
            qty: item.quantity,
            resolution: item.resolution
          }))
        });

        await transactionClient.systemIdempotencyRecord.update({
          where: { id: idempotency.recordId },
          data: {
            status: to_prisma_enum<PrismaIdempotencyStatus>("completed"),
            responseStatusCode: 200,
            responseBody: { returnRequestId: created.id },
            lockedUntil: null
          }
        });

        return created.id;
      });

      return this.get_return_request_or_throw(returnRequestId, actor);
    } catch (error) {
      await this.mark_idempotency_failed(idempotency.recordId, error);
      throw error;
    }
  }

  async confirmReturnRequest(
    returnRequestId: string,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    context: ReturnRequestCommandContext
  ): Promise<ReturnRequestDetailModel> {
    const requestHash = build_simple_return_request_hash(returnRequestId);
    const idempotency = await this.acquire_idempotency(
      confirm_return_request_idempotency_scope,
      context.idempotencyKey,
      requestHash
    );

    if (idempotency.replayed) {
      return this.resolve_replayed_return_request(idempotency.responseBody, actor, returnRequestId);
    }

    try {
      const confirmedReturnRequestId = await this.prismaService.$transaction(async transactionClient => {
        const returnRequest = await this.find_return_request_for_command(
          transactionClient,
          returnRequestId,
          actor
        );

        this.assert_return_request_transition(
          from_prisma_enum(returnRequest.status),
          "confirmed"
        );

        const orderItemIds = returnRequest.items.map(item => item.orderItemId);
        const fulfilledQtyByOrderItem = await this.resolve_completed_fulfilled_qty_by_order_item(
          transactionClient,
          returnRequest.orderId,
          orderItemIds
        );
        assert_return_items_do_not_exceed_fulfilled_qty(
          returnRequest.items.map(item => ({
            orderItemId: item.orderItemId,
            quantity: item.qty
          })),
          fulfilledQtyByOrderItem
        );

        const anchorAggregate = await transactionClient.ordersFulfillment.aggregate({
          where: {
            orderId: returnRequest.orderId,
            status: "COMPLETED",
            fulfilledAt: { not: null },
            items: {
              some: {
                orderItemId: { in: orderItemIds }
              }
            }
          },
          _min: {
            fulfilledAt: true
          }
        });

        const realizationAnchorAt = anchorAggregate._min.fulfilledAt;
        if (!realizationAnchorAt) {
          throw new ConflictException({
            code: "SOURCE_OF_TRUTH_VIOLATION",
            message:
              "Cannot calculate realizationAnchorAt from fulfillment execution facts for returned items"
          });
        }

        const confirmedAt = new Date();
        const requiresCeoApproval =
          confirmedAt.getTime() - realizationAnchorAt.getTime() >
          ceo_approval_threshold_days * 24 * 60 * 60 * 1000;
        const isCeoActor = actor.roleCodes.includes("ceo");

        if (requiresCeoApproval && !isCeoActor) {
          throw new ForbiddenException({
            code: "ACCESS_DENIED",
            message:
              "ReturnRequest.confirmed requires ceo approval when more than 14 days passed after realization"
          });
        }

        await transactionClient.ordersReturnRequest.update({
          where: { id: returnRequest.id },
          data: {
            status: to_prisma_enum<PrismaReturnRequestStatus>("confirmed"),
            realizationAnchorAt,
            confirmedAt,
            requiresCeoApproval,
            ceoApprovedBy: requiresCeoApproval ? actor.userId : null,
            ceoApprovedAt: requiresCeoApproval ? confirmedAt : null
          }
        });

        await transactionClient.auditLogRecord.create({
          data: {
            eventId: build_return_request_audit_event_id(
              "confirm",
              returnRequest.id,
              context.idempotencyKey
            ),
            occurredAt: confirmedAt,
            action: "orders.return_request.confirm",
            entityType: "orders.return_request",
            entityId: returnRequest.id,
            actorUserId: actor.userId,
            ...(context.requestId ? { requestId: context.requestId } : {}),
            ...(context.correlationId ? { correlationId: context.correlationId } : {}),
            payload: {
              orderId: returnRequest.orderId,
              realizationAnchorAt: realizationAnchorAt.toISOString(),
              requiresCeoApproval
            }
          }
        });

        await transactionClient.systemIdempotencyRecord.update({
          where: { id: idempotency.recordId },
          data: {
            status: to_prisma_enum<PrismaIdempotencyStatus>("completed"),
            responseStatusCode: 200,
            responseBody: { returnRequestId: returnRequest.id },
            lockedUntil: null
          }
        });

        return returnRequest.id;
      });

      return this.get_return_request_or_throw(confirmedReturnRequestId, actor);
    } catch (error) {
      await this.mark_idempotency_failed(idempotency.recordId, error);
      throw error;
    }
  }

  async processReturnRequest(
    returnRequestId: string,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    context: ReturnRequestCommandContext
  ): Promise<ReturnRequestDetailModel> {
    const requestHash = build_simple_return_request_hash(returnRequestId);
    const idempotency = await this.acquire_idempotency(
      process_return_request_idempotency_scope,
      context.idempotencyKey,
      requestHash
    );

    if (idempotency.replayed) {
      return this.resolve_replayed_return_request(idempotency.responseBody, actor, returnRequestId);
    }

    try {
      const processedReturnRequestId = await this.prismaService.$transaction(async transactionClient => {
        const returnRequest = await this.find_return_request_for_command(
          transactionClient,
          returnRequestId,
          actor
        );

        this.assert_return_request_transition(
          from_prisma_enum(returnRequest.status),
          "processed"
        );

        const processedAt = new Date();
        let inventoryMovementCount = 0;
        for (const item of returnRequest.items) {
          if (item.resolution === "refund_only") {
            continue;
          }

          const warehouseId = await this.resolve_warehouse_for_return_item(
            transactionClient,
            returnRequest.orderId,
            item.orderItem.productId
          );

          await transactionClient.inventoryInventoryMovement.create({
            data: {
              movementType: to_prisma_enum<PrismaInventoryMovementType>("transfer_to_quarantine"),
              productId: item.orderItem.productId,
              warehouseId,
              qty: item.qty,
              bucketFrom: null,
              bucketTo: to_prisma_enum<PrismaInventoryBucket>("quarantine"),
              orderId: returnRequest.orderId,
              returnRequestId: returnRequest.id,
              reason: "return_request.processed_to_quarantine",
              performedBy: actor.userId
            }
          });
          inventoryMovementCount += 1;
        }

        await transactionClient.ordersReturnRequest.update({
          where: { id: returnRequest.id },
          data: {
            status: to_prisma_enum<PrismaReturnRequestStatus>("processed"),
            processedAt
          }
        });

        await transactionClient.auditLogRecord.create({
          data: {
            eventId: build_return_request_audit_event_id(
              "process",
              returnRequest.id,
              context.idempotencyKey
            ),
            occurredAt: processedAt,
            action: "orders.return_request.process",
            entityType: "orders.return_request",
            entityId: returnRequest.id,
            actorUserId: actor.userId,
            ...(context.requestId ? { requestId: context.requestId } : {}),
            ...(context.correlationId ? { correlationId: context.correlationId } : {}),
            payload: {
              orderId: returnRequest.orderId,
              inventoryMovementCount,
              quarantineDefaultPath: true
            }
          }
        });

        await transactionClient.systemIdempotencyRecord.update({
          where: { id: idempotency.recordId },
          data: {
            status: to_prisma_enum<PrismaIdempotencyStatus>("completed"),
            responseStatusCode: 200,
            responseBody: { returnRequestId: returnRequest.id },
            lockedUntil: null
          }
        });

        return returnRequest.id;
      });

      return this.get_return_request_or_throw(processedReturnRequestId, actor);
    } catch (error) {
      await this.mark_idempotency_failed(idempotency.recordId, error);
      throw error;
    }
  }

  async closeReturnRequest(
    returnRequestId: string,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    context: ReturnRequestCommandContext
  ): Promise<ReturnRequestDetailModel> {
    const requestHash = build_simple_return_request_hash(returnRequestId);
    const idempotency = await this.acquire_idempotency(
      close_return_request_idempotency_scope,
      context.idempotencyKey,
      requestHash
    );

    if (idempotency.replayed) {
      return this.resolve_replayed_return_request(idempotency.responseBody, actor, returnRequestId);
    }

    try {
      const closedReturnRequestId = await this.prismaService.$transaction(async transactionClient => {
        const returnRequest = await this.find_return_request_for_command(
          transactionClient,
          returnRequestId,
          actor
        );

        this.assert_return_request_transition(
          from_prisma_enum(returnRequest.status),
          "closed"
        );

        const closedAt = new Date();
        await transactionClient.ordersReturnRequest.update({
          where: { id: returnRequest.id },
          data: {
            status: to_prisma_enum<PrismaReturnRequestStatus>("closed"),
            closedAt
          }
        });

        await transactionClient.auditLogRecord.create({
          data: {
            eventId: build_return_request_audit_event_id(
              "close",
              returnRequest.id,
              context.idempotencyKey
            ),
            occurredAt: closedAt,
            action: "orders.return_request.close",
            entityType: "orders.return_request",
            entityId: returnRequest.id,
            actorUserId: actor.userId,
            ...(context.requestId ? { requestId: context.requestId } : {}),
            ...(context.correlationId ? { correlationId: context.correlationId } : {}),
            payload: {
              orderId: returnRequest.orderId
            }
          }
        });

        await transactionClient.systemIdempotencyRecord.update({
          where: { id: idempotency.recordId },
          data: {
            status: to_prisma_enum<PrismaIdempotencyStatus>("completed"),
            responseStatusCode: 200,
            responseBody: { returnRequestId: returnRequest.id },
            lockedUntil: null
          }
        });

        return returnRequest.id;
      });

      return this.get_return_request_or_throw(closedReturnRequestId, actor);
    } catch (error) {
      await this.mark_idempotency_failed(idempotency.recordId, error);
      throw error;
    }
  }

  private async get_return_request_or_throw(
    returnRequestId: string,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">
  ): Promise<ReturnRequestDetailModel> {
    const orderScope = resolve_order_read_scope(actor);
    const returnRequest = await this.prismaService.ordersReturnRequest.findFirst({
      where: {
        AND: [
          { id: returnRequestId },
          { isDeleted: false },
          ...(orderScope?.responsibleUserId
            ? [{ order: { deal: { responsibleUserId: orderScope.responsibleUserId } } }]
            : [])
        ]
      },
      include: {
        items: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!returnRequest) {
      throw new NotFoundException(`Return request '${returnRequestId}' was not found`);
    }

    return map_return_request_detail_model(returnRequest);
  }

  private async find_return_request_for_command(
    transactionClient: Prisma.TransactionClient,
    returnRequestId: string,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">
  ) {
    const orderScope = resolve_order_read_scope(actor);
    const returnRequest = await transactionClient.ordersReturnRequest.findFirst({
      where: {
        AND: [
          { id: returnRequestId },
          { isDeleted: false },
          ...(orderScope?.responsibleUserId
            ? [{ order: { deal: { responsibleUserId: orderScope.responsibleUserId } } }]
            : [])
        ]
      },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
          include: {
            orderItem: {
              select: {
                id: true,
                productId: true
              }
            }
          }
        }
      }
    });

    if (!returnRequest) {
      throw new NotFoundException(`Return request '${returnRequestId}' was not found`);
    }

    return returnRequest;
  }

  private async resolve_warehouse_for_return_item(
    transactionClient: Prisma.TransactionClient,
    orderId: string,
    productId: string
  ): Promise<string> {
    const reservation = await transactionClient.inventoryReservation.findFirst({
      where: {
        orderId,
        productId,
        status: {
          in: [
            to_prisma_enum<PrismaReservationStatus>("active"),
            to_prisma_enum<PrismaReservationStatus>("consumed"),
            to_prisma_enum<PrismaReservationStatus>("released")
          ]
        }
      },
      orderBy: {
        createdAt: "asc"
      },
      select: {
        warehouseId: true
      }
    });

    if (reservation?.warehouseId) {
      return reservation.warehouseId;
    }

    const issueMovement = await transactionClient.inventoryInventoryMovement.findFirst({
      where: {
        orderId,
        productId,
        movementType: to_prisma_enum<PrismaInventoryMovementType>("issue")
      },
      orderBy: {
        createdAt: "desc"
      },
      select: {
        warehouseId: true
      }
    });

    if (issueMovement?.warehouseId) {
      return issueMovement.warehouseId;
    }

    throw new ConflictException({
      code: "SOURCE_OF_TRUTH_VIOLATION",
      message:
        `Cannot resolve warehouse for return item (order='${orderId}', product='${productId}')`
    });
  }

  private async resolve_completed_fulfilled_qty_by_order_item(
    transactionClient: Prisma.TransactionClient,
    orderId: string,
    orderItemIds: string[]
  ): Promise<Map<string, number>> {
    if (orderItemIds.length === 0) {
      return new Map();
    }

    const fulfilledItems = await transactionClient.ordersFulfillmentItem.findMany({
      where: {
        orderItemId: { in: orderItemIds },
        fulfillment: {
          orderId,
          status: to_prisma_enum<PrismaFulfillmentStatus>("completed"),
          fulfilledAt: { not: null }
        }
      },
      select: {
        orderItemId: true,
        qty: true
      }
    });

    const qtyByOrderItem = new Map<string, number>();
    for (const item of fulfilledItems) {
      qtyByOrderItem.set(
        item.orderItemId,
        (qtyByOrderItem.get(item.orderItemId) ?? 0) +
          decimal_to_number(item.qty)
      );
    }

    return qtyByOrderItem;
  }

  private assert_return_request_transition(
    from: string,
    to: "confirmed" | "processed" | "closed"
  ): void {
    try {
      assert_return_request_status_transition(from as "created" | "confirmed" | "processed" | "closed", to);
    } catch (error) {
      throw new ConflictException({
        code: "TRANSITION_NOT_ALLOWED",
        message:
          error instanceof Error
            ? error.message
            : `Return request transition '${from}' -> '${to}' is not allowed`
      });
    }
  }

  private async resolve_replayed_return_request(
    responseBody: Prisma.JsonValue | null,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    fallbackReturnRequestId?: string
  ): Promise<ReturnRequestDetailModel> {
    const returnRequestId =
      resolve_return_request_id_from_response_body(responseBody) ?? fallbackReturnRequestId;
    if (!returnRequestId) {
      throw new ConflictException({
        code: "SOURCE_OF_TRUTH_VIOLATION",
        message: "Idempotency record does not contain return request reference"
      });
    }

    return this.get_return_request_or_throw(returnRequestId, actor);
  }

  private async acquire_idempotency(
    scope: string,
    idempotencyKey: string,
    requestHash: string,
    canRetryOnConflict = true
  ): Promise<AcquiredIdempotencyRecord> {
    const existingRecord = await this.prismaService.systemIdempotencyRecord.findUnique({
      where: {
        scope_idempotencyKey: {
          scope,
          idempotencyKey
        }
      },
      select: {
        id: true,
        requestHash: true,
        status: true,
        lockedUntil: true,
        responseBody: true
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
        return {
          recordId: existingRecord.id,
          replayed: true,
          responseBody: existingRecord.responseBody
        };
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
        select: {
          id: true
        }
      });

      return {
        recordId: restarted.id,
        replayed: false,
        responseBody: null
      };
    }

    try {
      const created = await this.prismaService.systemIdempotencyRecord.create({
        data: {
          scope,
          idempotencyKey,
          requestHash,
          status: to_prisma_enum<PrismaIdempotencyStatus>("started"),
          lockedUntil: lockUntil
        },
        select: {
          id: true
        }
      });

      return {
        recordId: created.id,
        replayed: false,
        responseBody: null
      };
    } catch (error) {
      if (canRetryOnConflict && is_unique_constraint_error(error)) {
        return this.acquire_idempotency(scope, idempotencyKey, requestHash, false);
      }
      throw error;
    }
  }

  private async mark_idempotency_failed(recordId: string, error: unknown): Promise<void> {
    await this.prismaService.systemIdempotencyRecord.update({
      where: {
        id: recordId
      },
      data: {
        status: to_prisma_enum<PrismaIdempotencyStatus>("failed"),
        responseStatusCode: resolve_error_status_code(error),
        responseBody: {
          message: error instanceof Error ? error.message : "Return request command failed"
        },
        lockedUntil: null
      }
    });
  }
}

function map_return_request_detail_model(record: {
  id: string;
  orderId: string;
  status: PrismaReturnRequestStatus;
  reason: string;
  requestedRefundAmount: Prisma.Decimal | string | number | null;
  approvedRefundAmount: Prisma.Decimal | string | number | null;
  realizationAnchorAt: Date | null;
  confirmedAt: Date | null;
  requiresCeoApproval: boolean;
  ceoApprovedBy: string | null;
  ceoApprovedAt: Date | null;
  processedAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  items: Array<{
    id: string;
    orderItemId: string;
    qty: Prisma.Decimal | string | number;
    resolution: string;
  }>;
}): ReturnRequestDetailModel {
  return {
    id: record.id,
    orderId: record.orderId,
    status: from_prisma_enum(record.status) as ReturnRequestDetailModel["status"],
    reason: record.reason,
    requestedRefundAmount: to_decimal_string(record.requestedRefundAmount),
    approvedRefundAmount: to_decimal_string(record.approvedRefundAmount),
    realizationAnchorAt: to_iso_datetime(record.realizationAnchorAt),
    confirmedAt: to_iso_datetime(record.confirmedAt),
    requiresCeoApproval: record.requiresCeoApproval,
    ceoApprovedBy: record.ceoApprovedBy,
    ceoApprovedAt: to_iso_datetime(record.ceoApprovedAt),
    processedAt: to_iso_datetime(record.processedAt),
    closedAt: to_iso_datetime(record.closedAt),
    createdAt: to_iso_datetime(record.createdAt) ?? "",
    updatedAt: to_iso_datetime(record.updatedAt) ?? "",
    version: record.version,
    items: record.items.map(item => ({
      id: item.id,
      orderItemId: item.orderItemId,
      qty: to_decimal_string(item.qty) ?? "0",
      resolution: normalize_resolution(item.resolution)
    }))
  };
}

function normalize_reason(reason: string): string {
  const normalized = reason.trim();
  if (!normalized) {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: "reason is required"
    });
  }
  return normalized;
}

function normalize_optional_amount(value: string | undefined): string | undefined {
  if (value == null) {
    return undefined;
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return undefined;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: "requestedRefundAmount must be a positive decimal with up to 2 fraction digits"
    });
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: "requestedRefundAmount must be greater than or equal to zero"
    });
  }

  return amount.toFixed(2);
}

function normalize_return_request_items(items: ReturnRequestItemInput[]): Array<{
  orderItemId: string;
  quantity: string;
  resolution: ReturnRequestItemResolution;
}> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: "items must contain at least one return position"
    });
  }

  const seenOrderItemIds = new Set<string>();
  return items.map(item => {
    const orderItemId = item.orderItemId.trim();
    if (!orderItemId) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "orderItemId is required"
      });
    }

    if (seenOrderItemIds.has(orderItemId)) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: `Duplicate orderItemId '${orderItemId}' is not allowed`
      });
    }
    seenOrderItemIds.add(orderItemId);

    const quantity = item.quantity.trim();
    if (!/^\d+(\.\d{1,3})?$/.test(quantity)) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: `quantity must be a positive decimal with up to 3 fraction digits for '${orderItemId}'`
      });
    }

    const quantityValue = Number(quantity);
    if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: `quantity must be greater than zero for '${orderItemId}'`
      });
    }

    return {
      orderItemId,
      quantity: quantityValue.toFixed(3),
      resolution: normalize_resolution(item.resolution)
    };
  });
}

function assert_return_items_do_not_exceed_fulfilled_qty(
  items: Array<{ orderItemId: string; quantity: Prisma.Decimal | string | number }>,
  fulfilledQtyByOrderItem: ReadonlyMap<string, number>
): void {
  for (const item of items) {
    const returnQty = decimal_to_number(item.quantity);
    const fulfilledQty = fulfilledQtyByOrderItem.get(item.orderItemId) ?? 0;
    if (returnQty - fulfilledQty <= 0.0005) {
      continue;
    }

    throw new ConflictException({
      code: "SOURCE_OF_TRUTH_VIOLATION",
      message:
        `Return qty exceeds completed fulfilled qty for order item '${item.orderItemId}'`
    });
  }
}

function decimal_to_number(value: Prisma.Decimal | string | number | null | undefined): number {
  const normalized = to_decimal_string(value);
  if (!normalized) {
    return 0;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalize_resolution(value: string | undefined): ReturnRequestItemResolution {
  if (!value) {
    return "return_to_quarantine";
  }

  const normalized = value.trim().toLowerCase();
  if (
    normalized === "return_to_quarantine" ||
    normalized === "writeoff" ||
    normalized === "refund_only"
  ) {
    return normalized;
  }

  throw new BadRequestException({
    code: "VALIDATION_ERROR",
    message:
      "resolution must be one of: return_to_quarantine, writeoff, refund_only"
  });
}

function build_create_return_request_hash(input: {
  orderId: string;
  reason: string;
  requestedRefundAmount?: string;
  items: Array<{ orderItemId: string; quantity: string; resolution: ReturnRequestItemResolution }>;
}): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function build_simple_return_request_hash(returnRequestId: string): string {
  return createHash("sha256").update(JSON.stringify({ returnRequestId })).digest("hex");
}

function build_return_request_audit_event_id(
  action: "confirm" | "process" | "close",
  returnRequestId: string,
  idempotencyKey: string
): string {
  const hash = createHash("sha256")
    .update(`${action}:${returnRequestId}:${idempotencyKey}`)
    .digest("hex");

  return `return_request_${action}_${hash.slice(0, 40)}`;
}

function resolve_return_request_id_from_response_body(payload: Prisma.JsonValue | null): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const returnRequestId = (payload as { returnRequestId?: unknown }).returnRequestId;
  if (typeof returnRequestId !== "string") {
    return null;
  }

  const normalized = returnRequestId.trim();
  return normalized.length > 0 ? normalized : null;
}

function resolve_error_status_code(error: unknown): number {
  if (error instanceof NotFoundException) {
    return 404;
  }

  if (error instanceof ForbiddenException) {
    return 403;
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
