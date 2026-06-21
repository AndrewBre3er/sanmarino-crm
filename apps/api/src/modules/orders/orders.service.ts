import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type {
  OrderPaymentControlStatus as PrismaOrderPaymentControlStatus,
  OrderStatus as PrismaOrderStatus,
  Prisma
} from "@prisma/client";
import type { AuthPrincipal } from "../auth/auth.contract";
import { PrismaService } from "../../prisma/prisma.service";
import {
  PrismaOrdersOrderReadRepository,
  type OrdersOrderDetailReadModel,
  type OrdersOrderReadScope
} from "../read-side/orders/order.read.repository";
import { from_prisma_enum, to_prisma_enum } from "../read-side/shared/prisma-read.mapper";
import type { ReadCollectionQueryInput } from "../read-side/shared/read-model.contract";
import { assert_order_control_overlay_transition } from "../transactional/orders/order-control.transition.guard";
import { assert_order_status_transition } from "../transactional/orders/order.transition.guard";
import type {
  OrderControlOverlayStatus,
  OrderStatus
} from "../transactional/shared/status.contract";
import {
  evaluate_order_shipment_progress,
  OrderShipmentProgressError
} from "./order-shipment-status.policy";

const privileged_order_read_roles = new Set([
  "admin",
  "ceo",
  "warehouse",
  "logistics",
  "finance"
] as const);

@Injectable()
export class OrdersService {
  constructor(
    @Inject(PrismaService)
    private readonly prismaService: PrismaService,
    @Inject(PrismaOrdersOrderReadRepository)
    private readonly orderReadRepository: PrismaOrdersOrderReadRepository
  ) {}

  async listOrders(
    query: ReadCollectionQueryInput,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    requestedResponsibleUserId?: string
  ) {
    const scope = resolve_order_read_scope(actor, requestedResponsibleUserId);
    return this.orderReadRepository.list(query, scope);
  }

  async getOrder(
    orderId: string,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">
  ): Promise<OrdersOrderDetailReadModel> {
    const scope = resolve_order_read_scope(actor);
    const order = await this.orderReadRepository.getById(orderId, false, scope);
    if (!order) {
      throw new NotFoundException(`Order '${orderId}' was not found`);
    }

    return order;
  }

  async transitionOrderStatus(
    orderId: string,
    targetStatus: OrderStatus,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">
  ): Promise<OrdersOrderDetailReadModel> {
    const scope = resolve_order_read_scope(actor);
    const order = await this.find_order_for_command(orderId, scope);

    const currentStatus = from_prisma_enum(order.status) as OrderStatus;
    this.assert_status_transition(currentStatus, targetStatus);

    if (targetStatus === "partially_shipped" || targetStatus === "shipped") {
      const shipment_progress = await this.read_order_shipment_progress(order.id);
      this.assert_shipment_status_requirement(targetStatus, shipment_progress);
    }

    const now = new Date();
    const controlOverlayPatch = await this.build_system_money_control_patch_for_shipment_transition(
      order.id,
      targetStatus,
      from_prisma_enum(order.paymentControlStatus) as OrderControlOverlayStatus,
      order.paymentControlDueAt,
      order.totalAmount
    );
    const statusPatch: Prisma.OrdersOrderUpdateInput = {
      status: to_prisma_enum<PrismaOrderStatus>(targetStatus),
      ...(targetStatus === "ready_for_partial_shipment" && !order.readyForPartialShipmentAt
        ? { readyForPartialShipmentAt: now }
        : {}),
      ...(targetStatus === "ready_for_shipment" && !order.readyForShipmentAt
        ? { readyForShipmentAt: now }
        : {}),
      ...(targetStatus === "partially_shipped" && !order.partiallyShippedAt
        ? { partiallyShippedAt: now }
        : {}),
      ...(targetStatus === "shipped" && !order.shippedAt
        ? { shippedAt: now }
        : {}),
      ...controlOverlayPatch
    };

    await this.prismaService.ordersOrder.update({
      where: { id: order.id },
      data: statusPatch
    });

    return this.getOrder(orderId, actor);
  }

