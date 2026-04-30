import { createHash } from "node:crypto";
import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { ReconciliationService } from "../../src/modules/reconciliation/reconciliation.service";
import type { PrismaService } from "../../src/prisma/prisma.service";

function create_prisma_mock() {
  const ordersOrderFindMany = vi.fn();
  const paymentsPaymentAggregate = vi.fn();
  const ordersFulfillmentItemAggregate = vi.fn();
  const ordersFulfillmentItemFindMany = vi.fn();
  const inventoryInventoryMovementAggregate = vi.fn();
  const inventoryInventoryMovementFindMany = vi.fn();
  const financeFinanceEntryAggregate = vi.fn();
  const logisticsDeliveryTaskFindMany = vi.fn();
  const reconciliationReportFindUnique = vi.fn();
  const reconciliationReportCreate = vi.fn();
  const reconciliationReportFindFirst = vi.fn();
  const reconciliationReportFindMany = vi.fn();
  const reconciliationReportCount = vi.fn();
  const systemOutboxRecordCreateMany = vi.fn();
  const auditLogRecordCreate = vi.fn();
  const systemIdempotencyRecordFindUnique = vi.fn();
  const systemIdempotencyRecordCreate = vi.fn();
  const systemIdempotencyRecordUpdate = vi.fn();

  const transactionClient = {
    ordersOrder: {
      findMany: ordersOrderFindMany
    },
    paymentsPayment: {
      aggregate: paymentsPaymentAggregate
    },
    ordersFulfillmentItem: {
      aggregate: ordersFulfillmentItemAggregate,
      findMany: ordersFulfillmentItemFindMany
    },
    inventoryInventoryMovement: {
      aggregate: inventoryInventoryMovementAggregate,
      findMany: inventoryInventoryMovementFindMany
    },
    financeFinanceEntry: {
      aggregate: financeFinanceEntryAggregate
    },
    logisticsDeliveryTask: {
      findMany: logisticsDeliveryTaskFindMany
    },
    reconciliationReport: {
      findUnique: reconciliationReportFindUnique,
      create: reconciliationReportCreate,
      findFirst: reconciliationReportFindFirst,
      findMany: reconciliationReportFindMany,
      count: reconciliationReportCount
    },
    systemOutboxRecord: {
      createMany: systemOutboxRecordCreateMany
    },
    auditLogRecord: {
      create: auditLogRecordCreate
    },
    systemIdempotencyRecord: {
      update: systemIdempotencyRecordUpdate
    }
  };

  const prismaService = {
    ordersOrder: {
      findMany: ordersOrderFindMany
    },
    paymentsPayment: {
      aggregate: paymentsPaymentAggregate
    },
    ordersFulfillmentItem: {
      aggregate: ordersFulfillmentItemAggregate,
      findMany: ordersFulfillmentItemFindMany
    },
    inventoryInventoryMovement: {
      aggregate: inventoryInventoryMovementAggregate,
      findMany: inventoryInventoryMovementFindMany
    },
    financeFinanceEntry: {
      aggregate: financeFinanceEntryAggregate
    },
    logisticsDeliveryTask: {
      findMany: logisticsDeliveryTaskFindMany
    },
    reconciliationReport: {
      findUnique: reconciliationReportFindUnique,
      create: reconciliationReportCreate,
      findFirst: reconciliationReportFindFirst,
      findMany: reconciliationReportFindMany,
      count: reconciliationReportCount
    },
    systemOutboxRecord: {
      createMany: systemOutboxRecordCreateMany
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
    ordersOrderFindMany,
    paymentsPaymentAggregate,
    ordersFulfillmentItemAggregate,
    ordersFulfillmentItemFindMany,
    inventoryInventoryMovementAggregate,
    inventoryInventoryMovementFindMany,
    financeFinanceEntryAggregate,
    logisticsDeliveryTaskFindMany,
    reconciliationReportFindUnique,
    reconciliationReportCreate,
    reconciliationReportFindFirst,
    reconciliationReportFindMany,
    reconciliationReportCount,
    systemOutboxRecordCreateMany,
    auditLogRecordCreate,
    systemIdempotencyRecordFindUnique,
    systemIdempotencyRecordCreate,
    systemIdempotencyRecordUpdate
  };
}

function build_report_record(
  overrides?: Partial<{
    id: string;
    reportDate: Date;
    status: "COMPLETED";
    issuesCount: number;
    summary: unknown;
    createdAt: Date;
    updatedAt: Date;
  }>
) {
  return {
    id: overrides?.id ?? "report_1",
    reportDate: overrides?.reportDate ?? new Date("2026-04-29T00:00:00.000Z"),
    status: overrides?.status ?? "COMPLETED",
    issuesCount: overrides?.issuesCount ?? 0,
    summary:
      overrides?.summary ??
      ({
        generatedAt: "2026-04-29T12:00:00.000Z",
        reportDate: "2026-04-29",
        pairCounts: {
          orders_payments: 0,
          orders_driver_money: 0,
          orders_inventory: 0,
          inventory_finance: 0,
          logistics_orders: 0
        },
        mismatches: []
      } satisfies Record<string, unknown>),
    createdAt: overrides?.createdAt ?? new Date("2026-04-29T12:00:00.000Z"),
    updatedAt: overrides?.updatedAt ?? new Date("2026-04-29T12:00:00.000Z")
  };
}

describe("reconciliation service", () => {
  it("runs reconciliation and writes report/outbox/audit trace", async () => {
    const {
      prismaService,
      ordersOrderFindMany,
      logisticsDeliveryTaskFindMany,
      reconciliationReportFindUnique,
      reconciliationReportCreate,
      systemOutboxRecordCreateMany,
      auditLogRecordCreate,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate,
      systemIdempotencyRecordUpdate
    } = create_prisma_mock();
    const service = new ReconciliationService(prismaService);

    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_1" });
    reconciliationReportFindUnique.mockResolvedValue(null);
    ordersOrderFindMany.mockResolvedValue([]);
    logisticsDeliveryTaskFindMany.mockResolvedValue([]);
    reconciliationReportCreate.mockImplementation(async (args: { data: { reportDate: Date; status: "COMPLETED"; issuesCount: number; summary: unknown } }) =>
      build_report_record({
        reportDate: args.data.reportDate,
        status: args.data.status,
        issuesCount: args.data.issuesCount,
        summary: args.data.summary
      })
    );

    const result = await service.runReconciliation(
      {},
      {
        userId: "finance_1",
        roleCodes: ["finance"]
      },
      {
        idempotencyKey: "idem_1"
      }
    );

    expect(result.status).toBe("completed");
    expect(result.issuesCount).toBe(0);
    expect(systemOutboxRecordCreateMany).toHaveBeenCalledOnce();
    expect(auditLogRecordCreate).toHaveBeenCalledOnce();
    expect(systemIdempotencyRecordUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "COMPLETED"
        })
      })
    );
  });

  it("detects payment and logistics mismatches in report summary", async () => {
    const {
      prismaService,
      ordersOrderFindMany,
      paymentsPaymentAggregate,
      logisticsDeliveryTaskFindMany,
      reconciliationReportFindUnique,
      reconciliationReportCreate,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate
    } = create_prisma_mock();
    const service = new ReconciliationService(prismaService);

    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_2" });
    reconciliationReportFindUnique.mockResolvedValue(null);
    ordersOrderFindMany
      .mockResolvedValueOnce([
        {
          id: "order_1",
          totalAmount: "1000.00"
        }
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "order_1",
          deliveryStatus: "SCHEDULED"
        }
      ]);
    paymentsPaymentAggregate.mockResolvedValue({
      _sum: {
        amount: "400.00",
        refundedAmount: "0.00"
      }
    });
    logisticsDeliveryTaskFindMany.mockResolvedValue([
      {
        orderId: "order_1",
        status: "DELIVERED"
      }
    ]);
    reconciliationReportCreate.mockImplementation(async (args: { data: { reportDate: Date; status: "COMPLETED"; issuesCount: number; summary: unknown } }) =>
      build_report_record({
        reportDate: args.data.reportDate,
        status: args.data.status,
        issuesCount: args.data.issuesCount,
        summary: args.data.summary
      })
    );

    const result = await service.runReconciliation(
      {
        reportDate: "2026-04-29"
      },
      {
        userId: "finance_1",
        roleCodes: ["finance"]
      },
      {
        idempotencyKey: "idem_2"
      }
    );

    const pairSet = new Set(result.summary.mismatches.map(mismatch => mismatch.pair));
    expect(pairSet.has("orders_payments")).toBe(true);
    expect(pairSet.has("logistics_orders")).toBe(true);
    expect(result.issuesCount).toBeGreaterThanOrEqual(2);
  });

  it("detects same-total wrong-product orders_inventory mismatch", async () => {
    const {
      prismaService,
      ordersOrderFindMany,
      ordersFulfillmentItemAggregate,
      ordersFulfillmentItemFindMany,
      inventoryInventoryMovementAggregate,
      inventoryInventoryMovementFindMany,
      logisticsDeliveryTaskFindMany,
      reconciliationReportFindUnique,
      reconciliationReportCreate,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate
    } = create_prisma_mock();
    const service = new ReconciliationService(prismaService);

    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_inventory_position" });
    reconciliationReportFindUnique.mockResolvedValue(null);
    ordersOrderFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "order_1" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    ordersFulfillmentItemAggregate.mockResolvedValue({
      _sum: {
        qty: "2.000"
      }
    });
    ordersFulfillmentItemFindMany.mockResolvedValue([
      {
        orderItemId: "order_item_a",
        qty: "1.000",
        orderItem: { productId: "product_a" }
      },
      {
        orderItemId: "order_item_b",
        qty: "1.000",
        orderItem: { productId: "product_b" }
      }
    ]);
    inventoryInventoryMovementFindMany.mockResolvedValue([
      {
        productId: "product_a",
        qty: "2.000"
      }
    ]);
    inventoryInventoryMovementAggregate.mockResolvedValue({
      _sum: {
        qty: "2.000"
      }
    });
    logisticsDeliveryTaskFindMany.mockResolvedValue([]);
    reconciliationReportCreate.mockImplementation(async (args: { data: { reportDate: Date; status: "COMPLETED"; issuesCount: number; summary: unknown } }) =>
      build_report_record({
        reportDate: args.data.reportDate,
        status: args.data.status,
        issuesCount: args.data.issuesCount,
        summary: args.data.summary
      })
    );

    const result = await service.runReconciliation(
      {
        reportDate: "2026-04-29"
      },
      {
        userId: "finance_1",
        roleCodes: ["finance"]
      },
      {
        idempotencyKey: "idem_inventory_position"
      }
    );

    const inventoryMismatches = result.summary.mismatches.filter(
      mismatch => mismatch.pair === "orders_inventory"
    );
    expect(inventoryMismatches.length).toBeGreaterThan(0);
    expect(inventoryMismatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          leftEntityRef: "orders.order_items.by_product:order_1:product_b",
          rightEntityRef: "inventory.issues.by_product:order_1:product_b",
          actualDifference: expect.objectContaining({
            productId: "product_b",
            expectedFulfilledQty: "1.000",
            actualIssuedQty: "0.000"
          }),
          recommendedAction: "record_missing_inventory_issue_for_order_item_product"
        })
      ])
    );
  });

  it("replays idempotent run without creating a second report", async () => {
    const {
      prismaService,
      reconciliationReportCreate,
      reconciliationReportFindFirst,
      systemIdempotencyRecordFindUnique
    } = create_prisma_mock();
    const service = new ReconciliationService(prismaService);

    const requestHash = createHash("sha256")
      .update(JSON.stringify({ reportDate: "2026-04-29" }))
      .digest("hex");
    systemIdempotencyRecordFindUnique.mockResolvedValue({
      id: "idem_done",
      requestHash,
      status: "COMPLETED",
      lockedUntil: null,
      responseBody: { reportId: "report_77" }
    });
    reconciliationReportFindFirst.mockResolvedValue(
      build_report_record({
        id: "report_77"
      })
    );

    const result = await service.runReconciliation(
      {
        reportDate: "2026-04-29"
      },
      {
        userId: "finance_1",
        roleCodes: ["finance"]
      },
      {
        idempotencyKey: "idem_done"
      }
    );

    expect(result.id).toBe("report_77");
    expect(reconciliationReportCreate).not.toHaveBeenCalled();
  });

  it("denies reconciliation run for non-finance roles", async () => {
    const { prismaService } = create_prisma_mock();
    const service = new ReconciliationService(prismaService);

    await expect(
      service.runReconciliation(
        {},
        {
          userId: "seller_1",
          roleCodes: ["seller"]
        },
        {
          idempotencyKey: "idem_denied"
        }
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
