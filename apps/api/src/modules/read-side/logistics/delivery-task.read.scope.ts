import { ForbiddenException } from "@nestjs/common";
import type { AuthPrincipal } from "../../auth/auth.contract";

export interface DeliveryTaskReadScope {
  responsibleUserId?: string;
}

const privileged_delivery_task_read_roles = new Set(["admin", "ceo", "logistics"] as const);

export function resolve_delivery_task_read_scope(
  actor: Pick<AuthPrincipal, "userId" | "roleCodes">
): DeliveryTaskReadScope | undefined {
  const is_privileged = actor.roleCodes.some((role_code) =>
    privileged_delivery_task_read_roles.has(role_code as "admin" | "ceo" | "logistics")
  );

  if (is_privileged) {
    return undefined;
  }

  if (actor.roleCodes.includes("seller")) {
    return { responsibleUserId: actor.userId };
  }

  throw new ForbiddenException({
    code: "ACCESS_DENIED",
    message: "Delivery task reads are available only for seller/logistics/admin/ceo roles"
  });
}

