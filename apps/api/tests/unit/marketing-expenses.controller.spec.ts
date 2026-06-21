import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { auth_access_metadata_key } from "../../src/modules/auth/auth.access.contract";
import type { AuthenticatedRequestLike } from "../../src/modules/auth/auth.access.helpers";
import { MarketingExpensesController } from "../../src/modules/finance/marketing-expenses.controller";
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

describe("marketing expenses controller", () => {
  it("lists marketing expenses with normalized envelope", async () => {
    const financeService = {
      listExpenses: vi.fn(),
      getExpense: vi.fn(),
      createExpense: vi.fn(),
      updateExpense: vi.fn(),
      listMarketingExpenses: vi.fn().mockResolvedValue({
        items: [],
        pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 }
      }),
      getMarketingExpense: vi.fn(),
      createMarketingExpense: vi.fn(),
      updateMarketingExpense: vi.fn()
    } as unknown as FinanceService;
    const controller = new MarketingExpensesController(financeService);
    const request = build_request("finance_1", ["finance"]);

    const result = await controller.list({}, request);

    expect(financeService.listMarketingExpenses).toHaveBeenCalledWith(
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

  it("returns marketing expense detail payload", async () => {
    const financeService = {
      listExpenses: vi.fn(),
      getExpense: vi.fn(),
      createExpense: vi.fn(),
      updateExpense: vi.fn(),
      listMarketingExpenses: vi.fn(),
      getMarketingExpense: vi.fn().mockResolvedValue({ id: "mexp_1", source: "avito" }),
      createMarketingExpense: vi.fn(),
      updateMarketingExpense: vi.fn()
    } as unknown as FinanceService;
    const controller = new MarketingExpensesController(financeService);
    const request = build_request("admin_1", ["admin"]);

    const result = await controller.detail("mexp_1", request);

    expect(financeService.getMarketingExpense).toHaveBeenCalledWith("mexp_1", request.auth.user);
    expect(result).toEqual({ data: { id: "mexp_1", source: "avito" } });
  });

  it("calls create/update commands", async () => {
    const financeService = {
      listExpenses: vi.fn(),
      getExpense: vi.fn(),
      createExpense: vi.fn(),
      updateExpense: vi.fn(),
      listMarketingExpenses: vi.fn(),
      getMarketingExpense: vi.fn(),
      createMarketingExpense: vi.fn().mockResolvedValue({ id: "mexp_1" }),
      updateMarketingExpense: vi.fn().mockResolvedValue({ id: "mexp_1" })
    } as unknown as FinanceService;
    const controller = new MarketingExpensesController(financeService);
    const request = build_request("ceo_1", ["ceo"], "idem-mexp-1");

    await controller.create(
      {
        source: "avito",
        amount: "2500.00",
        occurredAt: "2026-04-12T11:00:00.000Z"
      },
      request
    );
    await controller.patch("mexp_1", { campaign: "spring-2026" }, request);

    expect(financeService.createMarketingExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "avito",
        amount: "2500.00",
        occurredAt: "2026-04-12T11:00:00.000Z"
      }),
      request.auth.user,
      expect.objectContaining({
        idempotencyKey: "idem-mexp-1"
      })
    );
    expect(financeService.updateMarketingExpense).toHaveBeenCalledWith(
      "mexp_1",
      { campaign: "spring-2026" },
      request.auth.user,
      expect.objectContaining({
        idempotencyKey: "idem-mexp-1"
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
    const controller = new MarketingExpensesController(financeService);
    const request = build_request("finance_1", ["finance"]);

    await expect(
      controller.create(
        {
          source: "avito",
          amount: "2500.00",
          occurredAt: "2026-04-12T11:00:00.000Z"
        },
        request
      )
    ).rejects.toMatchObject({
      response: {
        code: "VALIDATION_ERROR"
      }
    });

    await expect(controller.patch("mexp_1", { campaign: "x" }, request)).rejects.toMatchObject({
      response: {
        code: "VALIDATION_ERROR"
      }
    });
  });

  it("keeps finance/admin/ceo role matrix for marketing expenses surface", () => {
    const requirements = Reflect.getMetadata(auth_access_metadata_key, MarketingExpensesController) as {
      authenticated?: boolean;
      requiredRoleCodes?: string[];
    };

    expect(requirements?.authenticated).toBe(true);
    expect(requirements?.requiredRoleCodes).toEqual(["finance", "admin", "ceo"]);
  });
});
