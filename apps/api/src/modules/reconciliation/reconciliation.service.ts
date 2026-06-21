import { createHash } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  IdempotencyStatus as PrismaIdempotencyStatus,
  ReconciliationReportStatus as PrismaReconciliationReportStatus
} from "@prisma/client";
import type { AuthPrincipal } from "../auth/auth.contract";
import { aggregate_order_delivery_status_from_tasks } from "../logistics/order-delivery-status.aggregate";
import { build_page_pagination_meta } from "../read-side/shared/read-query.dto";
import type {
  ReadCollectionQueryInput,
  ReadCollectionResult
} from "../read-side/shared/read-model.contract";
import { from_prisma_enum, to_decimal_string, to_iso_datetime, to_prisma_enum } from "../read-side/shared/prisma-read.mapper";
import { PrismaService } from "../../prisma/prisma.service";

const reconciliation_allowed_roles = new Set<string>(["finance", "admin", "ceo"]);
const run_reconciliation_idempotency_scope = "reconciliation.run.v1";
const mismatch_alert_target_roles = ["finance", "admin", "ceo"] as const;

const reconciliation_pairs = [
  "orders_payments",
  "orders_driver_money",
  "orders_inventory",
  "inventory_finance",
  "logistics_orders"
] as const;

type ReconciliationPair = (typeof reconciliation_pairs)[number];
type ReconciliationReportStatus = "running" | "completed" | "failed";

interface AcquiredIdempotencyRecord {
  recordId: string;
  replayed: boolean;
  responseBody: Prisma.JsonValue | null;
}

export interface ReconciliationCommandContext {
  idempotencyKey: string;
  requestId?: string;
  correlationId?: string;
}

export interface ReconciliationMismatch {
  pair: ReconciliationPair;
  leftEntityRef: string;
  rightEntityRef: string;
  actualDifference: Record<string, string>;
  recommendedAction: string;
}

export interface ReconciliationSummary {
  generatedAt: string;
  reportDate: string;
  pairCounts: Record<ReconciliationPair, number>;
  mismatches: ReconciliationMismatch[];
}

export interface ReconciliationReportReadModel {
  id: string;
  reportDate: string;
  status: ReconciliationReportStatus;
  issuesCount: number;
  summary: ReconciliationSummary;
  createdAt: string;
  updatedAt: string;
}

interface RunReconciliationInput {
  reportDate?: string;
}

