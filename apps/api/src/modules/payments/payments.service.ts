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
  CashOperationType as PrismaCashOperationType,
  FinanceEntryType as PrismaFinanceEntryType,
  IdempotencyStatus as PrismaIdempotencyStatus,
  OrderPaymentControlStatus as PrismaOrderPaymentControlStatus,
  PaymentMethod as PrismaPaymentMethod,
  PaymentSourceType as PrismaPaymentSourceType,
  PaymentStatus as PrismaPaymentStatus
} from "@prisma/client";
import type { AuthPrincipal } from "../auth/auth.contract";
import {
  PrismaPaymentsPaymentReadRepository,
  type PaymentsPaymentReadModel
} from "../read-side/payments/payment.read.repository";
import { resolve_payment_read_scope } from "../read-side/payments/payment.read.scope";
import { from_prisma_enum, to_prisma_enum } from "../read-side/shared/prisma-read.mapper";
import { assert_order_control_overlay_transition } from "../transactional/orders/order-control.transition.guard";
import {
  payment_external_sources,
  type OrderControlOverlayStatus,
  type PaymentExternalSource
} from "../transactional/shared/status.contract";
import { PrismaService } from "../../prisma/prisma.service";

export interface IntakeExternalPaymentFactInput {
  orderId: string;
  amount: string;
  paymentMethod: "cash" | "bank_transfer" | "card" | "sbp" | "other";
  externalSource: string;
  externalEventId: string;
  externalReference?: string;
}

export interface RejectExternalPaymentFactInput {
  reason?: string;
}

