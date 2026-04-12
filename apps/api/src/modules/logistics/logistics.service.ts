import { createHash } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  DeliveryTaskStatus as PrismaDeliveryTaskStatus,
  IdempotencyStatus as PrismaIdempotencyStatus
} from "@prisma/client";
import type { AuthPrincipal } from "../auth/auth.contract";
import {
  PrismaLogisticsDeliveryTaskReadRepository,
  type LogisticsDeliveryTaskReadModel
} from "../read-side/logistics/delivery-task.read.repository";
import { from_prisma_enum, to_prisma_enum } from "../read-side/shared/prisma-read.mapper";
import { assert_delivery_task_status_transition } from "../transactional/logistics/delivery-task.transition.guard";
import type { DeliveryTaskStatus } from "../transactional/shared/status.contract";
import { PrismaService } from "../../prisma/prisma.service";

export interface DeliveryTaskCommandContext {
  idempotencyKey: string;
  requestId?: string;
  correlationId?: string;
}

export interface CreateDeliveryTaskInput {
  orderId: string;
  routeDayId?: string | null;
  deliverySlotId?: string | null;
  driverId?: string | null;
  vehicleId?: string | null;
  sequenceNo?: number | null;
  plannedDate?: string | null;
  addressText?: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
}

export interface AssignDeliveryTaskInput {
  routeDayId?: string | null;
  deliverySlotId?: string | null;
  driverId?: string | null;
  vehicleId?: string | null;
  sequenceNo?: number | null;
  plannedDate?: string | null;
}

export interface DeliverDeliveryTaskInput {
  deliveredAt?: string | null;
}

export interface FailDeliveryTaskInput {
  failureReason: string;
}

export interface RescheduleDeliveryTaskInput {
  routeDayId?: string | null;
  deliverySlotId?: string | null;
  driverId?: string | null;
  vehicleId?: string | null;
  sequenceNo?: number | null;
  plannedDate?: string | null;
}

interface AcquiredIdempotencyRecord {
  recordId: string;
  replayed: boolean;
  responseBody: Prisma.JsonValue | null;
}

const create_delivery_task_idempotency_scope = "logistics.delivery_task.create.v1";
const assign_delivery_task_idempotency_scope = "logistics.delivery_task.assign.v1";
const start_transit_delivery_task_idempotency_scope = "logistics.delivery_task.start_transit.v1";
const deliver_delivery_task_idempotency_scope = "logistics.delivery_task.deliver.v1";
const fail_delivery_task_idempotency_scope = "logistics.delivery_task.fail.v1";
const reschedule_delivery_task_idempotency_scope = "logistics.delivery_task.reschedule.v1";

@Injectable()
export class LogisticsService {
  constructor(
    @Inject(PrismaService)
    private readonly prismaService: PrismaService,
    @Inject(PrismaLogisticsDeliveryTaskReadRepository)
    private readonly deliveryTaskReadRepository: PrismaLogisticsDeliveryTaskReadRepository
  ) {}

  async createDeliveryTask(
    payload: CreateDeliveryTaskInput,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    context: DeliveryTaskCommandContext
  ): Promise<LogisticsDeliveryTaskReadModel> {
    const normalized = normalize_create_payload(payload);
    const requestHash = build_command_request_hash(normalized);
    const idempotency = await this.acquire_idempotency(
      create_delivery_task_idempotency_scope,
      context.idempotencyKey,
      requestHash
    );

    if (idempotency.replayed) {
      return this.resolve_replayed_delivery_task(idempotency.responseBody);
    }

    try {
      const taskId = await this.prismaService.$transaction(async transactionClient => {
        const order = await transactionClient.ordersOrder.findFirst({
          where: {
            id: normalized.orderId,
            isDeleted: false
          },
          select: {
            id: true
          }
        });

        if (!order) {
          throw new NotFoundException(`Order '${normalized.orderId}' was not found`);
        }

        const created = await transactionClient.logisticsDeliveryTask.create({
          data: {
            orderId: normalized.orderId,
            routeDayId: normalized.routeDayId,
            deliverySlotId: normalized.deliverySlotId,
            driverId: normalized.driverId,
            vehicleId: normalized.vehicleId,
            status: to_prisma_enum<PrismaDeliveryTaskStatus>("planned"),
            sequenceNo: normalized.sequenceNo,
            plannedDate: normalized.plannedDate,
            deliveredAt: null,
            failureReason: null,
            addressText: normalized.addressText,
            recipientName: normalized.recipientName,
            recipientPhone: normalized.recipientPhone,
            createdBy: actor.userId
          },
          select: {
            id: true
          }
        });

        await transactionClient.systemIdempotencyRecord.update({
          where: {
            id: idempotency.recordId
          },
          data: {
            status: to_prisma_enum<PrismaIdempotencyStatus>("completed"),
            responseStatusCode: 200,
            responseBody: { taskId: created.id },
            lockedUntil: null
          }
        });

        return created.id;
      });

      return this.get_delivery_task_or_throw(taskId);
    } catch (error) {
      await this.mark_idempotency_failed(idempotency.recordId, error);
      throw error;
    }
  }