@Injectable()
export class ReconciliationService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async listReports(
    query: ReadCollectionQueryInput,
    actor: Pick<AuthPrincipal, "roleCodes">
  ): Promise<ReadCollectionResult<ReconciliationReportReadModel>> {
    this.assert_access(actor);

    const where: Prisma.ReconciliationReportWhereInput = {};
    if (query.status && query.status.length > 0) {
      const mapped = query.status.map((value) =>
        to_prisma_enum<PrismaReconciliationReportStatus>(value)
      );

      const [first_status] = mapped;
      if (mapped.length === 1 && first_status) {
        where.status = first_status;
      } else {
        where.status = { in: mapped };
      }
    }

    const orderBy = {
      [query.sortField]: query.sortDirection
    } as Prisma.ReconciliationReportOrderByWithRelationInput;

    const [items, totalItems] = await this.prismaService.$transaction([
      this.prismaService.reconciliationReport.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      this.prismaService.reconciliationReport.count({ where })
    ]);

    return {
      items: items.map(map_reconciliation_report_read_model),
      pagination: build_page_pagination_meta(totalItems, query.page, query.pageSize),
      ...(query.contract.filters ? { appliedFilters: query.contract.filters } : {}),
      ...(query.contract.sort ? { appliedSort: query.contract.sort } : {})
    };
  }

  async getReport(
    reportId: string,
    actor: Pick<AuthPrincipal, "roleCodes">
  ): Promise<ReconciliationReportReadModel> {
    this.assert_access(actor);
    return this.get_report_or_throw(reportId);
  }

  async runReconciliation(
    input: RunReconciliationInput,
    actor: Pick<AuthPrincipal, "userId" | "roleCodes">,
    context: ReconciliationCommandContext
  ): Promise<ReconciliationReportReadModel> {
    this.assert_access(actor);
    const reportDate = normalize_report_date(input.reportDate);
    const requestHash = build_run_reconciliation_hash(reportDate);
    const idempotency = await this.acquire_idempotency(
      run_reconciliation_idempotency_scope,
      context.idempotencyKey,
      requestHash
    );

    if (idempotency.replayed) {
      const reportId = resolve_report_id_from_response_body(idempotency.responseBody);
      if (!reportId) {
        throw new ConflictException({
          code: "SOURCE_OF_TRUTH_VIOLATION",
          message: "Idempotency record does not contain reconciliation report reference"
        });
      }
      return this.get_report_or_throw(reportId);
    }

    try {
      const report = await this.prismaService.$transaction(async transactionClient => {
        const existing = await transactionClient.reconciliationReport.findUnique({
          where: { reportDate },
          select: { id: true }
        });
        if (existing) {
          throw new ConflictException({
            code: "CONFLICT",
            message: `Reconciliation report for date '${format_report_date(reportDate)}' already exists`
          });
        }

        const pairCounts = Object.fromEntries(
          reconciliation_pairs.map(pair => [pair, 0])
        ) as Record<ReconciliationPair, number>;

        const mismatches: ReconciliationMismatch[] = [];
        const ordersPaymentsMismatches =
          await this.collect_orders_payments_mismatches(transactionClient);
        pairCounts.orders_payments = ordersPaymentsMismatches.length;
        mismatches.push(...ordersPaymentsMismatches);

        const driverMoneyMismatches =
          await this.collect_orders_driver_money_mismatches(transactionClient);
        pairCounts.orders_driver_money = driverMoneyMismatches.length;
        mismatches.push(...driverMoneyMismatches);

        const ordersInventoryMismatches =
          await this.collect_orders_inventory_mismatches(transactionClient);
        pairCounts.orders_inventory = ordersInventoryMismatches.length;
        mismatches.push(...ordersInventoryMismatches);

        const inventoryFinanceMismatches =
          await this.collect_inventory_finance_mismatches(transactionClient);
        pairCounts.inventory_finance = inventoryFinanceMismatches.length;
        mismatches.push(...inventoryFinanceMismatches);

        const logisticsOrdersMismatches =
          await this.collect_logistics_orders_mismatches(transactionClient);
        pairCounts.logistics_orders = logisticsOrdersMismatches.length;
        mismatches.push(...logisticsOrdersMismatches);

        const generatedAt = new Date();
        const summary: ReconciliationSummary = {
          generatedAt: generatedAt.toISOString(),
          reportDate: format_report_date(reportDate),
          pairCounts,
          mismatches
        };

        const created = await transactionClient.reconciliationReport.create({
          data: {
            reportDate,
            status: to_prisma_enum<PrismaReconciliationReportStatus>("completed"),
            issuesCount: mismatches.length,
            summary: summary as unknown as Prisma.InputJsonValue
          }
        });

        const completedPayload = {
          reportId: created.id,
          periodStart: format_report_date(reportDate),
          periodEnd: format_report_date(reportDate),
          mismatchCount: mismatches.length,
          completedAt: generatedAt.toISOString()
        };

        const mismatchEvents = mismatches.map((mismatch, index) => ({
          eventType: "reconciliation.mismatch_detected",
          aggregateType: "reconciliation.report",
          aggregateId: created.id,
          payload: {
            reportId: created.id,
            pair: mismatch.pair,
            leftEntityRef: mismatch.leftEntityRef,
            rightEntityRef: mismatch.rightEntityRef,
            actualDifference: mismatch.actualDifference,
            recommendedAction: mismatch.recommendedAction,
            detectedAt: generatedAt.toISOString(),
            sequenceNo: index + 1
          }
        }));
        const mismatchAlertEvents = mismatches.map((mismatch, index) => ({
          eventType: "reconciliation.mismatch_alert_requested",
          aggregateType: "reconciliation.report",
          aggregateId: created.id,
          payload: build_mismatch_alert_payload(created.id, mismatch, generatedAt, index + 1)
        }));

        await transactionClient.systemOutboxRecord.createMany({
          data: [
            {
              eventType: "reconciliation.completed",
              aggregateType: "reconciliation.report",
              aggregateId: created.id,
              payload: completedPayload as Prisma.InputJsonValue
            },
            ...mismatchEvents.map(event => ({
              eventType: event.eventType,
              aggregateType: event.aggregateType,
              aggregateId: event.aggregateId,
              payload: event.payload as Prisma.InputJsonValue
            })),
            ...mismatchAlertEvents.map(event => ({
              eventType: event.eventType,
              aggregateType: event.aggregateType,
              aggregateId: event.aggregateId,
              payload: event.payload as Prisma.InputJsonValue
            }))
          ]
        });

        if (mismatchAlertEvents.length > 0) {
          await transactionClient.auditLogRecord.createMany({
            data: mismatchAlertEvents.map((event, index) => ({
              eventId: build_reconciliation_alert_audit_event_id(created.id, index + 1),
              occurredAt: generatedAt,
              action: "reconciliation.mismatch_alert_queued",
              entityType: "reconciliation.report",
              entityId: created.id,
              actorUserId: actor.userId,
              ...(context.requestId ? { requestId: context.requestId } : {}),
              ...(context.correlationId ? { correlationId: context.correlationId } : {}),
              payload: event.payload as Prisma.InputJsonValue
            }))
          });
        }

        await transactionClient.auditLogRecord.create({
          data: {
            eventId: build_reconciliation_audit_event_id(created.id, context.idempotencyKey),
            occurredAt: generatedAt,
            action: "reconciliation.run",
            entityType: "reconciliation.report",
            entityId: created.id,
            actorUserId: actor.userId,
            ...(context.requestId ? { requestId: context.requestId } : {}),
            ...(context.correlationId ? { correlationId: context.correlationId } : {}),
            payload: {
              reportDate: format_report_date(reportDate),
              mismatchCount: mismatches.length,
              pairCounts
            } as Prisma.InputJsonValue
          }
        });

        await transactionClient.systemIdempotencyRecord.update({
          where: { id: idempotency.recordId },
          data: {
            status: to_prisma_enum<PrismaIdempotencyStatus>("completed"),
            responseStatusCode: 200,
            responseBody: { reportId: created.id },
            lockedUntil: null
          }
        });

        return created;
      });

      return map_reconciliation_report_read_model(report);
    } catch (error) {
      await this.mark_idempotency_failed(idempotency.recordId, error);
      throw error;
    }
  }

  private async get_report_or_throw(reportId: string): Promise<ReconciliationReportReadModel> {
    const report = await this.prismaService.reconciliationReport.findFirst({
      where: {
        id: reportId
      }
    });
    if (!report) {
      throw new NotFoundException(`Reconciliation report '${reportId}' was not found`);
    }

    return map_reconciliation_report_read_model(report);
  }

  private assert_access(actor: Pick<AuthPrincipal, "roleCodes">): void {
    const allowed = actor.roleCodes.some(role => reconciliation_allowed_roles.has(role));
    if (!allowed) {
      throw new ForbiddenException({
        code: "ACCESS_DENIED",
        message: "Reconciliation reports are available only for finance/admin/ceo roles"
      });
    }
  }

  private async collect_orders_payments_mismatches(
    client: Prisma.TransactionClient
  ): Promise<ReconciliationMismatch[]> {
    const shippedOrders = await client.ordersOrder.findMany({
      where: {
        isDeleted: false,
        status: { in: ["PARTIALLY_SHIPPED", "SHIPPED"] }
      },
      select: {
        id: true,
        totalAmount: true
      }
    });

    const mismatches: ReconciliationMismatch[] = [];
    for (const order of shippedOrders) {
      const paymentSum = await client.paymentsPayment.aggregate({
        where: {
          orderId: order.id,
          isDeleted: false,
          status: { in: ["COMPLETED", "REFUNDED"] }
        },
        _sum: {
          amount: true,
          refundedAmount: true
        }
      });

      const orderTotal = decimal_to_number(order.totalAmount);
      const paidAmount = decimal_to_number(paymentSum._sum.amount);
      const refundedAmount = decimal_to_number(paymentSum._sum.refundedAmount);
      const netPaid = paidAmount - refundedAmount;
      const delta = orderTotal - netPaid;
      if (Math.abs(delta) < 0.01) {
        continue;
      }

      mismatches.push({
        pair: "orders_payments",
        leftEntityRef: `orders.order:${order.id}`,
        rightEntityRef: `payments.by_order:${order.id}`,
        actualDifference: {
          expectedOrderAmount: format_amount(orderTotal),
          confirmedNetPaidAmount: format_amount(netPaid),
          delta: format_amount(delta)
        },
        recommendedAction:
          delta > 0
            ? "collect_or_confirm_external_payment_fact"
            : "review_overpayment_or_refund_linkage"
      });
    }

    return mismatches;
  }

  private async collect_orders_driver_money_mismatches(
    client: Prisma.TransactionClient
  ): Promise<ReconciliationMismatch[]> {
    const ordersOnControl = await client.ordersOrder.findMany({
      where: {
        isDeleted: false,
        deliveryStatus: { in: ["PARTIALLY_DELIVERED", "DELIVERED"] },
        paymentControlStatus: { in: ["ON_CONTROL", "PROBLEM"] }
      },
      select: {
        id: true,
        paymentControlStatus: true,
        deliveryStatus: true
      }
    });

    return ordersOnControl.map(order => {
      const controlStatus = from_prisma_enum(order.paymentControlStatus);
      return {
        pair: "orders_driver_money",
        leftEntityRef: `orders.order:${order.id}`,
        rightEntityRef: `orders.payment_control:${controlStatus}`,
        actualDifference: {
          deliveryStatus: from_prisma_enum(order.deliveryStatus),
          paymentControlStatus: controlStatus
        },
        recommendedAction:
          controlStatus === "problem"
            ? "escalate_driver_money_issue_to_finance_and_ceo"
            : "confirm_driver_money_or_external_payment_fact"
      };
    });
  }

  private async collect_orders_inventory_mismatches(
    client: Prisma.TransactionClient
  ): Promise<ReconciliationMismatch[]> {
    const fulfilledOrShippedOrders = await client.ordersOrder.findMany({
      where: {
        isDeleted: false,
        status: { in: ["PARTIALLY_SHIPPED", "SHIPPED"] }
      },
      select: { id: true }
    });

    const mismatches: ReconciliationMismatch[] = [];
    for (const order of fulfilledOrShippedOrders) {
      const fulfillmentItems = await client.ordersFulfillmentItem.findMany({
        where: {
          fulfillment: {
            orderId: order.id,
            status: "COMPLETED",
            fulfilledAt: { not: null }
          }
        },
        select: {
          orderItemId: true,
          qty: true,
          orderItem: {
            select: {
              productId: true
            }
          }
        }
      });

      const expectedByProduct = new Map<string, { qty: number; orderItemIds: Set<string> }>();
      for (const item of fulfillmentItems) {
        const productId = item.orderItem.productId;
        const existing = expectedByProduct.get(productId);
        if (existing) {
          existing.qty += decimal_to_number(item.qty);
          existing.orderItemIds.add(item.orderItemId);
          continue;
        }

        expectedByProduct.set(productId, {
          qty: decimal_to_number(item.qty),
          orderItemIds: new Set([item.orderItemId])
        });
      }

      if ([...expectedByProduct.values()].every(item => item.qty <= 0)) {
        continue;
      }

      const issueMovements = await client.inventoryInventoryMovement.findMany({
        where: {
          orderId: order.id,
          movementType: "ISSUE"
        },
        select: {
          productId: true,
          qty: true
        }
      });

      const actualByProduct = new Map<string, number>();
      for (const movement of issueMovements) {
        actualByProduct.set(
          movement.productId,
          (actualByProduct.get(movement.productId) ?? 0) +
            decimal_to_number(movement.qty)
        );
      }

      const productIds = new Set([
        ...expectedByProduct.keys(),
        ...actualByProduct.keys()
      ]);
      for (const productId of productIds) {
        const expected = expectedByProduct.get(productId);
        const expectedIssueQty = expected?.qty ?? 0;
        const actualIssueQty = actualByProduct.get(productId) ?? 0;
        const delta = expectedIssueQty - actualIssueQty;
        if (Math.abs(delta) <= 0.0005) {
          continue;
        }

        const orderItemRefs = [...(expected?.orderItemIds ?? new Set<string>())].sort();
        mismatches.push({
          pair: "orders_inventory",
          leftEntityRef: `orders.order_items.by_product:${order.id}:${productId}`,
          rightEntityRef: `inventory.issues.by_product:${order.id}:${productId}`,
          actualDifference: {
            orderId: order.id,
            productId,
            orderItemRefs: orderItemRefs.join(","),
            expectedFulfilledQty: format_qty(expectedIssueQty),
            actualIssuedQty: format_qty(actualIssueQty),
            deltaQty: format_qty(delta)
          },
          recommendedAction:
            delta > 0
              ? "record_missing_inventory_issue_for_order_item_product"
              : "review_excess_inventory_issue_or_wrong_product_linkage"
        });
      }
    }

    return mismatches;
  }

  private async collect_inventory_finance_mismatches(
    client: Prisma.TransactionClient
  ): Promise<ReconciliationMismatch[]> {
    const ordersWithShipment = await client.ordersOrder.findMany({
      where: {
        isDeleted: false,
        status: { in: ["PARTIALLY_SHIPPED", "SHIPPED"] }
      },
      select: { id: true }
    });

    const mismatches: ReconciliationMismatch[] = [];
    for (const order of ordersWithShipment) {
      const inventoryCostAggregate = await client.inventoryInventoryMovement.aggregate({
        where: {
          orderId: order.id,
          movementType: "ISSUE"
        },
        _sum: {
          totalCost: true
        }
      });
      const inventoryCost = decimal_to_number(inventoryCostAggregate._sum.totalCost);
      if (inventoryCost <= 0) {
        continue;
      }

      const financeExpenseAggregate = await client.financeFinanceEntry.aggregate({
        where: {
          orderId: order.id,
          entryType: {
            in: ["EXPENSE", "ADJUSTMENT"]
          }
        },
        _sum: {
          amount: true
        }
      });
      const financeAmount = decimal_to_number(financeExpenseAggregate._sum.amount);
      const delta = inventoryCost - financeAmount;
      if (Math.abs(delta) < 0.01) {
        continue;
      }

      mismatches.push({
        pair: "inventory_finance",
        leftEntityRef: `inventory.issues.cost.by_order:${order.id}`,
        rightEntityRef: `finance.expense.by_order:${order.id}`,
        actualDifference: {
          inventoryIssueTotalCost: format_amount(inventoryCost),
          financeRecordedAmount: format_amount(financeAmount),
          delta: format_amount(delta)
        },
        recommendedAction:
          delta > 0
            ? "create_or_apply_finance_correction_for_inventory_cost"
            : "review_excess_finance_expense_vs_inventory_cost"
      });
    }

    return mismatches;
  }

  private async collect_logistics_orders_mismatches(
    client: Prisma.TransactionClient
  ): Promise<ReconciliationMismatch[]> {
    const tasks = await client.logisticsDeliveryTask.findMany({
      select: {
        orderId: true,
        status: true
      }
    });

    const taskStatusesByOrderId = new Map<string, string[]>();
    for (const task of tasks) {
      const existing = taskStatusesByOrderId.get(task.orderId);
      if (existing) {
        existing.push(from_prisma_enum(task.status));
        continue;
      }
      taskStatusesByOrderId.set(task.orderId, [from_prisma_enum(task.status)]);
    }

    const orderIds = [...taskStatusesByOrderId.keys()];
    if (orderIds.length === 0) {
      return [];
    }

    const orders = await client.ordersOrder.findMany({
      where: {
        id: { in: orderIds },
        isDeleted: false
      },
      select: {
        id: true,
        deliveryStatus: true
      }
    });

    const mismatches: ReconciliationMismatch[] = [];
    for (const order of orders) {
      const taskStatuses = taskStatusesByOrderId.get(order.id) ?? [];
      const aggregatedStatus = aggregate_order_delivery_status_from_tasks(
        taskStatuses as Array<
          "planned" | "assigned" | "in_transit" | "delivered" | "failed" | "rescheduled"
        >
      );
      const orderDeliveryStatus = from_prisma_enum(order.deliveryStatus);
      if (aggregatedStatus === orderDeliveryStatus) {
        continue;
      }

      mismatches.push({
        pair: "logistics_orders",
        leftEntityRef: `logistics.delivery_tasks.by_order:${order.id}`,
        rightEntityRef: `orders.order_delivery_status:${order.id}`,
        actualDifference: {
          aggregatedTaskStatus: aggregatedStatus,
          orderDeliveryStatus
        },
        recommendedAction: "recompute_order_delivery_status_from_delivery_tasks"
      });
    }

    return mismatches;
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
      where: { id: recordId },
      data: {
        status: to_prisma_enum<PrismaIdempotencyStatus>("failed"),
        responseStatusCode: resolve_error_status_code(error),
        responseBody: {
          message: error instanceof Error ? error.message : "Reconciliation run failed"
        },
        lockedUntil: null
      }
    });
  }
}

