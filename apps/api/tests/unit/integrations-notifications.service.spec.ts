import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { IntegrationsNotificationsService } from "../../src/modules/integrations-notifications/integrations-notifications.service";
import type { PrismaService } from "../../src/prisma/prisma.service";

const actor = {
  userId: "00000000-0000-0000-0000-000000000001",
  roleCodes: ["admin"]
} as const;

const command_context = {
  idempotencyKey: "idem_1",
  requestId: "req_1",
  correlationId: "corr_1"
} as const;

function create_prisma_mock() {
  const systemIntegrationInboxEventFindUnique = vi.fn();
  const systemIntegrationInboxEventCreate = vi.fn();
  const systemNotificationDispatchCreate = vi.fn();
  const systemOutboxRecordFindFirst = vi.fn();
  const systemOutboxRecordCreate = vi.fn();
  const auditLogRecordCreate = vi.fn();
  const systemIdempotencyRecordFindUnique = vi.fn();
  const systemIdempotencyRecordCreate = vi.fn();
  const systemIdempotencyRecordUpdate = vi.fn();

  const transactionClient = {
    systemIntegrationInboxEvent: {
      findUnique: systemIntegrationInboxEventFindUnique,
      create: systemIntegrationInboxEventCreate
    },
    systemNotificationDispatch: {
      create: systemNotificationDispatchCreate
    },
    systemOutboxRecord: {
      findFirst: systemOutboxRecordFindFirst,
      create: systemOutboxRecordCreate
    },
    auditLogRecord: {
      create: auditLogRecordCreate
    },
    systemIdempotencyRecord: {
      update: systemIdempotencyRecordUpdate
    }
  };

  const prismaService = {
    systemIntegrationInboxEvent: {
      findUnique: systemIntegrationInboxEventFindUnique,
      create: systemIntegrationInboxEventCreate
    },
    systemNotificationDispatch: {
      create: systemNotificationDispatchCreate
    },
    systemOutboxRecord: {
      findFirst: systemOutboxRecordFindFirst,
      create: systemOutboxRecordCreate
    },
    auditLogRecord: {
      create: auditLogRecordCreate
    },
    systemIdempotencyRecord: {
      findUnique: systemIdempotencyRecordFindUnique,
      create: systemIdempotencyRecordCreate,
      update: systemIdempotencyRecordUpdate
    },
    $transaction: vi.fn(async (arg: unknown) => {
      if (typeof arg === "function") {
        return (arg as (client: typeof transactionClient) => Promise<unknown>)(transactionClient);
      }

      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }

      throw new Error("Unsupported transaction call");
    })
  } as unknown as PrismaService;

  return {
    prismaService,
    systemIntegrationInboxEventFindUnique,
    systemIntegrationInboxEventCreate,
    systemNotificationDispatchCreate,
    systemOutboxRecordFindFirst,
    systemOutboxRecordCreate,
    auditLogRecordCreate,
    systemIdempotencyRecordFindUnique,
    systemIdempotencyRecordCreate,
    systemIdempotencyRecordUpdate
  };
}

function create_service_with_mocks() {
  const prisma = create_prisma_mock();
  const service = new IntegrationsNotificationsService(prisma.prismaService);

  return {
    service,
    ...prisma
  };
}

function build_inbox_record(overrides?: Partial<{ id: string; sourceSystem: string }>) {
  const now = new Date("2026-06-21T10:00:00.000Z");

  return {
    id: overrides?.id ?? "inbox_1",
    sourceSystem: overrides?.sourceSystem ?? "ats",
    externalEventId: "ats_evt_1",
    payload: { leadId: "lead_ext_1" },
    status: "RECEIVED",
    receivedAt: now,
    processedAt: null,
    rejectedReason: null,
    createdAt: now,
    updatedAt: now
  };
}

function build_dispatch_record(overrides?: Partial<{ channel: string }>) {
  const now = new Date("2026-06-21T10:00:00.000Z");

  return {
    id: "notification_1",
    channel: overrides?.channel ?? "telegram",
    eventType: "return_request.created",
    targetRef: "return_1",
    payload: { returnRequestId: "return_1", safeSummary: "Return requested" },
    status: "QUEUED",
    queuedAt: now,
    sentAt: null,
    errorMessage: null,
    createdAt: now,
    updatedAt: now
  };
}