  async assignDeliveryTask(
    taskId: string,
    payload: AssignDeliveryTaskInput,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    context: DeliveryTaskCommandContext
  ): Promise<LogisticsDeliveryTaskReadModel> {
    const normalized = normalize_assign_payload(payload);
    const requestHash = build_command_request_hash({
      taskId,
      ...normalized
    });
    const idempotency = await this.acquire_idempotency(
      assign_delivery_task_idempotency_scope,
      context.idempotencyKey,
      requestHash
    );

    if (idempotency.replayed) {
      return this.resolve_replayed_delivery_task(idempotency.responseBody, taskId);
    }

    try {
      const updatedTaskId = await this.prismaService.$transaction(async transactionClient => {
        const task = await transactionClient.logisticsDeliveryTask.findUnique({
          where: {
            id: taskId
          },
          select: {
            id: true,
            status: true
          }
        });

        if (!task) {
          throw new NotFoundException(`Delivery task '${taskId}' was not found`);
        }

        this.assert_transition(task.status, "assigned");

        await transactionClient.logisticsDeliveryTask.update({
          where: {
            id: task.id
          },
          data: {
            status: to_prisma_enum<PrismaDeliveryTaskStatus>("assigned"),
            ...(normalized.routeDayId !== undefined ? { routeDayId: normalized.routeDayId } : {}),
            ...(normalized.deliverySlotId !== undefined
              ? { deliverySlotId: normalized.deliverySlotId }
              : {}),
            ...(normalized.driverId !== undefined ? { driverId: normalized.driverId } : {}),
            ...(normalized.vehicleId !== undefined ? { vehicleId: normalized.vehicleId } : {}),
            ...(normalized.sequenceNo !== undefined ? { sequenceNo: normalized.sequenceNo } : {}),
            ...(normalized.plannedDate !== undefined ? { plannedDate: normalized.plannedDate } : {})
          }
        });

        await transactionClient.systemIdempotencyRecord.update({
          where: { id: idempotency.recordId },
          data: {
            status: to_prisma_enum<PrismaIdempotencyStatus>("completed"),
            responseStatusCode: 200,
            responseBody: { taskId: task.id },
            lockedUntil: null
          }
        });

        return task.id;
      });

      void actor;
      return this.get_delivery_task_or_throw(updatedTaskId);
    } catch (error) {
      await this.mark_idempotency_failed(idempotency.recordId, error);
      throw error;
    }
  }

  async startTransitDeliveryTask(
    taskId: string,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    context: DeliveryTaskCommandContext
  ): Promise<LogisticsDeliveryTaskReadModel> {
    const requestHash = build_command_request_hash({ taskId });
    const idempotency = await this.acquire_idempotency(
      start_transit_delivery_task_idempotency_scope,
      context.idempotencyKey,
      requestHash
    );

    if (idempotency.replayed) {
      return this.resolve_replayed_delivery_task(idempotency.responseBody, taskId);
    }

    try {
      const updatedTaskId = await this.prismaService.$transaction(async transactionClient => {
        const task = await transactionClient.logisticsDeliveryTask.findUnique({
          where: {
            id: taskId
          },
          select: {
            id: true,
            status: true
          }
        });

        if (!task) {
          throw new NotFoundException(`Delivery task '${taskId}' was not found`);
        }

        this.assert_transition(task.status, "in_transit");

        await transactionClient.logisticsDeliveryTask.update({
          where: {
            id: task.id
          },
          data: {
            status: to_prisma_enum<PrismaDeliveryTaskStatus>("in_transit")
          }
        });

        await transactionClient.systemIdempotencyRecord.update({
          where: { id: idempotency.recordId },
          data: {
            status: to_prisma_enum<PrismaIdempotencyStatus>("completed"),
            responseStatusCode: 200,
            responseBody: { taskId: task.id },
            lockedUntil: null
          }
        });

        return task.id;
      });

      void actor;
      return this.get_delivery_task_or_throw(updatedTaskId);
    } catch (error) {
      await this.mark_idempotency_failed(idempotency.recordId, error);
      throw error;
    }
  }