function map_reconciliation_report_read_model(record: {
  id: string;
  reportDate: Date;
  status: PrismaReconciliationReportStatus;
  issuesCount: number;
  summary: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}): ReconciliationReportReadModel {
  return {
    id: record.id,
    reportDate: format_report_date(record.reportDate),
    status: from_prisma_enum(record.status) as ReconciliationReportStatus,
    issuesCount: record.issuesCount,
    summary: normalize_summary(record.summary, record.reportDate),
    createdAt: to_iso_datetime(record.createdAt) ?? "",
    updatedAt: to_iso_datetime(record.updatedAt) ?? ""
  };
}

function normalize_summary(summary: Prisma.JsonValue, reportDate: Date): ReconciliationSummary {
  if (summary && typeof summary === "object" && !Array.isArray(summary)) {
    return summary as unknown as ReconciliationSummary;
  }

  return {
    generatedAt: new Date().toISOString(),
    reportDate: format_report_date(reportDate),
    pairCounts: {
      orders_payments: 0,
      orders_driver_money: 0,
      orders_inventory: 0,
      inventory_finance: 0,
      logistics_orders: 0
    },
    mismatches: []
  };
}

function normalize_report_date(input?: string): Date {
  if (!input) {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  const normalized = input.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: "reportDate must be in YYYY-MM-DD format"
    });
  }

  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: "reportDate is invalid"
    });
  }

  return parsed;
}