describe("integrations + notifications service", () => {
  it("records ATS inbound event once and emits trace events", async () => {
    const {
      service,
      systemIntegrationInboxEventFindUnique,
      systemIntegrationInboxEventCreate,
      systemOutboxRecordCreate,
      auditLogRecordCreate
    } = create_service_with_mocks();

    systemIntegrationInboxEventFindUnique.mockResolvedValue(null);
    systemIntegrationInboxEventCreate.mockResolvedValue(build_inbox_record());

    const result = await service.receiveInboundIntegrationEvent(
      "ats",
      {
        externalEventId: "ats_evt_1",
        occurredAt: "2026-06-21T09:59:00.000Z",
        payload: { leadId: "lead_ext_1" }
      },
      actor,
      command_context
    );

    expect(result).toEqual(
      expect.objectContaining({
        id: "inbox_1",
        sourceSystem: "ats",
        externalEventId: "ats_evt_1",
        status: "received"
      })
    );
    expect(systemIntegrationInboxEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceSystem: "ats",
          externalEventId: "ats_evt_1",
          payload: expect.objectContaining({
            leadId: "lead_ext_1",
            occurredAt: "2026-06-21T09:59:00.000Z"
          })
        })
      })
    );
    expect(systemOutboxRecordCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "integration.ats_event_received",
          aggregateType: "system.integration_inbox_event",
          aggregateId: "inbox_1"
        })
      })
    );
    expect(auditLogRecordCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "integration.ats_event.received",
          entityType: "system.integration_inbox_event",
          entityId: "inbox_1",
          actorUserId: actor.userId
        })
      })
    );
  });

  it("suppresses duplicated inbound integration events before side effects", async () => {
    const {
      service,
      systemIntegrationInboxEventFindUnique,
      systemIntegrationInboxEventCreate,
      systemOutboxRecordCreate,
      auditLogRecordCreate
    } = create_service_with_mocks();

    systemIntegrationInboxEventFindUnique.mockResolvedValue(build_inbox_record());

    const result = await service.receiveInboundIntegrationEvent(
      "ats",
      {
        externalEventId: "ats_evt_1",
        occurredAt: "2026-06-21T09:59:00.000Z",
        payload: { leadId: "lead_ext_1" }
      },
      actor,
      command_context
    );

    expect(result.id).toBe("inbox_1");
    expect(systemIntegrationInboxEventCreate).not.toHaveBeenCalled();
    expect(systemOutboxRecordCreate).not.toHaveBeenCalled();
    expect(auditLogRecordCreate).not.toHaveBeenCalled();
  });

  it("queues Telegram dispatch only when a matching domain fact exists", async () => {
    const {
      service,
      systemNotificationDispatchCreate,
      systemOutboxRecordFindFirst,
      systemOutboxRecordCreate,
      auditLogRecordCreate,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate,
      systemIdempotencyRecordUpdate
    } = create_service_with_mocks();

    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_record_1" });
    systemOutboxRecordFindFirst.mockResolvedValue({
      id: "domain_outbox_1",
      eventType: "return_request.created",
      aggregateId: "return_1"
    });
    systemNotificationDispatchCreate.mockResolvedValue(build_dispatch_record());

    const result = await service.enqueueNotificationDispatch(
      "telegram",
      {
        eventType: "return_request.created",
        targetRef: "return_1",
        payload: { returnRequestId: "return_1", safeSummary: "Return requested" }
      },
      actor,
      command_context
    );

    expect(result).toEqual(
      expect.objectContaining({
        id: "notification_1",
        channel: "telegram",
        status: "queued"
      })
    );
    expect(systemNotificationDispatchCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          channel: "telegram",
          eventType: "return_request.created",
          targetRef: "return_1"
        })
      })
    );
    expect(systemOutboxRecordCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "notification.telegram_sent",
          aggregateType: "system.notification_dispatch",
          aggregateId: "notification_1",
          payload: expect.objectContaining({
            notificationId: "notification_1",
            eventType: "return_request.created",
            targetRef: "return_1",
            status: "queued",
            sentAt: null
          })
        })
      })
    );
    expect(auditLogRecordCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "notification.telegram.dispatch_queued",
          entityType: "system.notification_dispatch",
          entityId: "notification_1",
          actorUserId: actor.userId
        })
      })
    );
    expect(systemIdempotencyRecordUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "idem_record_1" },
        data: expect.objectContaining({
          responseBody: { notificationId: "notification_1" }
        })
      })
    );
  });

  it("rejects outbound notification dispatch without matching domain fact", async () => {
    const {
      service,
      systemOutboxRecordFindFirst,
      systemNotificationDispatchCreate,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate
    } = create_service_with_mocks();

    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_record_1" });
    systemOutboxRecordFindFirst.mockResolvedValue(null);

    await expect(
      service.enqueueNotificationDispatch(
        "telegram",
        {
          eventType: "ui.free_text",
          targetRef: "free_text_1",
          payload: { message: "send arbitrary text" }
        },
        actor,
        command_context
      )
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(systemNotificationDispatchCreate).not.toHaveBeenCalled();
  });
});
