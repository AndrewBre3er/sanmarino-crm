import { describe, expect, it, vi } from "vitest";
import {
  GetPaymentDetailUseCase,
  ListPaymentsUseCase
} from "../../src/modules/read-side/payments/payment.read.use-cases";
import type { PrismaPaymentsPaymentReadRepository } from "../../src/modules/read-side/payments/payment.read.repository";
import type { ReadCollectionQueryInput } from "../../src/modules/read-side/shared/read-model.contract";

function build_query(): ReadCollectionQueryInput {
  return {
    page: 1,
    pageSize: 20,
    includeDeleted: false,
    sortField: "createdAt",
    sortDirection: "desc",
    contract: {
      pagination: {
        mode: "page",
        page: {
          page: 1,
          pageSize: 20
        }
      },
      sort: [{ field: "createdAt", direction: "desc" }]
    }
  };
}

describe("payments read use-cases", () => {
  it("applies seller scope for list/detail reads", async () => {
    const repository = {
      list: vi.fn().mockResolvedValue({
        items: [],
        pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 }
      }),
      getById: vi.fn().mockResolvedValue({ id: "pay_1" })
    } as unknown as PrismaPaymentsPaymentReadRepository;
    const listUseCase = new ListPaymentsUseCase(repository);
    const detailUseCase = new GetPaymentDetailUseCase(repository);

    await listUseCase.execute(build_query(), {
      userId: "seller_1",
      roleCodes: ["seller"]
    });
    await detailUseCase.execute("pay_1", false, {
      userId: "seller_1",
      roleCodes: ["seller"]
    });

    expect(repository.list).toHaveBeenCalledWith(build_query(), {
      responsibleUserId: "seller_1"
    });
    expect(repository.getById).toHaveBeenCalledWith("pay_1", false, {
      responsibleUserId: "seller_1"
    });
  });

  it("allows privileged finance read without seller scoping", async () => {
    const repository = {
      list: vi.fn().mockResolvedValue({
        items: [],
        pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 }
      }),
      getById: vi.fn().mockResolvedValue({ id: "pay_1" })
    } as unknown as PrismaPaymentsPaymentReadRepository;
    const listUseCase = new ListPaymentsUseCase(repository);
    const detailUseCase = new GetPaymentDetailUseCase(repository);

    await listUseCase.execute(build_query(), {
      userId: "finance_1",
      roleCodes: ["finance"]
    });
    await detailUseCase.execute("pay_1", false, {
      userId: "finance_1",
      roleCodes: ["finance"]
    });

    expect(repository.list).toHaveBeenCalledWith(build_query(), undefined);
    expect(repository.getById).toHaveBeenCalledWith("pay_1", false, undefined);
  });
});

