import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import {
  AdminOverrideAuditService,
  build_admin_override_audit_event_id
} from "../../src/modules/transactional/shared/admin-override.audit";
import type { PrismaService } from "../../src/prisma/prisma.service";

function create_prisma_mock() {
  const auditLogRecordCreate = vi.fn();
  const prismaService = {
    auditLogRecord: {
      create: auditLogRecordCreate
    }
  } as unknown as PrismaService;

  return {
    prismaService,
    auditLogRecordCreate
  };
}

describe("admin override audit baseline", () => {
  it("rejects override audit without a reason", async () => {
    const { prismaService } = create_prisma_mock();
    const service = new AdminOverrideAuditService(prismaService);

    await expect(
      service.recordOverride({
        actor: {
          userId: "admin_1",
          roleCodes: ["admin"]
        },
        entityType: "orders.order",
        entityId: "order_1",
        reason: "   "
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("denies override audit for non-privileged roles", async () => {
    const { prismaService } = create_prisma_mock();
    const service = new AdminOverrideAuditService(prismaService);

    await expect(
      service.recordOverride({
        actor: {
          userId: "seller_1",
          roleCodes: ["seller"]
        },
        entityType: "orders.order",
        entityId: "order_1",
        reason: "Correct stuck status after incident review"
      })
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("writes audit.override_performed with actor, entity, reason, and request context", async () => {
    const { prismaService, auditLogRecordCreate } = create_prisma_mock();
    const service = new AdminOverrideAuditService(prismaService);
    const performedAt = new Date("2026-04-30T09:00:00.000Z");
    const expectedEventId = build_admin_override_audit_event_id({
      entityType: "orders.order",
      entityId: "order_1",
      actorUserId: "admin_1",
      performedAt
    });

    await service.recordOverride({
      actor: {
        userId: "admin_1",
        roleCodes: ["admin"]
      },
      entityType: "orders.order",
      entityId: "order_1",
      reason: "Correct stuck status after incident review",
      requestId: "req_1",
      correlationId: "corr_1",
      performedAt
    });

    expect(auditLogRecordCreate).toHaveBeenCalledWith({
      data: {
        eventId: expectedEventId,
        occurredAt: performedAt,
        action: "audit.override_performed",
        entityType: "orders.order",
        entityId: "order_1",
        actorUserId: "admin_1",
        requestId: "req_1",
        correlationId: "corr_1",
        payload: {
          auditEventId: expectedEventId,
          entityType: "orders.order",
          entityId: "order_1",
          actorUserId: "admin_1",
          reason: "Correct stuck status after incident review",
          performedAt: "2026-04-30T09:00:00.000Z"
        }
      }
    });
  });
});