  async deliverDeliveryTask(
    taskId: string,
    payload: DeliverDeliveryTaskInput,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    context: DeliveryTaskCommandContext
  ): Promise<LogisticsDeliveryTaskReadModel> {
    const normalized = normalize_deliver_payload(payload);
    const requestHash = build_command_request_hash({
      taskId,
      ...normalized
    });
    const idempotency = await this.acquire_idempotency(
      deliver_delivery_task_idempotency_scope,
      context.idempotencyKey,
      requestHash
    );

    if (idempotency.replayed) {
      return this.resolve_replayed_delivery_task(idempotency.responseBody, taskId);
    }

    try {
      const updatedTaskId = await this.prismaService.$transaction(async transactionClient => {
        const task = await transactionClient.logisticsDeliveryTask.findUnique({
          where: {
            id: taskId
          },
          select: {
            id: true,
            status: true,
            deliveredAt: true
          }
        });

        if (!task) {
          throw new NotFoundException(`Delivery task '${taskId}' was not found`);
        }

        this.assert_transition(task.status, "delivered");

        await transactionClient.logisticsDeliveryTask.update({
          where: {
            id: task.id
          },
          data: {
            status: to_prisma_enum<PrismaDeliveryTaskStatus>("delivered"),
            deliveredAt: normalized.deliveredAt ?? task.deliveredAt ?? new Date(),
            failureReason: null
          }
        });

        await transactionClient.systemIdempotencyRecord.update({
          where: { id: idempotency.recordId },
          data: {
            status: to_prisma_enum<PrismaIdempotencyStatus>("completed"),
            responseStatusCode: 200,
            responseBody: { taskId: task.id },
            lockedUntil: null
          }
        });

        return task.id;
      });

      void actor;
      return this.get_delivery_task_or_throw(updatedTaskId);
    } catch (error) {
      await this.mark_idempotency_failed(idempotency.recordId, error);
      throw error;
    }
  }

  async failDeliveryTask(
    taskId: string,
    payload: FailDeliveryTaskInput,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    context: DeliveryTaskCommandContext
  ): Promise<LogisticsDeliveryTaskReadModel> {
    const normalized = normalize_fail_payload(payload);
    const requestHash = build_command_request_hash({
      taskId,
      ...normalized
    });
    const idempotency = await this.acquire_idempotency(
      fail_delivery_task_idempotency_scope,
      context.idempotencyKey,
      requestHash
    );

    if (idempotency.replayed) {
      return this.resolve_replayed_delivery_task(idempotency.responseBody, taskId);
    }

    try {
      const updatedTaskId = await this.prismaService.$transaction(async transactionClient => {
        const task = await transactionClient.logisticsDeliveryTask.findUnique({
          where: {
            id: taskId
          },
          select: {
            id: true,
            status: true
          }
        });

        if (!task) {
          throw new NotFoundException(`Delivery task '${taskId}' was not found`);
        }

        this.assert_transition(task.status, "failed");

        await transactionClient.logisticsDeliveryTask.update({
          where: {
            id: task.id
          },
          data: {
            status: to_prisma_enum<PrismaDeliveryTaskStatus>("failed"),
            failureReason: normalized.failureReason,
            deliveredAt: null
          }
        });

        await transactionClient.systemIdempotencyRecord.update({
          where: { id: idempotency.recordId },
          data: {
            status: to_prisma_enum<PrismaIdempotencyStatus>("completed"),
            responseStatusCode: 200,
            responseBody: { taskId: task.id },
            lockedUntil: null
          }
        });

        return task.id;
      });

      void actor;
      return this.get_delivery_task_or_throw(updatedTaskId);
    } catch (error) {
      await this.mark_idempotency_failed(idempotency.recordId, error);
      throw error;
    }
  }

