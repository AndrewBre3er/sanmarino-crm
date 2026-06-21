import { createHash } from "node:crypto";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { FinanceService } from "../../src/modules/finance/finance.service";
import type { ReadCollectionQueryInput } from "../../src/modules/read-side/shared/read-model.contract";
import type { PrismaService } from "../../src/prisma/prisma.service";

function build_query(status?: string[]): ReadCollectionQueryInput {
  return {
    page: 1,
    pageSize: 20,
    includeDeleted: false,
    ...(status ? { status } : {}),
    sortField: "occurredAt",
    sortDirection: "desc",
    contract: {
      pagination: {
        mode: "page",
        page: {
          page: 1,
          pageSize: 20
        }
      },
      sort: [{ field: "occurredAt", direction: "desc" }]
    }
  };
}

function create_prisma_mock() {
  const ordersOrderFindFirst = vi.fn();
  const financeExpenseFindMany = vi.fn();
  const financeExpenseCount = vi.fn();
  const financeExpenseFindFirst = vi.fn();
  const financeExpenseCreate = vi.fn();
  const financeExpenseUpdate = vi.fn();
  const financeMarketingExpenseFindMany = vi.fn();
  const financeMarketingExpenseCount = vi.fn();
  const financeMarketingExpenseFindFirst = vi.fn();
  const financeMarketingExpenseCreate = vi.fn();
  const financeMarketingExpenseUpdate = vi.fn();
  const financeManualCorrectionFindMany = vi.fn();
  const financeManualCorrectionCount = vi.fn();
  const financeManualCorrectionFindFirst = vi.fn();
  const financeManualCorrectionCreate = vi.fn();
  const financeManualCorrectionUpdate = vi.fn();
  const financeFinanceEntryCreate = vi.fn();
  const systemOutboxRecordCreateMany = vi.fn();
  const auditLogRecordCreate = vi.fn();
  const systemIdempotencyRecordFindUnique = vi.fn();
  const systemIdempotencyRecordCreate = vi.fn();
  const systemIdempotencyRecordUpdate = vi.fn();

  systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_1" });
  systemIdempotencyRecordUpdate.mockResolvedValue({ id: "idem_1" });

  const transactionClient = {
    ordersOrder: {
      findFirst: ordersOrderFindFirst
    },
    financeExpense: {
      findMany: financeExpenseFindMany,
      count: financeExpenseCount,
      findFirst: financeExpenseFindFirst,
      create: financeExpenseCreate,
      update: financeExpenseUpdate
    },
    financeMarketingExpense: {
      findMany: financeMarketingExpenseFindMany,
      count: financeMarketingExpenseCount,
      findFirst: financeMarketingExpenseFindFirst,
      create: financeMarketingExpenseCreate,
      update: financeMarketingExpenseUpdate
    },
    financeManualCorrection: {
      findMany: financeManualCorrectionFindMany,
      count: financeManualCorrectionCount,
      findFirst: financeManualCorrectionFindFirst,
      create: financeManualCorrectionCreate,
      update: financeManualCorrectionUpdate
    },
    financeFinanceEntry: {
      create: financeFinanceEntryCreate
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
      findFirst: ordersOrderFindFirst
    },
    financeExpense: {
      findMany: financeExpenseFindMany,
      count: financeExpenseCount,
      findFirst: financeExpenseFindFirst,
      create: financeExpenseCreate,
      update: financeExpenseUpdate
    },
    financeMarketingExpense: {
      findMany: financeMarketingExpenseFindMany,
      count: financeMarketingExpenseCount,
      findFirst: financeMarketingExpenseFindFirst,
      create: financeMarketingExpenseCreate,
      update: financeMarketingExpenseUpdate
    },
    financeManualCorrection: {
      findMany: financeManualCorrectionFindMany,
      count: financeManualCorrectionCount,
      findFirst: financeManualCorrectionFindFirst,
      create: financeManualCorrectionCreate,
      update: financeManualCorrectionUpdate
    },
    financeFinanceEntry: {
      create: financeFinanceEntryCreate
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
    ordersOrderFindFirst,
    financeExpenseFindMany,
    financeExpenseCount,
    financeExpenseFindFirst,
    financeExpenseCreate,
    financeExpenseUpdate,
    financeMarketingExpenseFindMany,
    financeMarketingExpenseCount,
    financeMarketingExpenseFindFirst,
    financeMarketingExpenseCreate,
    financeMarketingExpenseUpdate,
    financeManualCorrectionFindMany,
    financeManualCorrectionCount,
    financeManualCorrectionFindFirst,
    financeManualCorrectionCreate,
    financeManualCorrectionUpdate,
    financeFinanceEntryCreate,
    systemOutboxRecordCreateMany,
    auditLogRecordCreate,
    systemIdempotencyRecordFindUnique,
    systemIdempotencyRecordCreate,
    systemIdempotencyRecordUpdate
  };
}

const actor = { userId: "finance_1", roleCodes: ["finance"] as const };

function command_context(idempotencyKey = "idem-key-123") {
  return { idempotencyKey };
}

function expense_record(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: "exp_1",
    expenseType: "OPERATIONAL",
    amount: "1500.00",
    currency: "RUB",
    occurredAt: new Date("2026-04-12T10:00:00.000Z"),
    description: "Office supplies",
    relatedOrderId: "order_1",
    createdBy: "finance_1",
    createdAt: new Date("2026-04-12T10:00:00.000Z"),
    updatedAt: new Date("2026-04-12T10:00:00.000Z"),
    ...overrides
  };
}