  async transitionOrderControlOverlay(
    orderId: string,
    targetControlStatus: OrderControlOverlayStatus,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">
  ): Promise<OrdersOrderDetailReadModel> {
    const scope = resolve_order_read_scope(actor);
    const order = await this.find_order_for_command(orderId, scope);
    const currentControlStatus = from_prisma_enum(
      order.paymentControlStatus
    ) as OrderControlOverlayStatus;

    this.assert_control_overlay_transition(currentControlStatus, targetControlStatus);

    if (
      currentControlStatus === "problem" &&
      targetControlStatus === "none" &&
      !can_clear_problem_overlay(actor)
    ) {
      throw new ForbiddenException({
        code: "ACCESS_DENIED",
        message: "Only finance/ceo/admin can clear problem overlay"
      });
    }

    const overlayPatch: Prisma.OrdersOrderUpdateInput = {
      paymentControlStatus: to_prisma_enum<PrismaOrderPaymentControlStatus>(targetControlStatus),
      ...(targetControlStatus === "none"
        ? { paymentControlDueAt: null }
        : order.paymentControlDueAt
          ? {}
          : { paymentControlDueAt: new Date() })
    };

    await this.prismaService.ordersOrder.update({
      where: { id: order.id },
      data: overlayPatch
    });

    return this.getOrder(orderId, actor);
  }

  private assert_status_transition(from: OrderStatus, to: OrderStatus): void {
    try {
      assert_order_status_transition(from, to);
    } catch (error) {
      throw new ConflictException({
        code: "TRANSITION_NOT_ALLOWED",
        message: error instanceof Error ? error.message : "Order status transition is not allowed"
      });
    }
  }

  private assert_control_overlay_transition(
    from: OrderControlOverlayStatus,
    to: OrderControlOverlayStatus
  ): void {
    try {
      assert_order_control_overlay_transition(from, to);
    } catch (error) {
      throw new ConflictException({
        code: "TRANSITION_NOT_ALLOWED",
        message:
          error instanceof Error
            ? error.message
            : "Order control overlay transition is not allowed"
      });
    }
  }

