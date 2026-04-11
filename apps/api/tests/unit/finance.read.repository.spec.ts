import { describe, expect, it, vi } from "vitest";
import { PrismaFinanceEntryReadRepository } from "../../src/modules/read-side/finance/finance-entry.read.repository";
import type { ReadCollectionQueryInput } from "../../src/modules/read-side/shared/read-model.contract";
import type { PrismaService } from "../../src/prisma/prisma.service";

function create_prisma_mock() {
  const financeFinanceEntryFindMany = vi.fn();
  const financeFinanceEntryCount = vi.fn();
  const financeFinanceEntryFindFirst = vi.fn();

  const prismaService = {
    financeFinanceEntry: {
      findMany: financeFinanceEntryFindMany,
      count: financeFinanceEntryCount,
      findFirst: financeFinanceEntryFindFirst
    },
    $transaction: vi.fn(async (queries: unknown[]) => {
      if (!Array.isArray(queries)) {
        throw new Error("Unsupported transaction call");
      }

      return Promise.all(queries);
    })
  } as unknown as PrismaService;

  return {
    prismaService,
    financeFinanceEntryFindMany,
    financeFinanceEntryCount,
    financeFinanceEntryFindFirst
  };
}

function build_query(): ReadCollectionQueryInput {
  return {
    page: 1,
    pageSize: 20,
    includeDeleted: false,
    status: ["income"],
    sortField: "recognizedAt",
    sortDirection: "desc",
    contract: {
      pagination: {
        mode: "page",
        page: {
          page: 1,
          pageSize: 20
        }
      },
      sort: [{ field: "recognizedAt", direction: "desc" }],
      filters: [
        { field: "entryType", operator: "eq", value: "income" },
        { field: "orderId", operator: "eq", value: "11111111-1111-4111-8111-111111111111" },
        { field: "paymentId", operator: "eq", value: "22222222-2222-4222-8222-222222222222" }
      ]
    }
  };
}

function build_finance_entry_record() {
  return {
    id: "fin_1",
    entryType: "INCOME",
    orderId: "11111111-1111-4111-8111-111111111111",
    paymentId: "22222222-2222-4222-8222-222222222222",
    cashOperationId: "33333333-3333-4333-8333-333333333333",
    returnRequestId: null,
    amount: "2000.00",
    currency: "RUB",
    recognizedAt: new Date("2026-04-12T10:30:00.000Z"),
    description: "Income recognized from payment.completed cash-basis event",
    createdBy: "44444444-4444-4444-8444-444444444444",
    createdAt: new Date("2026-04-12T10:30:00.000Z"),
    updatedAt: new Date("2026-04-12T10:30:00.000Z")
  };
}

describe("finance entries read repository", () => {
  it("maps finance entry list fields and enforces seller order scope", async () => {
    const { prismaService, financeFinanceEntryFindMany, financeFinanceEntryCount } = create_prisma_mock();
    financeFinanceEntryFindMany.mockResolvedValue([build_finance_entry_record()]);
    financeFinanceEntryCount.mockResolvedValue(1);
    const repository = new PrismaFinanceEntryReadRepository(prismaService);

    const result = await repository.list(build_query(), {
      responsibleUserId: "seller_1"
    });

    expect(financeFinanceEntryFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            {
              entryType: "INCOME"
            },
            {
              orderId: "11111111-1111-4111-8111-111111111111"
            },
            {
              paymentId: "22222222-2222-4222-8222-222222222222"
            },
            {
              order: {
                deal: {
                  responsibleUserId: "seller_1"
                }
              }
            }
          ])
        })
      })
    );
    expect(result.items).toEqual([
      {
        id: "fin_1",
        entryType: "income",
        amount: "2000.00",
        currency: "RUB",
        recognizedAt: "2026-04-12T10:30:00.000Z",
        paymentId: "22222222-2222-4222-8222-222222222222",
        orderId: "11111111-1111-4111-8111-111111111111",
        cashOperationId: "33333333-3333-4333-8333-333333333333",
        description: "Income recognized from payment.completed cash-basis event"
      }
    ]);
  });

  it("returns finance entry detail mapped with linkage fields", async () => {
    const { prismaService, financeFinanceEntryFindFirst } = create_prisma_mock();
    financeFinanceEntryFindFirst.mockResolvedValue(build_finance_entry_record());
    const repository = new PrismaFinanceEntryReadRepository(prismaService);

    const result = await repository.getById("fin_1", false, { responsibleUserId: "seller_1" });

    expect(financeFinanceEntryFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { id: "fin_1" },
            {
              order: {
                deal: {
                  responsibleUserId: "seller_1"
                }
              }
            }
          ]
        }
      })
    );
    expect(result).toEqual({
      id: "fin_1",
      entryType: "income",
      amount: "2000.00",
      currency: "RUB",
      recognizedAt: "2026-04-12T10:30:00.000Z",
      paymentId: "22222222-2222-4222-8222-222222222222",
      orderId: "11111111-1111-4111-8111-111111111111",
      cashOperationId: "33333333-3333-4333-8333-333333333333",
      description: "Income recognized from payment.completed cash-basis event"
    });
  });
});