  async rescheduleDeliveryTask(
    taskId: string,
    payload: RescheduleDeliveryTaskInput,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    context: DeliveryTaskCommandContext
  ): Promise<LogisticsDeliveryTaskReadModel> {
    const normalized = normalize_reschedule_payload(payload);
    const requestHash = build_command_request_hash({
      taskId,
      ...normalized
    });
    const idempotency = await this.acquire_idempotency(
      reschedule_delivery_task_idempotency_scope,
      context.idempotencyKey,
      requestHash
    );

    if (idempotency.replayed) {
      return this.resolve_replayed_delivery_task(idempotency.responseBody, taskId);
    }

    try {
      const updatedTaskId = await this.prismaService.$transaction(async transactionClient => {
        const task = await transactionClient.logisticsDeliveryTask.findUnique({
          where: {
            id: taskId
          },
          select: {
            id: true,
            status: true
          }
        });

        if (!task) {
          throw new NotFoundException(`Delivery task '${taskId}' was not found`);
        }

        this.assert_transition(task.status, "rescheduled");

        await transactionClient.logisticsDeliveryTask.update({
          where: {
            id: task.id
          },
          data: {
            status: to_prisma_enum<PrismaDeliveryTaskStatus>("rescheduled"),
            ...(normalized.routeDayId !== undefined ? { routeDayId: normalized.routeDayId } : {}),
            ...(normalized.deliverySlotId !== undefined
              ? { deliverySlotId: normalized.deliverySlotId }
              : {}),
            ...(normalized.driverId !== undefined ? { driverId: normalized.driverId } : {}),
            ...(normalized.vehicleId !== undefined ? { vehicleId: normalized.vehicleId } : {}),
            ...(normalized.sequenceNo !== undefined ? { sequenceNo: normalized.sequenceNo } : {}),
            ...(normalized.plannedDate !== undefined ? { plannedDate: normalized.plannedDate } : {})
          }
        });

        await transactionClient.systemIdempotencyRecord.update({
          where: { id: idempotency.recordId },
          data: {
            status: to_prisma_enum<PrismaIdempotencyStatus>("completed"),
            responseStatusCode: 200,
            responseBody: { taskId: task.id },
            lockedUntil: null
          }
        });

        return task.id;
      });

      void actor;
      return this.get_delivery_task_or_throw(updatedTaskId);
    } catch (error) {
      await this.mark_idempotency_failed(idempotency.recordId, error);
      throw error;
    }
  }

  private async resolve_replayed_delivery_task(
    responseBody: Prisma.JsonValue | null,
    fallbackTaskId?: string
  ): Promise<LogisticsDeliveryTaskReadModel> {
    const taskId = resolve_task_id_from_response_body(responseBody) ?? fallbackTaskId;
    if (!taskId) {
      throw new ConflictException({
        code: "SOURCE_OF_TRUTH_VIOLATION",
        message: "Idempotency record does not contain delivery task reference"
      });
    }

    return this.get_delivery_task_or_throw(taskId);
  }

  private async get_delivery_task_or_throw(taskId: string): Promise<LogisticsDeliveryTaskReadModel> {
    const task = await this.deliveryTaskReadRepository.getById(taskId);
    if (!task) {
      throw new NotFoundException(`Delivery task '${taskId}' was not found`);
    }

    return task;
  }

  private assert_transition(from: PrismaDeliveryTaskStatus, to: DeliveryTaskStatus): void {
    try {
      assert_delivery_task_status_transition(from_prisma_enum(from) as DeliveryTaskStatus, to);
    } catch (error) {
      throw new ConflictException({
        code: "TRANSITION_NOT_ALLOWED",
        message:
          error instanceof Error
            ? error.message
            : "Delivery task status transition is not allowed"
      });
    }
  }

