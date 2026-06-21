import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { auth_access_metadata_key } from "../../src/modules/auth/auth.access.contract";
import type { AuthenticatedRequestLike } from "../../src/modules/auth/auth.access.helpers";
import { FinanceEntriesReadController } from "../../src/modules/read-side/finance/finance-entry.read.controller";
import type {
  GetFinanceEntryDetailUseCase,
  ListFinanceEntriesUseCase
} from "../../src/modules/read-side/finance/finance-entry.read.use-cases";

function build_request(
  userId: string,
  roleCodes: string[]
): AuthenticatedRequestLike & { auth: { user: { userId: string; roleCodes: string[] } } } {
  return {
    auth: {
      user: {
        userId,
        roleCodes
      },
      session: {
        sessionId: "session_1",
        issuedAt: "2026-04-11T00:00:00.000Z",
        refreshExpiresAt: "2026-04-12T00:00:00.000Z"
      }
    }
  } as unknown as AuthenticatedRequestLike & {
    auth: { user: { userId: string; roleCodes: string[] } };
  };
}

describe("finance entries read controller", () => {
  it("lists finance entries with query filters and actor-bound scope", async () => {
    const listUseCase = {
      execute: vi.fn().mockResolvedValue({
        items: [],
        pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 }
      })
    } as unknown as ListFinanceEntriesUseCase;
    const detailUseCase = {
      execute: vi.fn()
    } as unknown as GetFinanceEntryDetailUseCase;
    const controller = new FinanceEntriesReadController(listUseCase, detailUseCase);
    const request = build_request("seller_1", ["seller"]);

    const result = await controller.list(
      {
        entryType: ["income"],
        orderId: "11111111-1111-4111-8111-111111111111",
        paymentId: "22222222-2222-4222-8222-222222222222",
        expenseId: "33333333-3333-4333-8333-333333333333",
        marketingExpenseId: "44444444-4444-4444-8444-444444444444"
      },
      request
    );

    expect(listUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        pageSize: 20,
        sortField: "recognizedAt",
        sortDirection: "desc",
        status: ["income"],
        contract: expect.objectContaining({
          filters: expect.arrayContaining([
            { field: "entryType", operator: "eq", value: "income" },
            {
              field: "orderId",
              operator: "eq",
              value: "11111111-1111-4111-8111-111111111111"
            },
            {
              field: "paymentId",
              operator: "eq",
              value: "22222222-2222-4222-8222-222222222222"
            },
            {
              field: "expenseId",
              operator: "eq",
              value: "33333333-3333-4333-8333-333333333333"
            },
            {
              field: "marketingExpenseId",
              operator: "eq",
              value: "44444444-4444-4444-8444-444444444444"
            }
          ])
        })
      }),
      request.auth.user
    );
    expect(result.meta.pagination.mode).toBe("page");
  });

  it("returns finance entry detail payload", async () => {
    const listUseCase = {
      execute: vi.fn()
    } as unknown as ListFinanceEntriesUseCase;
    const detailUseCase = {
      execute: vi.fn().mockResolvedValue({
        id: "fin_1",
        entryType: "income"
      })
    } as unknown as GetFinanceEntryDetailUseCase;
    const controller = new FinanceEntriesReadController(listUseCase, detailUseCase);
    const request = build_request("finance_1", ["finance"]);

    const result = await controller.detail("fin_1", request);

    expect(detailUseCase.execute).toHaveBeenCalledWith("fin_1", false, request.auth.user);
    expect(result).toEqual({
      data: {
        id: "fin_1",
        entryType: "income"
      }
    });
  });

  it("keeps read access baseline role matrix for finance entries surface", () => {
    const requirements = Reflect.getMetadata(auth_access_metadata_key, FinanceEntriesReadController) as {
      authenticated?: boolean;
      requiredRoleCodes?: string[];
    };

    expect(requirements?.authenticated).toBe(true);
    expect(requirements?.requiredRoleCodes).toEqual(["seller", "finance", "admin", "ceo"]);
  });
});
