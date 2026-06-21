import { createHash, randomUUID } from "node:crypto";
import { BadRequestException, ConflictException, Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import {
  integration_inbox_sources,
  integrations_notifications_event_contract,
  notification_dispatch_channels,
  type IntegrationInboxSource,
  type IntegrationInboxStatus,
  type NotificationDispatchChannel,
  type NotificationDispatchStatus
} from "../../contracts/integrations-notifications.contract";
import type { AuthPrincipal } from "../auth/auth.contract";
import { PrismaService } from "../../prisma/prisma.service";

export interface ReceiveInboundIntegrationEventPayload {
  externalEventId: string;
  occurredAt: string;
  payload: unknown;
}

export interface EnqueueNotificationDispatchPayload {
  eventType: string;
  targetRef: string;
  payload: unknown;
}

export interface IntegrationsNotificationsCommandContext {
  idempotencyKey: string;
  requestId?: string;
  correlationId?: string;
}

export interface IntegrationInboxEventReadModel {
  id: string;
  sourceSystem: IntegrationInboxSource;
  externalEventId: string;
  payload: Prisma.JsonValue;
  status: IntegrationInboxStatus;
  receivedAt: string;
  processedAt: string | null;
  rejectedReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationDispatchReadModel {
  id: string;
  channel: NotificationDispatchChannel;
  eventType: string;
  targetRef: string;
  payload: Prisma.JsonValue;
  status: NotificationDispatchStatus;
  queuedAt: string;
  sentAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AcquiredIdempotencyRecord {
  recordId: string;
  replayed: boolean;
  responseBody: Prisma.JsonValue | null;
}

interface IdempotencyLookupRecord {
  id: string;
  requestHash: string;
  status: string;
  lockedUntil: Date | null;
  responseBody: Prisma.JsonValue | null;
}

type TransactionClient = Prisma.TransactionClient;

const notification_dispatch_idempotency_scope = "notifications.dispatch.v1";
const notification_dispatch_aggregate_type = "system.notification_dispatch";
const integration_inbox_aggregate_type = "system.integration_inbox_event";

@Injectable()
export class IntegrationsNotificationsService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async receiveInboundIntegrationEvent(
    sourceSystem: IntegrationInboxSource,
    input: ReceiveInboundIntegrationEventPayload,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    context: IntegrationsNotificationsCommandContext
  ): Promise<IntegrationInboxEventReadModel> {
    const normalizedSource = normalize_integration_source(sourceSystem);
    const externalEventId = normalize_required_text(input.externalEventId, "externalEventId", 128);
    const occurredAt = parse_iso_datetime(input.occurredAt, "occurredAt").toISOString();
    validate_idempotency_key(context.idempotencyKey);
    const payload = normalize_json_object(input.payload, "payload");

    return this.prismaService.$transaction(async transactionClient => {
      const existing = await transactionClient.systemIntegrationInboxEvent.findUnique({
        where: {
          sourceSystem_externalEventId: {
            sourceSystem: normalizedSource,
            externalEventId
          }
        }
      });

      if (existing) {
        return map_integration_inbox_event(existing);
      }

      const receivedAt = new Date();
      const created = await transactionClient.systemIntegrationInboxEvent.create({
        data: {
          sourceSystem: normalizedSource,
          externalEventId,
          payload: {
            ...payload,
            occurredAt
          },
          status: "RECEIVED",
          receivedAt
        }
      });

      const eventType =
        normalizedSource === "ats"
          ? integrations_notifications_event_contract.atsEventReceived
          : integrations_notifications_event_contract.avitoEventReceived;

      await transactionClient.systemOutboxRecord.create({
        data: {
          eventType,
          aggregateType: integration_inbox_aggregate_type,
          aggregateId: created.id,
          payload: {
            integrationEventId: created.id,
            externalEventId,
            receivedAt: receivedAt.toISOString()
          }
        }
      });

      await this.write_audit(
        transactionClient,
        `integration.${normalizedSource}_event.received`,
        integration_inbox_aggregate_type,
        created.id,
        actor.userId,
        context,
        {
          sourceSystem: normalizedSource,
          externalEventId,
          occurredAt,
          receivedAt: receivedAt.toISOString()
        }
      );

      return map_integration_inbox_event(created);
    });
  }

  async enqueueNotificationDispatch(
    channel: NotificationDispatchChannel,
    input: EnqueueNotificationDispatchPayload,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    context: IntegrationsNotificationsCommandContext
  ): Promise<NotificationDispatchReadModel> {
    const normalizedChannel = normalize_notification_channel(channel);
    const eventType = normalize_required_text(input.eventType, "eventType", 128);
    const targetRef = normalize_required_text(input.targetRef, "targetRef", 255);
    const payload = normalize_json_object(input.payload, "payload");
    const idempotencyKey = validate_idempotency_key(context.idempotencyKey);
    const requestHash = build_notification_dispatch_request_hash({
      channel: normalizedChannel,
      eventType,
      targetRef,
      payload
    });

    const idempotency = await this.acquire_idempotency(idempotencyKey, requestHash);

    if (idempotency.replayed) {
      return this.resolve_replayed_notification_dispatch(idempotency.responseBody);
    }

    try {
      const dispatch = await this.prismaService.$transaction(async transactionClient => {
        const domainFact = await transactionClient.systemOutboxRecord.findFirst({
          where: {
            eventType,
            aggregateId: targetRef,
            isDeleted: false
          },
          select: {
            id: true
          }
        });

        if (!domainFact) {
          throw new BadRequestException({
            code: "VALIDATION_ERROR",
            message: "Notification dispatch must reference an existing domain fact"
          });
        }

        const queuedAt = new Date();
        const created = await transactionClient.systemNotificationDispatch.create({
          data: {
            channel: normalizedChannel,
            eventType,
            targetRef,
            payload,
            status: "QUEUED",
            queuedAt
          }
        });
        const readModel = map_notification_dispatch(created);
        const notificationEventType = notification_event_type_for_channel(normalizedChannel);

        await transactionClient.systemOutboxRecord.create({
          data: {
            eventType: notificationEventType,
            aggregateType: notification_dispatch_aggregate_type,
            aggregateId: created.id,
            payload: {
              notificationId: created.id,
              eventType,
              targetRef,
              sentAt: null,
              status: readModel.status
            }
          }
        });

        await this.write_audit(
          transactionClient,
          `notification.${normalizedChannel}.dispatch_queued`,
          notification_dispatch_aggregate_type,
          created.id,
          actor.userId,
          context,
          {
            notificationId: created.id,
            channel: normalizedChannel,
            eventType,
            targetRef,
            status: readModel.status
          }
        );

        await transactionClient.systemIdempotencyRecord.update({
          where: { id: idempotency.recordId },
          data: {
            status: "COMPLETED",
            responseStatusCode: 200,
            responseBody: { notificationId: created.id },
            lockedUntil: null
          }
        });

        return readModel;
      });

      return dispatch;
    } catch (error) {
      await this.mark_idempotency_failed(idempotency.recordId, error);
      throw error;
    }
  }

  private async acquire_idempotency(
    idempotencyKey: string,
    requestHash: string
  ): Promise<AcquiredIdempotencyRecord> {
    const existingRecord = await this.prismaService.systemIdempotencyRecord.findUnique({
      where: {
        scope_idempotencyKey: {
          scope: notification_dispatch_idempotency_scope,
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

    if (existingRecord) {
      return resolve_existing_idempotency(existingRecord, requestHash);
    }

    const lockUntil = new Date(Date.now() + 5 * 60 * 1000);
    const created = await this.prismaService.systemIdempotencyRecord.create({
      data: {
        scope: notification_dispatch_idempotency_scope,
        idempotencyKey,
        requestHash,
        status: "STARTED",
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
  }

  private async resolve_replayed_notification_dispatch(
    responseBody: Prisma.JsonValue | null
  ): Promise<NotificationDispatchReadModel> {
    const notificationId =
      responseBody &&
      typeof responseBody === "object" &&
      !Array.isArray(responseBody) &&
      typeof responseBody.notificationId === "string"
        ? responseBody.notificationId
        : null;

    if (!notificationId) {
      throw new ConflictException("Completed idempotency record has invalid response body");
    }

    const dispatch = await this.prismaService.systemNotificationDispatch.findUnique({
      where: { id: notificationId }
    });

    if (!dispatch) {
      throw new ConflictException("Completed idempotency record references missing notification dispatch");
    }

    return map_notification_dispatch(dispatch);
  }

  private async mark_idempotency_failed(recordId: string, error: unknown): Promise<void> {
    await this.prismaService.systemIdempotencyRecord.update({
      where: { id: recordId },
      data: {
        status: "FAILED",
        responseStatusCode: error instanceof BadRequestException ? 400 : 500,
        responseBody: {
          error: error instanceof Error ? error.message : "Unknown error"
        },
        lockedUntil: null
      }
    });
  }

  private async write_audit(
    transactionClient: TransactionClient,
    action: string,
    entityType: string,
    entityId: string,
    actorUserId: string,
    context: IntegrationsNotificationsCommandContext,
    payload: Prisma.InputJsonValue
  ): Promise<void> {
    await transactionClient.auditLogRecord.create({
      data: {
        eventId: `integrations_notifications_${randomUUID()}`,
        occurredAt: new Date(),
        action,
        entityType,
        entityId,
        actorUserId,
        ...(context.requestId ? { requestId: context.requestId } : {}),
        ...(context.correlationId ? { correlationId: context.correlationId } : {}),
        payload
      }
    });
  }
}

function map_integration_inbox_event(record: {
  id: string;
  sourceSystem: string;
  externalEventId: string;
  payload: Prisma.JsonValue;
  status: string;
  receivedAt: Date;
  processedAt: Date | null;
  rejectedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}): IntegrationInboxEventReadModel {
  return {
    id: record.id,
    sourceSystem: record.sourceSystem as IntegrationInboxSource,
    externalEventId: record.externalEventId,
    payload: record.payload,
    status: from_prisma_enum(record.status) as IntegrationInboxStatus,
    receivedAt: record.receivedAt.toISOString(),
    processedAt: record.processedAt?.toISOString() ?? null,
    rejectedReason: record.rejectedReason,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

function map_notification_dispatch(record: {
  id: string;
  channel: string;
  eventType: string;
  targetRef: string;
  payload: Prisma.JsonValue;
  status: string;
  queuedAt: Date;
  sentAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}): NotificationDispatchReadModel {
  return {
    id: record.id,
    channel: record.channel as NotificationDispatchChannel,
    eventType: record.eventType,
    targetRef: record.targetRef,
    payload: record.payload,
    status: from_prisma_enum(record.status) as NotificationDispatchStatus,
    queuedAt: record.queuedAt.toISOString(),
    sentAt: record.sentAt?.toISOString() ?? null,
    errorMessage: record.errorMessage,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

function normalize_integration_source(source: string): IntegrationInboxSource {
  if ((integration_inbox_sources as readonly string[]).includes(source)) {
    return source as IntegrationInboxSource;
  }

  throw new BadRequestException({
    code: "VALIDATION_ERROR",
    message: `Unsupported integration source '${source}'`
  });
}

function normalize_notification_channel(channel: string): NotificationDispatchChannel {
  if ((notification_dispatch_channels as readonly string[]).includes(channel)) {
    return channel as NotificationDispatchChannel;
  }

  throw new BadRequestException({
    code: "VALIDATION_ERROR",
    message: `Unsupported notification channel '${channel}'`
  });
}

function normalize_required_text(value: string, field: string, maxLength: number): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: `${field} is required`
    });
  }

  if (normalized.length > maxLength) {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: `${field} must be at most ${maxLength} characters`
    });
  }

  return normalized;
}

function parse_iso_datetime(value: string, field: string): Date {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: `${field} must be an ISO datetime`
    });
  }

  return date;
}

function normalize_json_object(value: unknown, field: string): Prisma.InputJsonObject {
  if (!is_plain_object(value)) {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: `${field} must be a JSON object`
    });
  }

  return value as Prisma.InputJsonObject;
}

function validate_idempotency_key(value: string): string {
  return normalize_required_text(value, "idempotencyKey", 128);
}

function notification_event_type_for_channel(channel: NotificationDispatchChannel): string {
  if (channel === "telegram") {
    return integrations_notifications_event_contract.telegramSent;
  }

  return integrations_notifications_event_contract.maxSent;
}

function resolve_existing_idempotency(
  existingRecord: IdempotencyLookupRecord,
  requestHash: string
): AcquiredIdempotencyRecord {
  if (existingRecord.requestHash !== requestHash) {
    throw new ConflictException("Idempotency key was already used with a different request");
  }

  const status = from_prisma_enum(existingRecord.status);
  if (status === "completed") {
    return {
      recordId: existingRecord.id,
      replayed: true,
      responseBody: existingRecord.responseBody
    };
  }

  if (
    status === "started" &&
    existingRecord.lockedUntil &&
    existingRecord.lockedUntil.getTime() > Date.now()
  ) {
    throw new ConflictException("Idempotency key is already being processed");
  }

  throw new ConflictException("Idempotency key cannot be reused after a failed request");
}

function build_notification_dispatch_request_hash(input: {
  channel: NotificationDispatchChannel;
  eventType: string;
  targetRef: string;
  payload: Prisma.InputJsonObject;
}): string {
  return createHash("sha256")
    .update(stable_stringify(input))
    .digest("hex");
}

function stable_stringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stable_stringify).join(",")}]`;
  }

  if (is_plain_object(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable_stringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function is_plain_object(value: unknown): value is Record<string, Prisma.JsonValue> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function from_prisma_enum(value: string): string {
  return value.toLowerCase();
}
