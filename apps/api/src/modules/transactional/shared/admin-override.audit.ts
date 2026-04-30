import { createHash } from "node:crypto";
import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { AuthPrincipal } from "../../auth/auth.contract";
import { PrismaService } from "../../../prisma/prisma.service";

const admin_override_roles = new Set<string>(["admin", "ceo"]);
const admin_override_action = "audit.override_performed";

export interface BuildAdminOverrideAuditEventIdInput {
  entityType: string;
  entityId: string;
  actorUserId: string;
  performedAt: Date;
}

export interface AdminOverrideAuditInput {
  actor: Pick<AuthPrincipal, "userId" | "roleCodes">;
  entityType: string;
  entityId: string;
  reason: string;
  requestId?: string;
  correlationId?: string;
  performedAt?: Date;
}

@Injectable()
export class AdminOverrideAuditService {
  constructor(private readonly prismaService: PrismaService) {}

  async recordOverride(input: AdminOverrideAuditInput): Promise<unknown> {
    const auditData = build_admin_override_audit_data(input);
    return this.prismaService.auditLogRecord.create({
      data: auditData
    });
  }
}

export function build_admin_override_audit_event_id(
  input: BuildAdminOverrideAuditEventIdInput
): string {
  const hash = createHash("sha256")
    .update(
      JSON.stringify({
        entityType: input.entityType,
        entityId: input.entityId,
        actorUserId: input.actorUserId,
        performedAt: input.performedAt.toISOString()
      })
    )
    .digest("hex");

  return `admin_override_${hash.slice(0, 40)}`;
}

export function build_admin_override_audit_data(
  input: AdminOverrideAuditInput
): Prisma.AuditLogRecordUncheckedCreateInput {
  assert_admin_override_role(input.actor);
  const reason = normalize_required_reason(input.reason);
  const performedAt = input.performedAt ?? new Date();
  const eventId = build_admin_override_audit_event_id({
    entityType: input.entityType,
    entityId: input.entityId,
    actorUserId: input.actor.userId,
    performedAt
  });

  return {
    eventId,
    occurredAt: performedAt,
    action: admin_override_action,
    entityType: input.entityType,
    entityId: input.entityId,
    actorUserId: input.actor.userId,
    ...(input.requestId ? { requestId: input.requestId } : {}),
    ...(input.correlationId ? { correlationId: input.correlationId } : {}),
    payload: {
      auditEventId: eventId,
      entityType: input.entityType,
      entityId: input.entityId,
      actorUserId: input.actor.userId,
      reason,
      performedAt: performedAt.toISOString()
    } as Prisma.InputJsonValue
  };
}

function assert_admin_override_role(actor: Pick<AuthPrincipal, "roleCodes">): void {
  const allowed = actor.roleCodes.some(roleCode => admin_override_roles.has(roleCode));
  if (!allowed) {
    throw new ForbiddenException({
      code: "ACCESS_DENIED",
      message: "Admin override audit is available only for admin/ceo roles"
    });
  }
}

function normalize_required_reason(reason: string): string {
  const normalized = reason.trim();
  if (!normalized) {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: "Admin override reason is required"
    });
  }

  return normalized;
}
