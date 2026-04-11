import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import {
  GetFinanceEntryDetailUseCase,
  ListFinanceEntriesUseCase
} from "../../src/modules/read-side/finance/finance-entry.read.use-cases";
import type { PrismaFinanceEntryReadRepository } from "../../src/modules/read-side/finance/finance-entry.read.repository";
import type { ReadCollectionQueryInput } from "../../src/modules/read-side/shared/read-model.contract";

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
      filters: [
        { field: "entryType", operator: "eq", value: "income" },
        { field: "orderId", operator: "eq", value: "11111111-1111-4111-8111-111111111111" }
      ],
      sort: [{ field: "recognizedAt", direction: "desc" }]
    }
  };
}

describe("finance entries read use-cases", () => {
  it("applies seller scope for list/detail reads", async () => {
    const repository = {
      list: vi.fn().mockResolvedValue({
        items: [],
        pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 }
      }),
      getById: vi.fn().mockResolvedValue({ id: "fin_1" })
    } as unknown as PrismaFinanceEntryReadRepository;
    const listUseCase = new ListFinanceEntriesUseCase(repository);
    const detailUseCase = new GetFinanceEntryDetailUseCase(repository);

    await listUseCase.execute(build_query(), {
      userId: "seller_1",
      roleCodes: ["seller"]
    });
    await detailUseCase.execute("fin_1", false, {
      userId: "seller_1",
      roleCodes: ["seller"]
    });

    expect(repository.list).toHaveBeenCalledWith(build_query(), {
      responsibleUserId: "seller_1"
    });
    expect(repository.getById).toHaveBeenCalledWith("fin_1", false, {
      responsibleUserId: "seller_1"
    });
  });

  it("allows privileged finance read without seller scoping", async () => {
    const repository = {
      list: vi.fn().mockResolvedValue({
        items: [],
        pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 }
      }),
      getById: vi.fn().mockResolvedValue({ id: "fin_1" })
    } as unknown as PrismaFinanceEntryReadRepository;
    const listUseCase = new ListFinanceEntriesUseCase(repository);
    const detailUseCase = new GetFinanceEntryDetailUseCase(repository);

    await listUseCase.execute(build_query(), {
      userId: "finance_1",
      roleCodes: ["finance"]
    });
    await detailUseCase.execute("fin_1", false, {
      userId: "finance_1",
      roleCodes: ["finance"]
    });

    expect(repository.list).toHaveBeenCalledWith(build_query(), undefined);
    expect(repository.getById).toHaveBeenCalledWith("fin_1", false, undefined);
  });

  it("denies non-finance/non-seller roles", async () => {
    const repository = {
      list: vi.fn().mockResolvedValue({
        items: [],
        pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 }
      }),
      getById: vi.fn().mockResolvedValue({ id: "fin_1" })
    } as unknown as PrismaFinanceEntryReadRepository;
    const listUseCase = new ListFinanceEntriesUseCase(repository);

    await expect(
      listUseCase.execute(build_query(), {
        userId: "logistics_1",
        roleCodes: ["logistics"]
      })
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
