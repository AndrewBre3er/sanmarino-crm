import { ForbiddenException } from "@nestjs/common";
import type { AuthPrincipal } from "../../auth/auth.contract";

export interface FinanceEntryReadScope {
  responsibleUserId?: string;
}

const privileged_finance_entry_read_roles = new Set(["admin", "ceo", "finance"] as const);

export function resolve_finance_entry_read_scope(
  actor: Pick<AuthPrincipal, "userId" | "roleCodes">
): FinanceEntryReadScope | undefined {
  const isPrivileged = actor.roleCodes.some((roleCode) =>
    privileged_finance_entry_read_roles.has(roleCode as "admin" | "ceo" | "finance")
  );

  if (isPrivileged) {
    return undefined;
  }

  if (actor.roleCodes.includes("seller")) {
    return { responsibleUserId: actor.userId };
  }

  throw new ForbiddenException({
    code: "ACCESS_DENIED",
    message: "Finance entries are available only for seller(finance-scope), finance, admin, ceo"
  });
}
