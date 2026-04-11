import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { auth_access_metadata_key } from "../../src/modules/auth/auth.access.contract";
import type { AuthenticatedRequestLike } from "../../src/modules/auth/auth.access.helpers";
import { PaymentsReadController } from "../../src/modules/read-side/payments/payment.read.controller";
import type {
  GetPaymentDetailUseCase,
  ListPaymentsUseCase
} from "../../src/modules/read-side/payments/payment.read.use-cases";

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
        issuedAt: "2026-04-10T00:00:00.000Z",
        refreshExpiresAt: "2026-04-11T00:00:00.000Z"
      }
    }
  } as unknown as AuthenticatedRequestLike & {
    auth: { user: { userId: string; roleCodes: string[] } };
  };
}

describe("payments read controller", () => {
  it("lists payments with normalized envelope and actor-bound scope", async () => {
    const listUseCase = {
      execute: vi.fn().mockResolvedValue({
        items: [],
        pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 }
      })
    } as unknown as ListPaymentsUseCase;
    const detailUseCase = {
      execute: vi.fn()
    } as unknown as GetPaymentDetailUseCase;
    const controller = new PaymentsReadController(listUseCase, detailUseCase);
    const request = build_request("seller_1", ["seller"]);

    const result = await controller.list({}, request);

    expect(listUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        pageSize: 20,
        sortField: "createdAt",
        sortDirection: "desc"
      }),
      request.auth.user
    );
    expect(result.meta.pagination.mode).toBe("page");
  });

  it("returns payment detail payload", async () => {
    const listUseCase = {
      execute: vi.fn()
    } as unknown as ListPaymentsUseCase;
    const detailUseCase = {
      execute: vi.fn().mockResolvedValue({
        id: "pay_1",
        status: "pending"
      })
    } as unknown as GetPaymentDetailUseCase;
    const controller = new PaymentsReadController(listUseCase, detailUseCase);
    const request = build_request("finance_1", ["finance"]);

    const result = await controller.detail("pay_1", request);

    expect(detailUseCase.execute).toHaveBeenCalledWith("pay_1", false, request.auth.user);
    expect(result).toEqual({
      data: {
        id: "pay_1",
        status: "pending"
      }
    });
  });

  it("keeps read access baseline role matrix for payments surface", () => {
    const requirements = Reflect.getMetadata(auth_access_metadata_key, PaymentsReadController) as {
      authenticated?: boolean;
      requiredRoleCodes?: string[];
    };

    expect(requirements?.authenticated).toBe(true);
    expect(requirements?.requiredRoleCodes).toEqual([
      "seller",
      "warehouse",
      "logistics",
      "finance",
      "admin",
      "ceo"
    ]);
  });
});

