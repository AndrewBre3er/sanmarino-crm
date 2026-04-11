import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { auth_access_metadata_key } from "../../src/modules/auth/auth.access.contract";
import type { AuthenticatedRequestLike } from "../../src/modules/auth/auth.access.helpers";
import { ExpensesController } from "../../src/modules/finance/expenses.controller";
import type { FinanceService } from "../../src/modules/finance/finance.service";

function build_request(
  userId: string,
  roleCodes: string[],
  idempotencyKey?: string
): AuthenticatedRequestLike & { auth: { user: { userId: string; roleCodes: string[] } } } {
  return {
    auth: {
      user: {
        userId,
        roleCodes
      },
      session: {
        sessionId: "session_1",
        issuedAt: "2026-04-12T00:00:00.000Z",
        refreshExpiresAt: "2026-04-13T00:00:00.000Z"
      }
    },
    ...(idempotencyKey
      ? {
          shellContext: {
            idempotencyKey
          }
        }
      : {})
  } as unknown as AuthenticatedRequestLike & {
    auth: { user: { userId: string; roleCodes: string[] } };
  };
}

describe("expenses controller", () => {
  it("lists expenses with normalized envelope", async () => {
    const financeService = {
      listExpenses: vi.fn().mockResolvedValue({
        items: [],
        pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 }
      }),
      getExpense: vi.fn(),
      createExpense: vi.fn(),
      updateExpense: vi.fn(),
      listMarketingExpenses: vi.fn(),
      getMarketingExpense: vi.fn(),
      createMarketingExpense: vi.fn(),
      updateMarketingExpense: vi.fn()
    } as unknown as FinanceService;
    const controller = new ExpensesController(financeService);
    const request = build_request("finance_1", ["finance"]);

    const result = await controller.list({}, request);

    expect(financeService.listExpenses).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        pageSize: 20,
        sortField: "occurredAt",
        sortDirection: "desc"
      }),
      request.auth.user
    );
    expect(result.meta.pagination.mode).toBe("page");
  });

  it("returns expense detail payload", async () => {
    const financeService = {
      listExpenses: vi.fn(),
      getExpense: vi.fn().mockResolvedValue({ id: "exp_1", expenseType: "operational" }),
      createExpense: vi.fn(),
      updateExpense: vi.fn(),
      listMarketingExpenses: vi.fn(),
      getMarketingExpense: vi.fn(),
      createMarketingExpense: vi.fn(),
      updateMarketingExpense: vi.fn()
    } as unknown as FinanceService;
    const controller = new ExpensesController(financeService);
    const request = build_request("admin_1", ["admin"]);

    const result = await controller.detail("exp_1", request);

    expect(financeService.getExpense).toHaveBeenCalledWith("exp_1", request.auth.user);
    expect(result).toEqual({ data: { id: "exp_1", expenseType: "operational" } });
  });

  it("calls create/update commands", async () => {
    const financeService = {
      listExpenses: vi.fn(),
      getExpense: vi.fn(),
      createExpense: vi.fn().mockResolvedValue({ id: "exp_1" }),
      updateExpense: vi.fn().mockResolvedValue({ id: "exp_1" }),
      listMarketingExpenses: vi.fn(),
      getMarketingExpense: vi.fn(),
      createMarketingExpense: vi.fn(),
      updateMarketingExpense: vi.fn()
    } as unknown as FinanceService;
    const controller = new ExpensesController(financeService);
    const request = build_request("ceo_1", ["ceo"], "idem-exp-1");

    await controller.create(
      {
        expenseType: "operational",
        amount: "1000.00",
        occurredAt: "2026-04-12T10:00:00.000Z"
      },
      request
    );
    await controller.patch("exp_1", { description: "updated" }, request);

    expect(financeService.createExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        expenseType: "operational",
        amount: "1000.00",
        occurredAt: "2026-04-12T10:00:00.000Z"
      }),
      request.auth.user,
      expect.objectContaining({
        idempotencyKey: "idem-exp-1"
      })
    );
    expect(financeService.updateExpense).toHaveBeenCalledWith(
      "exp_1",
      { description: "updated" },
      request.auth.user,
      expect.objectContaining({
        idempotencyKey: "idem-exp-1"
      })
    );
  });

  it("requires Idempotency-Key for create and patch", async () => {
    const financeService = {
      listExpenses: vi.fn(),
      getExpense: vi.fn(),
      createExpense: vi.fn(),
      updateExpense: vi.fn(),
      listMarketingExpenses: vi.fn(),
      getMarketingExpense: vi.fn(),
      createMarketingExpense: vi.fn(),
      updateMarketingExpense: vi.fn()
    } as unknown as FinanceService;
    const controller = new ExpensesController(financeService);
    const request = build_request("finance_1", ["finance"]);

    await expect(
      controller.create(
        {
          expenseType: "operational",
          amount: "1000.00",
          occurredAt: "2026-04-12T10:00:00.000Z"
        },
        request
      )
    ).rejects.toMatchObject({
      response: {
        code: "VALIDATION_ERROR"
      }
    });

    await expect(controller.patch("exp_1", { description: "x" }, request)).rejects.toMatchObject({
      response: {
        code: "VALIDATION_ERROR"
      }
    });
  });

  it("keeps finance/admin/ceo role matrix for expenses surface", () => {
    const requirements = Reflect.getMetadata(auth_access_metadata_key, ExpensesController) as {
      authenticated?: boolean;
      requiredRoleCodes?: string[];
    };

    expect(requirements?.authenticated).toBe(true);
    expect(requirements?.requiredRoleCodes).toEqual(["finance", "admin", "ceo"]);
  });
});