function format_report_date(reportDate: Date): string {
  return reportDate.toISOString().slice(0, 10);
}

function build_run_reconciliation_hash(reportDate: Date): string {
  return createHash("sha256")
    .update(JSON.stringify({ reportDate: format_report_date(reportDate) }))
    .digest("hex");
}

function build_reconciliation_audit_event_id(reportId: string, idempotencyKey: string): string {
  const hash = createHash("sha256")
    .update(`${reportId}:${idempotencyKey}`)
    .digest("hex");
  return `reconciliation_run_${hash.slice(0, 40)}`;
}

function build_reconciliation_alert_audit_event_id(reportId: string, sequenceNo: number): string {
  const hash = createHash("sha256")
    .update(`${reportId}:mismatch_alert:${sequenceNo}`)
    .digest("hex");
  return `reconciliation_alert_${hash.slice(0, 40)}`;
}

function build_mismatch_alert_payload(
  reportId: string,
  mismatch: ReconciliationMismatch,
  detectedAt: Date,
  sequenceNo: number
): Record<string, unknown> {
  return {
    reportId,
    pair: mismatch.pair,
    leftEntityRef: mismatch.leftEntityRef,
    rightEntityRef: mismatch.rightEntityRef,
    actualDifference: mismatch.actualDifference,
    recommendedAction: mismatch.recommendedAction,
    detectedAt: detectedAt.toISOString(),
    sequenceNo,
    targetRoles: [...mismatch_alert_target_roles],
    dedupeKey: build_mismatch_alert_dedupe_key(reportId, mismatch, sequenceNo)
  };
}

function build_mismatch_alert_dedupe_key(
  reportId: string,
  mismatch: ReconciliationMismatch,
  sequenceNo: number
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        reportId,
        sequenceNo,
        pair: mismatch.pair,
        leftEntityRef: mismatch.leftEntityRef,
        rightEntityRef: mismatch.rightEntityRef,
        actualDifference: mismatch.actualDifference,
        recommendedAction: mismatch.recommendedAction
      })
    )
    .digest("hex");
}

function resolve_report_id_from_response_body(payload: Prisma.JsonValue | null): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const reportId = (payload as { reportId?: unknown }).reportId;
  if (typeof reportId !== "string") {
    return null;
  }

  const normalized = reportId.trim();
  return normalized.length > 0 ? normalized : null;
}

function decimal_to_number(value: Prisma.Decimal | string | number | null | undefined): number {
  const normalized = to_decimal_string(value);
  if (!normalized) {
    return 0;
  }

  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function format_amount(value: number): string {
  return value.toFixed(2);
}

function format_qty(value: number): string {
  return value.toFixed(3);
}

function resolve_error_status_code(error: unknown): number {
  if (error instanceof NotFoundException) {
    return 404;
  }

  if (error instanceof ForbiddenException) {
    return 403;
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