function marketing_expense_record(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: "mexp_1",
    source: "avito",
    campaign: "spring",
    amount: "2500.00",
    currency: "RUB",
    occurredAt: new Date("2026-04-12T11:00:00.000Z"),
    description: "Ads",
    createdBy: "finance_1",
    createdAt: new Date("2026-04-12T11:00:00.000Z"),
    updatedAt: new Date("2026-04-12T11:00:00.000Z"),
    ...overrides
  };
}

function correction_record(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: "corr_1",
    status: "DRAFT",
    reason: "inventory finance mismatch",
    requestedByUserId: "finance_1",
    approvedByUserId: null,
    approvedAt: null,
    rejectedAt: null,
    appliedAt: null,
    appliedEntryId: null,
    payload: {
      amount: "125.50",
      currency: "RUB",
      recognizedAt: "2026-04-30T10:00:00.000Z",
      reason: "inventory finance mismatch",
      description: "cost delta",
      relatedOrderId: "order_1",
      reconciliationReference: {
        reportId: "report_1",
        pair: "inventory_finance",
        leftEntityRef: "inventory.issues.cost.by_order:order_1",
        rightEntityRef: "finance.expense.by_order:order_1",
        recommendedAction: "create_or_apply_finance_correction_for_inventory_cost"
      }
    },
    createdAt: new Date("2026-04-30T10:00:00.000Z"),
    updatedAt: new Date("2026-04-30T10:00:00.000Z"),
    ...overrides
  };
}

