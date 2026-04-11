import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type { AuthPrincipal } from "../auth/auth.contract";
import {
  PrismaOrdersOrderReadRepository,
  type OrdersOrderDetailReadModel,
  type OrdersOrderReadScope
} from "../read-side/orders/order.read.repository";
import type { ReadCollectionQueryInput } from "../read-side/shared/read-model.contract";

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