  private async acquire_idempotency(
    scope: string,
    idempotencyKey: string,
    requestHash: string,
    canRetryOnConflict = true
  ): Promise<AcquiredIdempotencyRecord> {
    const existingRecord = await this.prismaService.systemIdempotencyRecord.findUnique({
      where: {
        scope_idempotencyKey: {
          scope,
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

    const now = new Date();
    const lockUntil = new Date(now.getTime() + 5 * 60 * 1000);
    if (existingRecord) {
      if (existingRecord.requestHash !== requestHash) {
        throw new ConflictException({
          code: "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD",
          message: "Idempotency key is already used with a different command payload"
        });
      }

      if (existingRecord.status === "COMPLETED") {
        return {
          recordId: existingRecord.id,
          replayed: true,
          responseBody: existingRecord.responseBody
        };
      }

      if (
        existingRecord.status === "STARTED" &&
        existingRecord.lockedUntil &&
        existingRecord.lockedUntil > now
      ) {
        throw new ConflictException({
          code: "CONFLICT",
          message: "Command with this Idempotency-Key is already in progress"
        });
      }

      const restarted = await this.prismaService.systemIdempotencyRecord.update({
        where: {
          id: existingRecord.id
        },
        data: {
          status: to_prisma_enum<PrismaIdempotencyStatus>("started"),
          lockedUntil: lockUntil,
          responseStatusCode: null,
          responseBody: Prisma.DbNull
        },
        select: {
          id: true
        }
      });

      return {
        recordId: restarted.id,
        replayed: false,
        responseBody: null
      };
    }

    try {
      const created = await this.prismaService.systemIdempotencyRecord.create({
        data: {
          scope,
          idempotencyKey,
          requestHash,
          status: to_prisma_enum<PrismaIdempotencyStatus>("started"),
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
    } catch (error) {
      if (canRetryOnConflict && is_unique_constraint_error(error)) {
        return this.acquire_idempotency(scope, idempotencyKey, requestHash, false);
      }

      throw error;
    }
  }

  private async mark_idempotency_failed(recordId: string, error: unknown): Promise<void> {
    await this.prismaService.systemIdempotencyRecord.update({
      where: {
        id: recordId
      },
      data: {
        status: to_prisma_enum<PrismaIdempotencyStatus>("failed"),
        responseStatusCode: resolve_error_status_code(error),
        responseBody: {
          message: error instanceof Error ? error.message : "Delivery task command failed"
        },
        lockedUntil: null
      }
    });
  }
}

function build_command_request_hash(payload: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function normalize_create_payload(payload: CreateDeliveryTaskInput) {
  return {
    orderId: payload.orderId.trim(),
    routeDayId: normalize_nullable_uuid_value(payload.routeDayId) ?? null,
    deliverySlotId: normalize_nullable_uuid_value(payload.deliverySlotId) ?? null,
    driverId: normalize_nullable_uuid_value(payload.driverId) ?? null,
    vehicleId: normalize_nullable_uuid_value(payload.vehicleId) ?? null,
    sequenceNo: normalize_nullable_sequence_no_value(payload.sequenceNo) ?? null,
    plannedDate: normalize_nullable_date_value(payload.plannedDate) ?? null,
    addressText: normalize_nullable_text_value(payload.addressText) ?? null,
    recipientName: normalize_nullable_text_value(payload.recipientName) ?? null,
    recipientPhone: normalize_nullable_text_value(payload.recipientPhone) ?? null
  };
}

function normalize_assign_payload(payload: AssignDeliveryTaskInput) {
  return {
    routeDayId: normalize_nullable_uuid_value(payload.routeDayId),
    deliverySlotId: normalize_nullable_uuid_value(payload.deliverySlotId),
    driverId: normalize_nullable_uuid_value(payload.driverId),
    vehicleId: normalize_nullable_uuid_value(payload.vehicleId),
    sequenceNo: normalize_nullable_sequence_no_value(payload.sequenceNo),
    plannedDate: normalize_nullable_date_value(payload.plannedDate)
  };
}

function normalize_deliver_payload(payload: DeliverDeliveryTaskInput) {
  return {
    deliveredAt: normalize_nullable_datetime_value(payload.deliveredAt)
  };
}

function normalize_fail_payload(payload: FailDeliveryTaskInput) {
  const failureReason = payload.failureReason.trim();
  if (!failureReason) {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: "failureReason is required"
    });
  }

  return { failureReason };
}

function normalize_reschedule_payload(payload: RescheduleDeliveryTaskInput) {
  return {
    routeDayId: normalize_nullable_uuid_value(payload.routeDayId),
    deliverySlotId: normalize_nullable_uuid_value(payload.deliverySlotId),
    driverId: normalize_nullable_uuid_value(payload.driverId),
    vehicleId: normalize_nullable_uuid_value(payload.vehicleId),
    sequenceNo: normalize_nullable_sequence_no_value(payload.sequenceNo),
    plannedDate: normalize_nullable_date_value(payload.plannedDate)
  };
}

function normalize_nullable_uuid_value(value: string | null | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalize_nullable_text_value(value: string | null | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalize_nullable_sequence_no_value(
  value: number | null | undefined
): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return value;
}

function normalize_nullable_date_value(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: "plannedDate must be a valid ISO date"
    });
  }

  return parsed;
}

function normalize_nullable_datetime_value(
  value: string | null | undefined
): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: "deliveredAt must be a valid ISO datetime"
    });
  }

  return parsed;
}

function resolve_task_id_from_response_body(payload: Prisma.JsonValue | null): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const taskId = (payload as { taskId?: unknown }).taskId;
  if (typeof taskId !== "string") {
    return null;
  }

  const normalized = taskId.trim();
  return normalized.length > 0 ? normalized : null;
}

function resolve_error_status_code(error: unknown): number {
  if (error instanceof NotFoundException) {
    return 404;
  }

  if (error instanceof ConflictException) {
    return 409;
  }

  if (error instanceof BadRequestException) {
    return 422;
  }

  return 500;
}

function is_unique_constraint_error(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const code = (error as { code?: string }).code;
  return code === "P2002";
}

