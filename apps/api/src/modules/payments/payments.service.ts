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
  IdempotencyStatus as PrismaIdempotencyStatus,
  PaymentMethod as PrismaPaymentMethod
} from "@prisma/client";
import type { AuthPrincipal } from "../auth/auth.contract";
import {
  PrismaPaymentsPaymentReadRepository,
  type PaymentsPaymentReadModel
} from "../read-side/payments/payment.read.repository";
import { resolve_payment_read_scope } from "../read-side/payments/payment.read.scope";
import { from_prisma_enum, to_prisma_enum } from "../read-side/shared/prisma-read.mapper";
import { PrismaService } from "../../prisma/prisma.service";

export interface CreatePaymentInput {
  orderId: string;
  amount: string;
  paymentMethod: "cash" | "bank_transfer" | "card" | "sbp" | "other";
  externalReference?: string;
}

export interface PaymentCommandContext {
  idempotencyKey: string;
  requestId?: string;
  correlationId?: string;
}

interface AcquiredIdempotencyRecord {
  recordId: string;
  replayed: boolean;
  responseBody: Prisma.JsonValue | null;
}

const create_payment_idempotency_scope = "payments.payment.create.v1";
const complete_payment_idempotency_scope = "payments.payment.complete.v1";

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(PrismaService)
    private readonly prismaService: PrismaService,
    @Inject(PrismaPaymentsPaymentReadRepository)
    private readonly paymentReadRepository: PrismaPaymentsPaymentReadRepository
  ) {}

  async createPayment(
    payload: CreatePaymentInput,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    context: PaymentCommandContext
  ): Promise<PaymentsPaymentReadModel> {
    const normalizedAmount = normalize_amount(payload.amount);
    const normalizedExternalReference = normalize_external_reference(payload.externalReference);
    const requestHash = build_create_payment_request_hash({
      orderId: payload.orderId,
      amount: normalizedAmount,
      paymentMethod: payload.paymentMethod,
      externalReference: normalizedExternalReference
    });
    const idempotency = await this.acquire_idempotency(
      create_payment_idempotency_scope,
      context.idempotencyKey,
      requestHash
    );

    if (idempotency.replayed) {
      return this.resolve_replayed_payment(idempotency.responseBody, actor);
    }

    try {
      const paymentId = await this.prismaService.$transaction(async transactionClient => {
        const order = await transactionClient.ordersOrder.findFirst({
          where: {
            id: payload.orderId,
            isDeleted: false
          },
          select: {
            id: true
          }
        });

        if (!order) {
          throw new NotFoundException(`Order '${payload.orderId}' was not found`);
        }

        const created = await transactionClient.paymentsPayment.create({
          data: {
            paymentNumber: build_payment_number(payload.orderId, context.idempotencyKey),
            order: {
              connect: {
                id: payload.orderId
              }
            },
            createdByUser: {
              connect: {
                id: actor.userId
              }
            },
            status: "PENDING",
            paymentMethod: to_prisma_enum<PrismaPaymentMethod>(payload.paymentMethod),
            amount: normalizedAmount,
            refundedAmount: "0.00",
            receivedAt: null,
            externalReference: normalizedExternalReference
          },
          select: {
            id: true
          }
        });

        await transactionClient.systemIdempotencyRecord.update({
          where: { id: idempotency.recordId },
          data: {
            status: to_prisma_enum<PrismaIdempotencyStatus>("completed"),
            responseStatusCode: 200,
            responseBody: { paymentId: created.id },
            lockedUntil: null
          }
        });

        return created.id;
      });

      return this.get_payment_or_throw(paymentId, actor);
    } catch (error) {
      await this.mark_idempotency_failed(idempotency.recordId, error);
      throw error;
    }
  }

  async completePayment(
    paymentId: string,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    context: PaymentCommandContext
  ): Promise<PaymentsPaymentReadModel> {
    const requestHash = build_complete_payment_request_hash(paymentId);
    const idempotency = await this.acquire_idempotency(
      complete_payment_idempotency_scope,
      context.idempotencyKey,
      requestHash
    );

    if (idempotency.replayed) {
      return this.resolve_replayed_payment(idempotency.responseBody, actor, paymentId);
    }

    try {
      const completedPaymentId = await this.prismaService.$transaction(async transactionClient => {
        const payment = await transactionClient.paymentsPayment.findFirst({
          where: {
            id: paymentId,
            isDeleted: false
          },
          select: {
            id: true,
            status: true,
            receivedAt: true
          }
        });

        if (!payment) {
          throw new NotFoundException(`Payment '${paymentId}' was not found`);
        }

        const currentStatus = from_prisma_enum(payment.status);
        if (currentStatus !== "pending") {
          throw new ConflictException({
            code: "TRANSITION_NOT_ALLOWED",
            message: `Payment '${paymentId}' cannot be completed from status '${currentStatus}'`
          });
        }

        const receivedAt = payment.receivedAt ?? new Date();
        await transactionClient.paymentsPayment.update({
          where: {
            id: payment.id
          },
          data: {
            status: "COMPLETED",
            receivedAt
          }
        });

        // Foundation for Step 3: keep payment completion inside one transaction so
        // cash operation + finance entry posting can be added atomically in this block.
        await transactionClient.systemIdempotencyRecord.update({
          where: { id: idempotency.recordId },
          data: {
            status: to_prisma_enum<PrismaIdempotencyStatus>("completed"),
            responseStatusCode: 200,
            responseBody: { paymentId: payment.id },
            lockedUntil: null
          }
        });

        return payment.id;
      });

      return this.get_payment_or_throw(completedPaymentId, actor);
    } catch (error) {
      await this.mark_idempotency_failed(idempotency.recordId, error);
      throw error;
    }
  }

  private async resolve_replayed_payment(
    responseBody: Prisma.JsonValue | null,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    fallbackPaymentId?: string
  ): Promise<PaymentsPaymentReadModel> {
    const paymentId = resolve_payment_id_from_response_body(responseBody) ?? fallbackPaymentId;
    if (!paymentId) {
      throw new ConflictException({
        code: "SOURCE_OF_TRUTH_VIOLATION",
        message: "Idempotency record does not contain payment reference"
      });
    }

    return this.get_payment_or_throw(paymentId, actor);
  }

  private async get_payment_or_throw(
    paymentId: string,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">
  ): Promise<PaymentsPaymentReadModel> {
    const scope = resolve_payment_read_scope(actor);
    const payment = await this.paymentReadRepository.getById(paymentId, false, scope);
    if (!payment) {
      throw new NotFoundException(`Payment '${paymentId}' was not found`);
    }
    return payment;
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
        where: { id: existingRecord.id },
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
          message: error instanceof Error ? error.message : "Payment command failed"
        },
        lockedUntil: null
      }
    });
  }
}

function build_create_payment_request_hash(input: {
  orderId: string;
  amount: string;
  paymentMethod: string;
  externalReference: string | null;
}): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function build_complete_payment_request_hash(paymentId: string): string {
  return createHash("sha256").update(JSON.stringify({ paymentId })).digest("hex");
}

function build_payment_number(orderId: string, idempotencyKey: string): string {
  const hash = createHash("sha256").update(`${orderId}:${idempotencyKey}`).digest("hex");
  return `PAY-${hash.slice(0, 20).toUpperCase()}`;
}

function normalize_amount(rawAmount: string): string {
  const normalized = rawAmount.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: "amount must be a positive decimal with up to 2 fraction digits"
    });
  }

  const amountValue = Number(normalized);
  if (!Number.isFinite(amountValue) || amountValue <= 0) {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: "amount must be greater than zero"
    });
  }

  return amountValue.toFixed(2);
}

function normalize_external_reference(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function resolve_payment_id_from_response_body(payload: Prisma.JsonValue | null): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const paymentId = (payload as { paymentId?: unknown }).paymentId;
  if (typeof paymentId !== "string") {
    return null;
  }

  const normalized = paymentId.trim();
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
