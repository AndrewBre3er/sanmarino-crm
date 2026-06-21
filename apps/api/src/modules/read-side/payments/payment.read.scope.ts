import { ForbiddenException } from "@nestjs/common";
import type { AuthPrincipal } from "../../auth/auth.contract";

export interface PaymentsPaymentReadScope {
  responsibleUserId?: string;
}

const privileged_payment_read_roles = new Set([
  "admin",
  "ceo",
  "warehouse",
  "logistics",
  "finance"
] as const);

export function resolve_payment_read_scope(
  actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
  requestedResponsibleUserId?: string
): PaymentsPaymentReadScope | undefined {
  const isPrivileged = actor.roleCodes.some((roleCode) =>
    privileged_payment_read_roles.has(
      roleCode as "admin" | "ceo" | "warehouse" | "logistics" | "finance"
    )
  );

  if (isPrivileged) {
    return requestedResponsibleUserId ? { responsibleUserId: requestedResponsibleUserId } : undefined;
  }

  if (requestedResponsibleUserId && requestedResponsibleUserId !== actor.userId) {
    throw new ForbiddenException({
      code: "ACCESS_DENIED",
      message: "Seller can filter payments only by own user id"
    });
  }

  return { responsibleUserId: actor.userId };
}

