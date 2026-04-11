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

    if (targetStatus === "partially_shipped" || targetStatus === "shipped") {
      throw new ConflictException({
        code: "TRANSITION_DEFERRED",
        message:
          "Transitions to partially_shipped/shipped are deferred until fulfillment/logistics baseline is enabled"
      });
    }

    this.assert_status_transition(currentStatus, targetStatus);

    const now = new Date();
    const statusPatch: Prisma.OrdersOrderUpdateInput = {
      status: to_prisma_enum<PrismaOrderStatus>(targetStatus),
      ...(targetStatus === "ready_for_partial_shipment" && !order.readyForPartialShipmentAt
        ? { readyForPartialShipmentAt: now }
        : {}),
      ...(targetStatus === "ready_for_shipment" && !order.readyForShipmentAt
        ? { readyForShipmentAt: now }
        : {})
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

  private async find_order_for_command(
    orderId: string,
    scope?: OrdersOrderReadScope
  ): Promise<{
    id: string;
    status: PrismaOrderStatus;
    paymentControlStatus: PrismaOrderPaymentControlStatus;
    paymentControlDueAt: Date | null;
    readyForPartialShipmentAt: Date | null;
    readyForShipmentAt: Date | null;
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
        readyForPartialShipmentAt: true,
        readyForShipmentAt: true
      }
    });

    if (!order) {
      throw new NotFoundException(`Order '${orderId}' was not found`);
    }

    return order;
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