export interface RefundPaymentInput {
  amount: string;
  returnRequestId?: string;
  reason?: string;
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

const intake_external_payment_fact_idempotency_scope = "payments.external_fact.intake.v1";
const confirm_external_payment_fact_idempotency_scope = "payments.external_fact.confirm.v1";
const reject_external_payment_fact_idempotency_scope = "payments.external_fact.reject.v1";
const refund_payment_idempotency_scope = "payments.payment.refund.v1";

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(PrismaService)
    private readonly prismaService: PrismaService,
    @Inject(PrismaPaymentsPaymentReadRepository)
    private readonly paymentReadRepository: PrismaPaymentsPaymentReadRepository
  ) {}

  async intakeExternalPaymentFact(
    payload: IntakeExternalPaymentFactInput,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    context: PaymentCommandContext
  ): Promise<PaymentsPaymentReadModel> {
    const normalizedAmount = normalize_amount(payload.amount);
    const normalizedExternalSource = normalize_external_source(payload.externalSource);
    const normalizedExternalEventId = normalize_external_event_id(payload.externalEventId);
    const normalizedExternalReference = normalize_external_reference(payload.externalReference);
    const requestHash = build_intake_external_payment_fact_request_hash({
      orderId: payload.orderId,
      amount: normalizedAmount,
      paymentMethod: payload.paymentMethod,
      externalSource: normalizedExternalSource,
      externalEventId: normalizedExternalEventId,
      externalReference: normalizedExternalReference
    });
    const idempotency = await this.acquire_idempotency(
      intake_external_payment_fact_idempotency_scope,
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

        const intakedAt = new Date();
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
            sourceType: to_prisma_enum<PrismaPaymentSourceType>("external_fact"),
            externalSource: normalizedExternalSource,
            externalEventId: normalizedExternalEventId,
            paymentMethod: to_prisma_enum<PrismaPaymentMethod>(payload.paymentMethod),
            amount: normalizedAmount,
            refundedAmount: "0.00",
            receivedAt: null,
            intakedAt,
            externalReference: normalizedExternalReference
          },
          select: {
            id: true
          }
        });

        await transactionClient.systemOutboxRecord.createMany({
          data: [
            {
              eventType: "payment.external_fact_intaked",
              aggregateType: "payments.payment",
              aggregateId: created.id,
              payload: {
                paymentId: created.id,
                orderId: payload.orderId,
                externalSource: normalizedExternalSource,
                externalEventId: normalizedExternalEventId,
                intakedAt: intakedAt.toISOString()
              } as Prisma.InputJsonValue
            }
          ]
        });

        await transactionClient.auditLogRecord.create({
          data: {
            eventId: build_payment_audit_event_id(
              "intake",
              created.id,
              context.idempotencyKey
            ),
            occurredAt: intakedAt,
            action: "payments.external_fact.intake",
            entityType: "payments.payment",
            entityId: created.id,
            actorUserId: actor.userId,
            ...(context.requestId ? { requestId: context.requestId } : {}),
            ...(context.correlationId ? { correlationId: context.correlationId } : {}),
            payload: {
              orderId: payload.orderId,
              externalSource: normalizedExternalSource,
              externalEventId: normalizedExternalEventId,
              amount: normalizedAmount
            } as Prisma.InputJsonValue
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
    return this.confirmExternalPaymentFact(paymentId, actor, context);
  }

  async confirmExternalPaymentFact(
    paymentId: string,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    context: PaymentCommandContext
  ): Promise<PaymentsPaymentReadModel> {
    const requestHash = build_confirm_external_payment_fact_request_hash(paymentId);
    const idempotency = await this.acquire_idempotency(
      confirm_external_payment_fact_idempotency_scope,
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
            orderId: true,
            status: true,
            amount: true,
            paymentMethod: true,
            externalReference: true,
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
            receivedAt,
            confirmedAt: receivedAt,
            confirmedByUser: {
              connect: {
                id: actor.userId
              }
            }
          }
        });

        const cashOperation = await transactionClient.paymentsCashOperation.create({
          data: {
            payment: {
              connect: {
                id: payment.id
              }
            },
            operationType: to_prisma_enum<PrismaCashOperationType>("cash_in"),
            amount: payment.amount,
            currency: "RUB",
            performedAt: receivedAt,
            externalReference: payment.externalReference,
            createdByUser: {
              connect: {
                id: actor.userId
              }
            }
          },
          select: {
            id: true
          }
        });

        const financeEntry = await transactionClient.financeFinanceEntry.create({
          data: {
            entryType: to_prisma_enum<PrismaFinanceEntryType>("income"),
            order: {
              connect: {
                id: payment.orderId
              }
            },
            payment: {
              connect: {
                id: payment.id
              }
            },
            cashOperation: {
              connect: {
                id: cashOperation.id
              }
            },
            amount: payment.amount,
            currency: "RUB",
            recognizedAt: receivedAt,
            description: "Income recognized from payment.completed cash-basis event",
            createdByUser: {
              connect: {
                id: actor.userId
              }
            }
          },
          select: {
            id: true
          }
        });

        await this.apply_money_control_overlay_from_payment_completion(
          transactionClient,
          payment.orderId
        );

        await transactionClient.systemOutboxRecord.createMany({
          data: [
            {
              eventType: "payment.external_fact_confirmed",
              aggregateType: "payments.payment",
              aggregateId: payment.id,
              payload: {
                paymentId: payment.id,
                orderId: payment.orderId,
                amount: payment.amount.toString(),
                confirmedAt: receivedAt.toISOString(),
                confirmedByRole: actor.roleCodes[0] ?? null
              } as Prisma.InputJsonValue
            },
            {
              eventType: "payment.completed",
              aggregateType: "payments.payment",
              aggregateId: payment.id,
              payload: {
                paymentId: payment.id,
                orderId: payment.orderId,
                amount: payment.amount.toString(),
                completedAt: receivedAt.toISOString(),
                paymentMethod: from_prisma_enum(payment.paymentMethod)
              } as Prisma.InputJsonValue
            },
            {
              eventType: "finance.revenue_recognized",
              aggregateType: "finance.finance_entry",
              aggregateId: financeEntry.id,
              payload: {
                paymentId: payment.id,
                orderId: payment.orderId,
                amount: payment.amount.toString(),
                recognizedAt: receivedAt.toISOString()
              } as Prisma.InputJsonValue
            }
          ]
        });

        await transactionClient.auditLogRecord.create({
          data: {
            eventId: build_payment_audit_event_id(
              "confirm",
              payment.id,
              context.idempotencyKey
            ),
            occurredAt: receivedAt,
            action: "payments.external_fact.confirm",
            entityType: "payments.payment",
            entityId: payment.id,
            actorUserId: actor.userId,
            ...(context.requestId ? { requestId: context.requestId } : {}),
            ...(context.correlationId ? { correlationId: context.correlationId } : {}),
            payload: {
              orderId: payment.orderId,
              amount: payment.amount.toString(),
              cashOperationId: cashOperation.id,
              financeEntryId: financeEntry.id
            } as Prisma.InputJsonValue
          }
        });

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

  async rejectExternalPaymentFact(
    paymentId: string,
    payload: RejectExternalPaymentFactInput,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    context: PaymentCommandContext
  ): Promise<PaymentsPaymentReadModel> {
    const normalizedReason = normalize_reject_reason(payload.reason);
    const requestHash = build_reject_external_payment_fact_request_hash({
      paymentId,
      reason: normalizedReason
    });
    const idempotency = await this.acquire_idempotency(
      reject_external_payment_fact_idempotency_scope,
      context.idempotencyKey,
      requestHash
    );

    if (idempotency.replayed) {
      return this.resolve_replayed_payment(idempotency.responseBody, actor, paymentId);
    }

    try {
      const rejectedPaymentId = await this.prismaService.$transaction(async transactionClient => {
        const payment = await transactionClient.paymentsPayment.findFirst({
          where: {
            id: paymentId,
            isDeleted: false
          },
          select: {
            id: true,
            orderId: true,
            status: true
          }
        });

        if (!payment) {
          throw new NotFoundException(`Payment '${paymentId}' was not found`);
        }

        const currentStatus = from_prisma_enum(payment.status);
        if (currentStatus !== "pending") {
          throw new ConflictException({
            code: "TRANSITION_NOT_ALLOWED",
            message: `Payment '${paymentId}' cannot be rejected from status '${currentStatus}'`
          });
        }

        const rejectedAt = new Date();
        await transactionClient.paymentsPayment.update({
          where: {
            id: payment.id
          },
          data: {
            status: to_prisma_enum<PrismaPaymentStatus>("rejected"),
            rejectedAt
          }
        });

        await transactionClient.systemOutboxRecord.createMany({
          data: [
            {
              eventType: "payment.external_fact_rejected",
              aggregateType: "payments.payment",
              aggregateId: payment.id,
              payload: {
                paymentId: payment.id,
                orderId: payment.orderId,
                reason: normalizedReason,
                rejectedAt: rejectedAt.toISOString(),
                toStatus: "rejected"
              } as Prisma.InputJsonValue
            }
          ]
        });

        await transactionClient.auditLogRecord.create({
          data: {
            eventId: build_payment_audit_event_id(
              "reject",
              payment.id,
              context.idempotencyKey
            ),
            occurredAt: rejectedAt,
            action: "payments.external_fact.reject",
            entityType: "payments.payment",
            entityId: payment.id,
            actorUserId: actor.userId,
            ...(context.requestId ? { requestId: context.requestId } : {}),
            ...(context.correlationId ? { correlationId: context.correlationId } : {}),
            payload: {
              orderId: payment.orderId,
              reason: normalizedReason,
              toStatus: "rejected"
            } as Prisma.InputJsonValue
          }
        });

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

      return this.get_payment_or_throw(rejectedPaymentId, actor);
    } catch (error) {
      await this.mark_idempotency_failed(idempotency.recordId, error);
      throw error;
    }
  }

  async refundPayment(
    paymentId: string,
    payload: RefundPaymentInput,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    context: PaymentCommandContext
  ): Promise<PaymentsPaymentReadModel> {
    const normalizedAmount = normalize_amount(payload.amount);
    const normalizedReturnRequestId = normalize_required_return_request_id(payload.returnRequestId);
    const normalizedReason = normalize_refund_reason(payload.reason);
    const requestHash = build_refund_payment_request_hash({
      paymentId,
      returnRequestId: normalizedReturnRequestId,
      amount: normalizedAmount,
      reason: normalizedReason
    });
    const idempotency = await this.acquire_idempotency(
      refund_payment_idempotency_scope,
      context.idempotencyKey,
      requestHash
    );

    if (idempotency.replayed) {
      return this.resolve_replayed_payment(idempotency.responseBody, actor, paymentId);
    }

    try {
      const refundedPaymentId = await this.prismaService.$transaction(async transactionClient => {
        const payment = await transactionClient.paymentsPayment.findFirst({
          where: {
            id: paymentId,
            isDeleted: false
          },
          select: {
            id: true,
            orderId: true,
            status: true,
            amount: true,
            refundedAmount: true,
            externalReference: true
          }
        });

        if (!payment) {
          throw new NotFoundException(`Payment '${paymentId}' was not found`);
        }

        const currentStatus = from_prisma_enum(payment.status);
        if (currentStatus !== "completed") {
          throw new ConflictException({
            code: "TRANSITION_NOT_ALLOWED",
            message: `Payment '${paymentId}' cannot be refunded from status '${currentStatus}'`
          });
        }

        const returnRequest = await transactionClient.ordersReturnRequest.findFirst({
          where: {
            id: normalizedReturnRequestId,
            orderId: payment.orderId,
            isDeleted: false
          },
          select: {
            id: true,
            orderId: true,
            status: true,
            requestedRefundAmount: true
          }
        });

        if (!returnRequest) {
          throw new ConflictException({
            code: "PAYMENT_REFUND_REQUIRES_RETURN_REQUEST",
            message:
              `Refund for payment '${paymentId}' requires ReturnRequest linked to the same order`
          });
        }

        const returnRequestStatus = from_prisma_enum(returnRequest.status);
        if (returnRequestStatus !== "processed") {
          throw new ConflictException({
            code: "TRANSITION_NOT_ALLOWED",
            message:
              `Refund for payment '${paymentId}' requires processed ReturnRequest '${returnRequest.id}'`
          });
        }

        const refundAmount = to_money_number(normalizedAmount);
        const paymentAmount = to_money_number(payment.amount);
        const alreadyRefundedAmount = to_money_number(payment.refundedAmount);
        const nextRefundedAmount = alreadyRefundedAmount + refundAmount;
        if (nextRefundedAmount - paymentAmount > 0.005) {
          throw new ConflictException({
            code: "SOURCE_OF_TRUTH_VIOLATION",
            message: `Refund amount exceeds remaining paid amount for payment '${paymentId}'`
          });
        }

        if (returnRequest.requestedRefundAmount != null) {
          const requestedRefundAmount = to_money_number(returnRequest.requestedRefundAmount);
          const returnRefundAggregate = await transactionClient.paymentsCashOperation.aggregate({
            where: {
              returnRequestId: returnRequest.id,
              operationType: to_prisma_enum<PrismaCashOperationType>("refund")
            },
            _sum: {
              amount: true
            }
          });
          const alreadyRefundedForReturn = to_money_number(returnRefundAggregate._sum.amount);
          if (alreadyRefundedForReturn + refundAmount - requestedRefundAmount > 0.005) {
            throw new ConflictException({
              code: "SOURCE_OF_TRUTH_VIOLATION",
              message:
                `Refund amount exceeds requested refund amount for ReturnRequest '${returnRequest.id}'`
            });
          }
        }

        const refundedAt = new Date();
        await transactionClient.paymentsPayment.update({
          where: {
            id: payment.id
          },
          data: {
            refundedAmount: format_money(nextRefundedAmount),
            status: to_prisma_enum<PrismaPaymentStatus>(
              paymentAmount - nextRefundedAmount <= 0.005 ? "refunded" : "completed"
            )
          }
        });

        const cashOperation = await transactionClient.paymentsCashOperation.create({
          data: {
            payment: {
              connect: {
                id: payment.id
              }
            },
            returnRequest: {
              connect: {
                id: returnRequest.id
              }
            },
            operationType: to_prisma_enum<PrismaCashOperationType>("refund"),
            amount: normalizedAmount,
            currency: "RUB",
            performedAt: refundedAt,
            externalReference: payment.externalReference,
            createdByUser: {
              connect: {
                id: actor.userId
              }
            }
          },
          select: {
            id: true
          }
        });

        const financeEntry = await transactionClient.financeFinanceEntry.create({
          data: {
            entryType: to_prisma_enum<PrismaFinanceEntryType>("adjustment"),
            order: {
              connect: {
                id: payment.orderId
              }
            },
            payment: {
              connect: {
                id: payment.id
              }
            },
            cashOperation: {
              connect: {
                id: cashOperation.id
              }
            },
            returnRequest: {
              connect: {
                id: returnRequest.id
              }
            },
            amount: normalizedAmount,
            currency: "RUB",
            recognizedAt: refundedAt,
            description: normalizedReason
              ? `Refund adjustment linked to ReturnRequest: ${normalizedReason}`
              : "Refund adjustment linked to ReturnRequest",
            createdByUser: {
              connect: {
                id: actor.userId
              }
            }
          },
          select: {
            id: true
          }
        });

        await transactionClient.systemOutboxRecord.createMany({
          data: [
            {
              eventType: "payment.refund_completed",
              aggregateType: "payments.payment",
              aggregateId: payment.id,
              payload: {
                paymentId: payment.id,
                returnRequestId: returnRequest.id,
                orderId: payment.orderId,
                amount: normalizedAmount,
                cashOperationId: cashOperation.id,
                financeEntryId: financeEntry.id,
                completedAt: refundedAt.toISOString()
              } as Prisma.InputJsonValue
            }
          ]
        });

        await transactionClient.auditLogRecord.create({
          data: {
            eventId: build_payment_audit_event_id(
              "refund",
              payment.id,
              context.idempotencyKey
            ),
            occurredAt: refundedAt,
            action: "payments.payment.refund",
            entityType: "payments.payment",
            entityId: payment.id,
            actorUserId: actor.userId,
            ...(context.requestId ? { requestId: context.requestId } : {}),
            ...(context.correlationId ? { correlationId: context.correlationId } : {}),
            payload: {
              orderId: payment.orderId,
              returnRequestId: returnRequest.id,
              amount: normalizedAmount,
              cashOperationId: cashOperation.id,
              financeEntryId: financeEntry.id
            } as Prisma.InputJsonValue
          }
        });

        await transactionClient.systemIdempotencyRecord.update({
          where: { id: idempotency.recordId },
          data: {
            status: to_prisma_enum<PrismaIdempotencyStatus>("completed"),
            responseStatusCode: 200,
            responseBody: {
              paymentId: payment.id,
              returnRequestId: returnRequest.id
            },
            lockedUntil: null
          }
        });

        return payment.id;
      });

      return this.get_payment_or_throw(refundedPaymentId, actor);
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

  private async apply_money_control_overlay_from_payment_completion(
    transactionClient: Prisma.TransactionClient,
    orderId: string
  ): Promise<void> {
    const order = await transactionClient.ordersOrder.findFirst({
      where: {
        id: orderId,
        isDeleted: false
      },
      select: {
        id: true,
        status: true,
        paymentControlStatus: true,
        paymentControlDueAt: true,
        totalAmount: true
      }
    });

    if (!order) {
      return;
    }

    const orderStatus = from_prisma_enum(order.status);
    if (orderStatus !== "partially_shipped" && orderStatus !== "shipped") {
      return;
    }

    const paymentSummary = await transactionClient.paymentsPayment.aggregate({
      where: {
        orderId: order.id,
        status: "COMPLETED",
        isDeleted: false
      },
      _sum: {
        amount: true,
        refundedAmount: true
      }
    });

    const grossPaid = to_money_number(paymentSummary._sum.amount);
    const refundedAmount = to_money_number(paymentSummary._sum.refundedAmount);
    const netPaid = Math.max(0, grossPaid - refundedAmount);
    const uncoveredAmount = to_money_number(order.totalAmount) - netPaid;
    const currentControlStatus = from_prisma_enum(order.paymentControlStatus) as OrderControlOverlayStatus;

    if (uncoveredAmount > 0) {
      if (currentControlStatus !== "none") {
        return;
      }

      assert_order_control_overlay_transition("none", "on_control");
      await transactionClient.ordersOrder.update({
        where: {
          id: order.id
        },
        data: {
          paymentControlStatus: to_prisma_enum<PrismaOrderPaymentControlStatus>("on_control"),
          ...(order.paymentControlDueAt ? {} : { paymentControlDueAt: new Date() })
        }
      });
      return;
    }

    if (currentControlStatus !== "on_control") {
      return;
    }

    // Step 6 baseline: clear only system money-control (`on_control`) on sufficient coverage.
    // `problem` escalation clearance remains explicit/deferred flow.
    assert_order_control_overlay_transition("on_control", "none");
    await transactionClient.ordersOrder.update({
      where: {
        id: order.id
      },
      data: {
        paymentControlStatus: to_prisma_enum<PrismaOrderPaymentControlStatus>("none"),
        paymentControlDueAt: null
      }
    });
  }
}

function build_intake_external_payment_fact_request_hash(input: {
  orderId: string;
  amount: string;
  paymentMethod: string;
  externalSource: string;
  externalEventId: string;
  externalReference: string | null;
}): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function build_confirm_external_payment_fact_request_hash(paymentId: string): string {
  return createHash("sha256").update(JSON.stringify({ paymentId })).digest("hex");
}

function build_reject_external_payment_fact_request_hash(input: {
  paymentId: string;
  reason: string | null;
}): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function build_refund_payment_request_hash(input: {
  paymentId: string;
  returnRequestId: string;
  amount: string;
  reason: string | null;
}): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
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

function normalize_external_source(value: string): PaymentExternalSource {
  const normalized = value.trim().toLowerCase();
  if (!payment_external_sources.includes(normalized as PaymentExternalSource)) {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message:
        "externalSource must be one of bank, acquiring, cash_register, manual_import, other"
    });
  }

  return normalized as PaymentExternalSource;
}

function normalize_external_event_id(value: string): string {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > 128) {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: "externalEventId must be a non-empty string up to 128 characters"
    });
  }

  return normalized;
}

function normalize_required_return_request_id(value: string | undefined): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new BadRequestException({
      code: "PAYMENT_REFUND_REQUIRES_RETURN_REQUEST",
      message: "returnRequestId is required for payment refund"
    });
  }

  return normalized;
}

function normalize_refund_reason(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalize_reject_reason(value: string | undefined): string | null {
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

function to_money_number(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value == null) {
    return 0;
  }

  const amount = Number(typeof value === "number" ? value : value.toString());
  return Number.isFinite(amount) ? amount : 0;
}

function format_money(value: number): string {
  return value.toFixed(2);
}

function build_payment_audit_event_id(
  action: "intake" | "confirm" | "reject" | "refund",
  paymentId: string,
  idempotencyKey: string
): string {
  const hash = createHash("sha256")
    .update(`${action}:${paymentId}:${idempotencyKey}`)
    .digest("hex");

  return `payment_${action}_${hash.slice(0, 40)}`;
}