  private async read_order_shipment_progress(orderId: string) {
    const [order_items, completed_fulfillment_count, pending_fulfillment_count, completed_fulfillment_items] =
      await this.prismaService.$transaction([
        this.prismaService.ordersOrderItem.findMany({
          where: { orderId },
          select: {
            id: true,
            qty: true
          }
        }),
        this.prismaService.ordersFulfillment.count({
          where: {
            orderId,
            status: "COMPLETED"
          }
        }),
        this.prismaService.ordersFulfillment.count({
          where: {
            orderId,
            status: "PENDING"
          }
        }),
        this.prismaService.ordersFulfillmentItem.findMany({
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

  private assert_shipment_status_requirement(
    targetStatus: Extract<OrderStatus, "partially_shipped" | "shipped">,
    shipmentProgress: ReturnType<typeof evaluate_order_shipment_progress>
  ): void {
    if (!shipmentProgress.hasCompletedFulfillment) {
      throw new ConflictException({
        code: "FULFILLMENT_PROGRESS_REQUIRED",
        message: "Shipment transition requires at least one completed fulfillment"
      });
    }

    if (targetStatus === "partially_shipped") {
      if (shipmentProgress.recommendedStatus === "shipped") {
        throw new ConflictException({
          code: "FULFILLMENT_PROGRESS_COMPLETE",
          message: "Order fulfillment is complete; use ship-complete command"
        });
      }

      if (shipmentProgress.recommendedStatus !== "partially_shipped") {
        throw new ConflictException({
          code: "FULFILLMENT_PROGRESS_REQUIRED",
          message: shipmentProgress.hasOrderItems
            ? "Partial shipment requires item-level completed fulfillment evidence"
            : "Partial shipment requires both completed and pending fulfillments for orders without items"
        });
      }

      return;
    }

    if (shipmentProgress.recommendedStatus !== "shipped") {
      throw new ConflictException({
        code: "FULFILLMENT_PROGRESS_INCOMPLETE",
        message: shipmentProgress.hasOrderItems
          ? "Complete shipment requires full fulfillment completion for all order items"
          : "Complete shipment requires all fulfillments to be completed"
      });
    }
  }

  private async find_order_for_command(
    orderId: string,
    scope?: OrdersOrderReadScope
  ): Promise<{
    id: string;
    status: PrismaOrderStatus;
    paymentControlStatus: PrismaOrderPaymentControlStatus;
    paymentControlDueAt: Date | null;
    totalAmount: Prisma.Decimal | number | string;
    readyForPartialShipmentAt: Date | null;
    readyForShipmentAt: Date | null;
    partiallyShippedAt: Date | null;
    shippedAt: Date | null;
  }> {
    const and_clauses: Prisma.OrdersOrderWhereInput[] = [
      { id: orderId },
      { isDeleted: false }
    ];

    if (scope?.responsibleUserId) {
      and_clauses.push({
        deal: {
          responsibleUserId: scope.responsibleUserId
        }
      });
    }

    const order = await this.prismaService.ordersOrder.findFirst({
      where: {
        AND: and_clauses
      },
      select: {
        id: true,
        status: true,
        paymentControlStatus: true,
        paymentControlDueAt: true,
        totalAmount: true,
        readyForPartialShipmentAt: true,
        readyForShipmentAt: true,
        partiallyShippedAt: true,
        shippedAt: true
      }
    });

    if (!order) {
      throw new NotFoundException(`Order '${orderId}' was not found`);
    }

    return order;
  }

  private async build_system_money_control_patch_for_shipment_transition(
    orderId: string,
    targetStatus: OrderStatus,
    currentControlStatus: OrderControlOverlayStatus,
    currentControlDueAt: Date | null,
    orderTotalAmount: Prisma.Decimal | number | string
  ): Promise<Prisma.OrdersOrderUpdateInput> {
    if (!is_shipment_status(targetStatus)) {
      return {};
    }

    const uncoveredAmount = await this.read_uncovered_amount(orderId, orderTotalAmount);
    if (uncoveredAmount <= 0) {
      return {};
    }

    if (currentControlStatus !== "none") {
      return {};
    }

    this.assert_control_overlay_transition("none", "on_control");
    return {
      paymentControlStatus: to_prisma_enum<PrismaOrderPaymentControlStatus>("on_control"),
      ...(currentControlDueAt ? {} : { paymentControlDueAt: new Date() })
    };
  }

  private async read_uncovered_amount(
    orderId: string,
    orderTotalAmount: Prisma.Decimal | number | string
  ): Promise<number> {
    const completedPayments = await this.prismaService.paymentsPayment.aggregate({
      where: {
        orderId,
        status: "COMPLETED",
        isDeleted: false
      },
      _sum: {
        amount: true,
        refundedAmount: true
      }
    });

    const grossPaid = to_money_number(completedPayments._sum.amount);
    const refunded = to_money_number(completedPayments._sum.refundedAmount);
    const netPaid = Math.max(0, grossPaid - refunded);
    const orderTotal = to_money_number(orderTotalAmount);

    return orderTotal - netPaid;
  }
}

export function resolve_order_read_scope(
  actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
  requestedResponsibleUserId?: string
): OrdersOrderReadScope | undefined {
  const isPrivileged = actor.roleCodes.some((roleCode) =>
    privileged_order_read_roles.has(
      roleCode as "admin" | "ceo" | "warehouse" | "logistics" | "finance"
    )
  );

  if (isPrivileged) {
    return requestedResponsibleUserId ? { responsibleUserId: requestedResponsibleUserId } : undefined;
  }

  if (requestedResponsibleUserId && requestedResponsibleUserId !== actor.userId) {
    throw new ForbiddenException({
      code: "ACCESS_DENIED",
      message: "Seller can filter orders only by own user id"
    });
  }

  return { responsibleUserId: actor.userId };
}

function can_clear_problem_overlay(actor: Pick<AuthPrincipal, "roleCodes">): boolean {
  return actor.roleCodes.some((roleCode) =>
    roleCode === "finance" || roleCode === "ceo" || roleCode === "admin"
  );
}

function to_quantity_number(value: number | string | { toString: () => string }): number {
  const quantity = Number(typeof value === "number" ? value : value.toString());
  return Number.isFinite(quantity) ? quantity : 0;
}

function to_money_number(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value == null) {
    return 0;
  }

  const money = Number(typeof value === "number" ? value : value.toString());
  return Number.isFinite(money) ? money : 0;
}

function is_shipment_status(status: OrderStatus): status is "partially_shipped" | "shipped" {
  return status === "partially_shipped" || status === "shipped";
}
