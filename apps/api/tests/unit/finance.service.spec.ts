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
  const financeFinanceEntryCreate = vi.fn();
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
    financeFinanceEntry: {
      create: financeFinanceEntryCreate
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
    financeFinanceEntry: {
      create: financeFinanceEntryCreate
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
    financeFinanceEntryCreate,
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
    const { prismaService, financeExpenseCreate, systemIdempotencyRecordFindUnique } = create_prisma_mock();
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
    const { prismaService, financeExpenseCreate, systemIdempotencyRecordFindUnique } = create_prisma_mock();
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
      expense_record({ description: "Updated description", updatedAt: new Date("2026-04-12T11:00:00.000Z") })
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
    financeMarketingExpenseFindFirst.mockResolvedValue(marketing_expense_record({ campaign: "summer" }));

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

    financeExpenseFindMany.mockResolvedValue([expense_record({ expenseType: "MARKETING", relatedOrderId: null })]);
    financeExpenseCount.mockResolvedValue(1);
    financeExpenseFindFirst.mockResolvedValue(expense_record({ expenseType: "MARKETING", relatedOrderId: null }));

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
      service.updateExpense("missing", { description: "x" }, actor, command_context("idem-missing-expense"))
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
});