describe("finance service", () => {
  it("creates expense with idempotency and writes expense linkage to finance entry", async () => {
    const {
      prismaService,
      ordersOrderFindFirst,
      financeExpenseCreate,
      financeExpenseFindFirst,
      financeFinanceEntryCreate,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate,
      systemIdempotencyRecordUpdate
    } = create_prisma_mock();
    const service = new FinanceService(prismaService);

    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_create_expense" });
    ordersOrderFindFirst.mockResolvedValue({ id: "order_1" });
    financeExpenseCreate.mockResolvedValue({ id: "exp_1", relatedOrderId: "order_1" });
    financeExpenseFindFirst.mockResolvedValue(expense_record());
    financeFinanceEntryCreate.mockResolvedValue({ id: "fin_1" });

    const result = await service.createExpense(
      {
        expenseType: "operational",
        amount: "1500.00",
        occurredAt: "2026-04-12T10:00:00.000Z",
        description: "Office supplies",
        relatedOrderId: "order_1"
      },
      actor,
      command_context("idem-create-exp-1")
    );

    expect(result.id).toBe("exp_1");
    expect(financeFinanceEntryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entryType: "EXPENSE",
          expense: { connect: { id: "exp_1" } },
          order: { connect: { id: "order_1" } }
        })
      })
    );
    expect(systemIdempotencyRecordUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "idem_create_expense" },
        data: expect.objectContaining({
          status: "COMPLETED",
          responseBody: { expenseId: "exp_1" }
        })
      })
    );
  });

  it("replays create expense and does not create duplicate finance entry", async () => {
    const {
      prismaService,
      financeExpenseCreate,
      financeExpenseFindFirst,
      financeFinanceEntryCreate,
      systemIdempotencyRecordFindUnique
    } = create_prisma_mock();
    const service = new FinanceService(prismaService);

    const requestHash = createHash("sha256")
      .update(
        JSON.stringify({
          expenseType: "operational",
          amount: "1500.00",
          currency: "RUB",
          occurredAt: "2026-04-12T10:00:00.000Z",
          description: "Office supplies",
          relatedOrderId: "order_1"
        })
      )
      .digest("hex");

    systemIdempotencyRecordFindUnique.mockResolvedValue({
      id: "idem_create_expense",
      requestHash,
      status: "COMPLETED",
      lockedUntil: null,
      responseBody: { expenseId: "exp_1" }
    });
    financeExpenseFindFirst.mockResolvedValue(expense_record());

    const result = await service.createExpense(
      {
        expenseType: "operational",
        amount: "1500.00",
        occurredAt: "2026-04-12T10:00:00.000Z",
        description: "Office supplies",
        relatedOrderId: "order_1"
      },
      actor,
      command_context("idem-create-exp-1")
    );

    expect(result.id).toBe("exp_1");
    expect(financeExpenseCreate).not.toHaveBeenCalled();
    expect(financeFinanceEntryCreate).not.toHaveBeenCalled();
  });

  it("returns conflict for same idempotency key with different create payload", async () => {
    const { prismaService, financeExpenseCreate, systemIdempotencyRecordFindUnique } =
      create_prisma_mock();
    const service = new FinanceService(prismaService);

    systemIdempotencyRecordFindUnique.mockResolvedValue({
      id: "idem_create_expense",
      requestHash: "some-other-hash",
      status: "COMPLETED",
      lockedUntil: null,
      responseBody: { expenseId: "exp_1" }
    });

    await expect(
      service.createExpense(
        {
          expenseType: "operational",
          amount: "1600.00",
          occurredAt: "2026-04-12T10:00:00.000Z",
          description: "Different payload",
          relatedOrderId: "order_1"
        },
        actor,
        command_context("idem-create-exp-1")
      )
    ).rejects.toBeInstanceOf(ConflictException);

    expect(financeExpenseCreate).not.toHaveBeenCalled();
  });

  it("returns conflict when idempotency key is already locked in STARTED status", async () => {
    const { prismaService, financeExpenseCreate, systemIdempotencyRecordFindUnique } =
      create_prisma_mock();
    const service = new FinanceService(prismaService);

    const requestHash = createHash("sha256")
      .update(
        JSON.stringify({
          expenseType: "operational",
          amount: "1500.00",
          currency: "RUB",
          occurredAt: "2026-04-12T10:00:00.000Z",
          description: "Office supplies",
          relatedOrderId: "order_1"
        })
      )
      .digest("hex");

    systemIdempotencyRecordFindUnique.mockResolvedValue({
      id: "idem_create_expense",
      requestHash,
      status: "STARTED",
      lockedUntil: new Date("2099-01-01T00:00:00.000Z"),
      responseBody: null
    });

    await expect(
      service.createExpense(
        {
          expenseType: "operational",
          amount: "1500.00",
          occurredAt: "2026-04-12T10:00:00.000Z",
          description: "Office supplies",
          relatedOrderId: "order_1"
        },
        actor,
        command_context("idem-create-exp-1")
      )
    ).rejects.toBeInstanceOf(ConflictException);

    expect(financeExpenseCreate).not.toHaveBeenCalled();
  });

  it("replays update expense idempotently without duplicate finance posting", async () => {
    const {
      prismaService,
      financeExpenseUpdate,
      financeExpenseFindFirst,
      financeFinanceEntryCreate,
      systemIdempotencyRecordFindUnique
    } = create_prisma_mock();
    const service = new FinanceService(prismaService);

    const requestHash = createHash("sha256")
      .update(
        JSON.stringify({
          expenseId: "exp_1",
          description: "Updated description"
        })
      )
      .digest("hex");

    systemIdempotencyRecordFindUnique.mockResolvedValue({
      id: "idem_update_expense",
      requestHash,
      status: "COMPLETED",
      lockedUntil: null,
      responseBody: { expenseId: "exp_1" }
    });
    financeExpenseFindFirst.mockResolvedValue(
      expense_record({
        description: "Updated description",
        updatedAt: new Date("2026-04-12T11:00:00.000Z")
      })
    );

    const result = await service.updateExpense(
      "exp_1",
      { description: "Updated description" },
      actor,
      command_context("idem-update-exp-1")
    );

    expect(result.description).toBe("Updated description");
    expect(financeExpenseUpdate).not.toHaveBeenCalled();
    expect(financeFinanceEntryCreate).not.toHaveBeenCalled();
  });

  it("creates marketing expense with idempotency and writes marketing linkage", async () => {
    const {
      prismaService,
      financeMarketingExpenseCreate,
      financeMarketingExpenseFindFirst,
      financeFinanceEntryCreate,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate,
      systemIdempotencyRecordUpdate
    } = create_prisma_mock();
    const service = new FinanceService(prismaService);

    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_create_marketing" });
    financeMarketingExpenseCreate.mockResolvedValue({ id: "mexp_1" });
    financeMarketingExpenseFindFirst.mockResolvedValue(marketing_expense_record());

    const result = await service.createMarketingExpense(
      {
        source: "avito",
        campaign: "spring",
        amount: "2500.00",
        occurredAt: "2026-04-12T11:00:00.000Z",
        description: "Ads"
      },
      actor,
      command_context("idem-create-mexp-1")
    );

    expect(result.id).toBe("mexp_1");
    expect(financeFinanceEntryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entryType: "EXPENSE",
          marketingExpense: { connect: { id: "mexp_1" } }
        })
      })
    );
    expect(systemIdempotencyRecordUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "idem_create_marketing" },
        data: expect.objectContaining({
          status: "COMPLETED",
          responseBody: { marketingExpenseId: "mexp_1" }
        })
      })
    );
  });

  it("replays update marketing expense idempotently", async () => {
    const {
      prismaService,
      financeMarketingExpenseUpdate,
      financeMarketingExpenseFindFirst,
      systemIdempotencyRecordFindUnique
    } = create_prisma_mock();
    const service = new FinanceService(prismaService);

    const requestHash = createHash("sha256")
      .update(
        JSON.stringify({
          marketingExpenseId: "mexp_1",
          campaign: "summer"
        })
      )
      .digest("hex");

    systemIdempotencyRecordFindUnique.mockResolvedValue({
      id: "idem_update_marketing",
      requestHash,
      status: "COMPLETED",
      lockedUntil: null,
      responseBody: { marketingExpenseId: "mexp_1" }
    });
    financeMarketingExpenseFindFirst.mockResolvedValue(
      marketing_expense_record({ campaign: "summer" })
    );

    const result = await service.updateMarketingExpense(
      "mexp_1",
      { campaign: "summer" },
      actor,
      command_context("idem-update-mexp-1")
    );

    expect(result.campaign).toBe("summer");
    expect(financeMarketingExpenseUpdate).not.toHaveBeenCalled();
  });

  it("lists and details expenses baseline", async () => {
    const { prismaService, financeExpenseFindMany, financeExpenseCount, financeExpenseFindFirst } =
      create_prisma_mock();
    const service = new FinanceService(prismaService);

    financeExpenseFindMany.mockResolvedValue([
      expense_record({ expenseType: "MARKETING", relatedOrderId: null })
    ]);
    financeExpenseCount.mockResolvedValue(1);
    financeExpenseFindFirst.mockResolvedValue(
      expense_record({ expenseType: "MARKETING", relatedOrderId: null })
    );

    const listResult = await service.listExpenses(build_query(["marketing"]), actor);
    const detailResult = await service.getExpense("exp_1", actor);

    expect(listResult.items[0]?.expenseType).toBe("marketing");
    expect(detailResult.id).toBe("exp_1");
  });

  it("throws not found for missing expense and marketing expense on patch", async () => {
    const {
      prismaService,
      financeExpenseFindFirst,
      financeMarketingExpenseFindFirst,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate
    } = create_prisma_mock();
    const service = new FinanceService(prismaService);

    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate
      .mockResolvedValueOnce({ id: "idem_missing_expense" })
      .mockResolvedValueOnce({ id: "idem_missing_marketing" });
    financeExpenseFindFirst.mockResolvedValue(null);
    financeMarketingExpenseFindFirst.mockResolvedValue(null);

    await expect(
      service.updateExpense(
        "missing",
        { description: "x" },
        actor,
        command_context("idem-missing-expense")
      )
    ).rejects.toBeInstanceOf(NotFoundException);

    await expect(
      service.updateMarketingExpense(
        "missing",
        { description: "x" },
        actor,
        command_context("idem-missing-marketing")
      )
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("creates manual correction as draft with payload context, audit, outbox, and idempotency", async () => {
    const {
      prismaService,
      financeManualCorrectionCreate,
      financeManualCorrectionFindFirst,
      systemOutboxRecordCreateMany,
      auditLogRecordCreate,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate,
      systemIdempotencyRecordUpdate
    } = create_prisma_mock();
    const service = new FinanceService(prismaService);

    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_create_correction" });
    financeManualCorrectionCreate.mockResolvedValue({ id: "corr_1" });
    financeManualCorrectionFindFirst.mockResolvedValue(correction_record());

    const result = await service.createManualCorrection(
      {
        amount: "125.50",
        currency: "RUB",
        recognizedAt: "2026-04-30T10:00:00.000Z",
        reason: "inventory finance mismatch",
        description: "cost delta",
        relatedOrderId: "order_1",
        reconciliationReference: {
          reportId: "report_1",
          pair: "inventory_finance",
          leftEntityRef: "inventory.issues.cost.by_order:order_1",
          rightEntityRef: "finance.expense.by_order:order_1",
          recommendedAction: "create_or_apply_finance_correction_for_inventory_cost"
        }
      },
      actor,
      command_context("idem-create-corr-1")
    );

    expect(result.status).toBe("draft");
    expect(result.payload.reconciliationReference?.reportId).toBe("report_1");
    expect(financeManualCorrectionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "DRAFT",
          reason: "inventory finance mismatch",
          requestedByUser: { connect: { id: "finance_1" } },
          payload: expect.objectContaining({
            amount: "125.50",
            relatedOrderId: "order_1",
            reconciliationReference: expect.objectContaining({
              pair: "inventory_finance"
            })
          })
        })
      })
    );
    expect(systemOutboxRecordCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ eventType: "finance.correction_created" })
        ])
      })
    );
    expect(auditLogRecordCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "finance.correction_created",
          entityType: "finance.manual_correction",
          entityId: "corr_1",
          actorUserId: "finance_1"
        })
      })
    );
    expect(systemIdempotencyRecordUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "idem_create_correction" },
        data: expect.objectContaining({
          status: "COMPLETED",
          responseBody: { correctionId: "corr_1" }
        })
      })
    );
  });

  it("lists and details manual corrections only for finance or ceo", async () => {
    const {
      prismaService,
      financeManualCorrectionFindMany,
      financeManualCorrectionCount,
      financeManualCorrectionFindFirst
    } = create_prisma_mock();
    const service = new FinanceService(prismaService);

    financeManualCorrectionFindMany.mockResolvedValue([correction_record()]);
    financeManualCorrectionCount.mockResolvedValue(1);
    financeManualCorrectionFindFirst.mockResolvedValue(correction_record());

    const listResult = await service.listManualCorrections(build_query(["draft"]), actor);
    const detailResult = await service.getManualCorrection("corr_1", {
      userId: "ceo_1",
      roleCodes: ["ceo"]
    });

    expect(listResult.items[0]?.status).toBe("draft");
    expect(detailResult.id).toBe("corr_1");
    await expect(
      service.listManualCorrections(build_query(), {
        userId: "admin_1",
        roleCodes: ["admin"]
      })
    ).rejects.toMatchObject({ response: { code: "ACCESS_DENIED" } });
  });

  it("moves manual correction through submit, approve, reject workflow states", async () => {
    const {
      prismaService,
      financeManualCorrectionFindFirst,
      financeManualCorrectionUpdate,
      systemOutboxRecordCreateMany,
      auditLogRecordCreate,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate
    } = create_prisma_mock();
    const service = new FinanceService(prismaService);

    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate
      .mockResolvedValueOnce({ id: "idem_submit" })
      .mockResolvedValueOnce({ id: "idem_approve" })
      .mockResolvedValueOnce({ id: "idem_reject" });
    financeManualCorrectionFindFirst
      .mockResolvedValueOnce(correction_record({ status: "DRAFT" }))
      .mockResolvedValueOnce(correction_record({ status: "PENDING_APPROVAL" }))
      .mockResolvedValueOnce(correction_record({ status: "PENDING_APPROVAL" }))
      .mockResolvedValueOnce(correction_record({ status: "APPROVED", approvedByUserId: "ceo_1" }))
      .mockResolvedValueOnce(correction_record({ status: "PENDING_APPROVAL" }))
      .mockResolvedValueOnce(
        correction_record({ status: "REJECTED", rejectedAt: new Date("2026-04-30T11:00:00.000Z") })
      );

    const submitted = await service.submitManualCorrectionForApproval(
      "corr_1",
      actor,
      command_context("idem-submit-corr-1")
    );
    const approved = await service.approveManualCorrection(
      "corr_1",
      { userId: "ceo_1", roleCodes: ["ceo"] },
      command_context("idem-approve-corr-1")
    );
    const rejected = await service.rejectManualCorrection(
      "corr_1",
      { reason: "incorrect amount" },
      { userId: "ceo_1", roleCodes: ["ceo"] },
      command_context("idem-reject-corr-1")
    );

    expect(submitted.status).toBe("pending_approval");
    expect(approved.status).toBe("approved");
    expect(rejected.status).toBe("rejected");
    expect(financeManualCorrectionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PENDING_APPROVAL" })
      })
    );
    expect(financeManualCorrectionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "APPROVED",
          approvedByUser: { connect: { id: "ceo_1" } }
        })
      })
    );
    expect(systemOutboxRecordCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ eventType: "finance.correction_submitted_for_approval" })
        ])
      })
    );
    expect(auditLogRecordCreate).toHaveBeenCalled();
  });

  it("applies an approved manual correction once and links the created finance entry", async () => {
    const {
      prismaService,
      financeManualCorrectionFindFirst,
      financeManualCorrectionUpdate,
      financeFinanceEntryCreate,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate,
      systemIdempotencyRecordUpdate
    } = create_prisma_mock();
    const service = new FinanceService(prismaService);

    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_apply" });
    financeManualCorrectionFindFirst
      .mockResolvedValueOnce(correction_record({ status: "APPROVED" }))
      .mockResolvedValueOnce(
        correction_record({
          status: "APPLIED",
          appliedAt: new Date("2026-04-30T12:00:00.000Z"),
          appliedEntryId: "fin_1"
        })
      );
    financeFinanceEntryCreate.mockResolvedValue({ id: "fin_1" });

    const applied = await service.applyManualCorrection(
      "corr_1",
      actor,
      command_context("idem-apply-corr-1")
    );

    expect(applied.status).toBe("applied");
    expect(applied.appliedEntryId).toBe("fin_1");
    expect(financeFinanceEntryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entryType: "ADJUSTMENT",
          order: { connect: { id: "order_1" } },
          amount: "125.50",
          currency: "RUB",
          recognizedAt: new Date("2026-04-30T10:00:00.000Z")
        }),
        select: { id: true }
      })
    );
    expect(financeManualCorrectionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "corr_1",
          status: "APPROVED",
          appliedEntry: null
        }),
        data: expect.objectContaining({
          status: "APPLIED",
          appliedEntry: { connect: { id: "fin_1" } }
        })
      })
    );
    expect(systemIdempotencyRecordUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "COMPLETED",
          responseBody: { correctionId: "corr_1", financeEntryId: "fin_1" }
        })
      })
    );
  });

  it.each(["DRAFT", "PENDING_APPROVAL", "REJECTED", "APPLIED"] as const)(
    "rejects apply from %s",
    async (status) => {
      const {
        prismaService,
        financeManualCorrectionFindFirst,
        financeFinanceEntryCreate,
        systemIdempotencyRecordFindUnique,
        systemIdempotencyRecordCreate
      } = create_prisma_mock();
      const service = new FinanceService(prismaService);

      systemIdempotencyRecordFindUnique.mockResolvedValue(null);
      systemIdempotencyRecordCreate.mockResolvedValue({ id: `idem_apply_${status}` });
      financeManualCorrectionFindFirst.mockResolvedValue(
        correction_record({
          status,
          ...(status === "APPLIED" ? { appliedEntryId: "fin_1" } : {})
        })
      );

      await expect(
        service.applyManualCorrection(
          "corr_1",
          actor,
          command_context(`idem-apply-${status.toLowerCase()}`)
        )
      ).rejects.toBeInstanceOf(ConflictException);

      expect(financeFinanceEntryCreate).not.toHaveBeenCalled();
    }
  );

  it("replays idempotent correction commands without duplicate transitions or finance entries", async () => {
    const {
      prismaService,
      financeManualCorrectionFindFirst,
      financeManualCorrectionUpdate,
      financeFinanceEntryCreate,
      systemIdempotencyRecordFindUnique
    } = create_prisma_mock();
    const service = new FinanceService(prismaService);

    const requestHash = createHash("sha256")
      .update(JSON.stringify({ correctionId: "corr_1" }))
      .digest("hex");
    systemIdempotencyRecordFindUnique.mockResolvedValue({
      id: "idem_done",
      requestHash,
      status: "COMPLETED",
      lockedUntil: null,
      responseBody: { correctionId: "corr_1", financeEntryId: "fin_1" }
    });
    financeManualCorrectionFindFirst.mockResolvedValue(
      correction_record({ status: "APPLIED", appliedEntryId: "fin_1" })
    );

    const result = await service.applyManualCorrection(
      "corr_1",
      actor,
      command_context("idem-apply-corr-1")
    );

    expect(result.id).toBe("corr_1");
    expect(financeManualCorrectionUpdate).not.toHaveBeenCalled();
    expect(financeFinanceEntryCreate).not.toHaveBeenCalled();
  });

  it("rejects same correction idempotency key with different payload", async () => {
    const { prismaService, financeManualCorrectionCreate, systemIdempotencyRecordFindUnique } =
      create_prisma_mock();
    const service = new FinanceService(prismaService);

    systemIdempotencyRecordFindUnique.mockResolvedValue({
      id: "idem_create_correction",
      requestHash: "different-hash",
      status: "COMPLETED",
      lockedUntil: null,
      responseBody: { correctionId: "corr_1" }
    });

    await expect(
      service.createManualCorrection(
        {
          amount: "130.00",
          currency: "RUB",
          recognizedAt: "2026-04-30T10:00:00.000Z",
          reason: "different correction"
        },
        actor,
        command_context("idem-create-corr-1")
      )
    ).rejects.toBeInstanceOf(ConflictException);

    expect(financeManualCorrectionCreate).not.toHaveBeenCalled();
  });

  it("denies manual correction commands for forbidden roles including admin", async () => {
    const { prismaService, financeManualCorrectionCreate } = create_prisma_mock();
    const service = new FinanceService(prismaService);

    for (const roleCode of ["seller", "warehouse", "logistics", "admin"] as const) {
      await expect(
        service.createManualCorrection(
          {
            amount: "125.50",
            currency: "RUB",
            recognizedAt: "2026-04-30T10:00:00.000Z",
            reason: "inventory finance mismatch"
          },
          { userId: `${roleCode}_1`, roleCodes: [roleCode] },
          command_context(`idem-forbidden-${roleCode}`)
        )
      ).rejects.toMatchObject({ response: { code: "ACCESS_DENIED" } });
    }

    expect(financeManualCorrectionCreate).not.toHaveBeenCalled();
  });
});
