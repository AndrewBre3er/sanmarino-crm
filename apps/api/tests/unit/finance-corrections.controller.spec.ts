import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { auth_access_metadata_key } from "../../src/modules/auth/auth.access.contract";
import type { AuthenticatedRequestLike } from "../../src/modules/auth/auth.access.helpers";
import { FinanceCorrectionsController } from "../../src/modules/finance/finance-corrections.controller";
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
        issuedAt: "2026-04-30T00:00:00.000Z",
        refreshExpiresAt: "2026-05-01T00:00:00.000Z"
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

function build_service() {
  return {
    listManualCorrections: vi.fn().mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 }
    }),
    getManualCorrection: vi.fn().mockResolvedValue({ id: "corr_1" }),
    createManualCorrection: vi.fn().mockResolvedValue({ id: "corr_1" }),
    submitManualCorrectionForApproval: vi.fn().mockResolvedValue({ id: "corr_1" }),
    approveManualCorrection: vi.fn().mockResolvedValue({ id: "corr_1" }),
    rejectManualCorrection: vi.fn().mockResolvedValue({ id: "corr_1" }),
    applyManualCorrection: vi.fn().mockResolvedValue({ id: "corr_1" })
  } as unknown as FinanceService;
}

describe("finance corrections controller", () => {
  it("exposes list/detail through finance and ceo roles only", async () => {
    const financeService = build_service();
    const controller = new FinanceCorrectionsController(financeService);
    const request = build_request("finance_1", ["finance"]);

    await controller.list({}, request);
    await controller.detail("corr_1", request);

    expect(financeService.listManualCorrections).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        pageSize: 20,
        sortField: "createdAt",
        sortDirection: "desc"
      }),
      request.auth.user
    );
    expect(financeService.getManualCorrection).toHaveBeenCalledWith("corr_1", request.auth.user);

    const requirements = Reflect.getMetadata(
      auth_access_metadata_key,
      FinanceCorrectionsController
    ) as {
      authenticated?: boolean;
      requiredRoleCodes?: string[];
    };
    expect(requirements?.requiredRoleCodes).toEqual(["finance", "ceo"]);
  });

  it("routes create, submit, and apply commands with Idempotency-Key", async () => {
    const financeService = build_service();
    const controller = new FinanceCorrectionsController(financeService);
    const request = build_request("finance_1", ["finance"], "idem-corr-1");

    await controller.create(
      {
        amount: "125.50",
        currency: "RUB",
        recognizedAt: "2026-04-30T10:00:00.000Z",
        reason: "inventory finance mismatch",
        relatedOrderId: "11111111-1111-1111-1111-111111111111"
      },
      request
    );
    await controller.submitForApproval("corr_1", request);
    await controller.apply("corr_1", request);

    expect(financeService.createManualCorrection).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: "125.50",
        reason: "inventory finance mismatch"
      }),
      request.auth.user,
      expect.objectContaining({ idempotencyKey: "idem-corr-1" })
    );
    expect(financeService.submitManualCorrectionForApproval).toHaveBeenCalledWith(
      "corr_1",
      request.auth.user,
      expect.objectContaining({ idempotencyKey: "idem-corr-1" })
    );
    expect(financeService.applyManualCorrection).toHaveBeenCalledWith(
      "corr_1",
      request.auth.user,
      expect.objectContaining({ idempotencyKey: "idem-corr-1" })
    );

    const createRequirements = Reflect.getMetadata(
      auth_access_metadata_key,
      FinanceCorrectionsController.prototype.create
    ) as { requiredRoleCodes?: string[] };
    const submitRequirements = Reflect.getMetadata(
      auth_access_metadata_key,
      FinanceCorrectionsController.prototype.submitForApproval
    ) as { requiredRoleCodes?: string[] };
    const applyRequirements = Reflect.getMetadata(
      auth_access_metadata_key,
      FinanceCorrectionsController.prototype.apply
    ) as { requiredRoleCodes?: string[] };

    expect(createRequirements?.requiredRoleCodes).toEqual(["finance"]);
    expect(submitRequirements?.requiredRoleCodes).toEqual(["finance"]);
    expect(applyRequirements?.requiredRoleCodes).toEqual(["finance"]);
  });

  it("routes approve and reject commands through ceo role only", async () => {
    const financeService = build_service();
    const controller = new FinanceCorrectionsController(financeService);
    const request = build_request("ceo_1", ["ceo"], "idem-corr-approval");

    await controller.approve("corr_1", request);
    await controller.reject("corr_1", { reason: "incorrect amount" }, request);

    expect(financeService.approveManualCorrection).toHaveBeenCalledWith(
      "corr_1",
      request.auth.user,
      expect.objectContaining({ idempotencyKey: "idem-corr-approval" })
    );
    expect(financeService.rejectManualCorrection).toHaveBeenCalledWith(
      "corr_1",
      { reason: "incorrect amount" },
      request.auth.user,
      expect.objectContaining({ idempotencyKey: "idem-corr-approval" })
    );

    const approveRequirements = Reflect.getMetadata(
      auth_access_metadata_key,
      FinanceCorrectionsController.prototype.approve
    ) as { requiredRoleCodes?: string[] };
    const rejectRequirements = Reflect.getMetadata(
      auth_access_metadata_key,
      FinanceCorrectionsController.prototype.reject
    ) as { requiredRoleCodes?: string[] };

    expect(approveRequirements?.requiredRoleCodes).toEqual(["ceo"]);
    expect(rejectRequirements?.requiredRoleCodes).toEqual(["ceo"]);
  });

  it("requires Idempotency-Key for every POST command", async () => {
    const financeService = build_service();
    const controller = new FinanceCorrectionsController(financeService);
    const request = build_request("finance_1", ["finance"]);

    await expect(
      controller.create(
        {
          amount: "125.50",
          currency: "RUB",
          recognizedAt: "2026-04-30T10:00:00.000Z",
          reason: "inventory finance mismatch"
        },
        request
      )
    ).rejects.toMatchObject({ response: { code: "VALIDATION_ERROR" } });

    await expect(controller.submitForApproval("corr_1", request)).rejects.toMatchObject({
      response: { code: "VALIDATION_ERROR" }
    });
    await expect(controller.approve("corr_1", request)).rejects.toMatchObject({
      response: { code: "VALIDATION_ERROR" }
    });
    await expect(controller.reject("corr_1", { reason: "x" }, request)).rejects.toMatchObject({
      response: { code: "VALIDATION_ERROR" }
    });
    await expect(controller.apply("corr_1", request)).rejects.toMatchObject({
      response: { code: "VALIDATION_ERROR" }
    });
  });
});
