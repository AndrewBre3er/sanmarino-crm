import "reflect-metadata";
import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { auth_access_metadata_key } from "../../src/modules/auth/auth.access.contract";
import type { AuthenticatedRequestLike } from "../../src/modules/auth/auth.access.helpers";
import { PaymentsController } from "../../src/modules/payments/payments.controller";
import type { PaymentsService } from "../../src/modules/payments/payments.service";

function build_request(
  userId: string,
  roleCodes: string[],
  idempotencyKey?: string
): AuthenticatedRequestLike & {
  auth: { user: { userId: string; roleCodes: string[] } };
  shellContext?: {
    requestId: string;
    correlationId: string;
    idempotencyKey: string;
  };
} {
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
    },
    ...(idempotencyKey
      ? {
          shellContext: {
            requestId: "req_0000000000000001",
            correlationId: "corr_0000000000001",
            idempotencyKey
          }
        }
      : {})
  } as unknown as AuthenticatedRequestLike & {
    auth: { user: { userId: string; roleCodes: string[] } };
    shellContext?: {
      requestId: string;
      correlationId: string;
      idempotencyKey: string;
    };
  };
}

function build_service_mock() {
  return {
    intakeExternalPaymentFact: vi.fn().mockResolvedValue({ id: "pay_1", status: "pending" }),
    confirmExternalPaymentFact: vi.fn().mockResolvedValue({ id: "pay_1", status: "completed" }),
    rejectExternalPaymentFact: vi.fn().mockResolvedValue({ id: "pay_1", status: "rejected" }),
    refundPayment: vi.fn()
  } as unknown as PaymentsService;
}

describe("payments controller", () => {
  it("intakes external payment fact with idempotency command context", async () => {
    const service = build_service_mock();
    const controller = new PaymentsController(service);
    const request = build_request("finance_1", ["finance"], "idem_intake_1");

    const payload = {
      orderId: "27d1ff9b-af56-4d8b-b662-c11ab5b949da",
      amount: "2000.00",
      paymentMethod: "cash" as const,
      externalSource: "bank" as const,
      externalEventId: "bank_evt_42",
      externalRef: "ext-42"
    };

    const result = await controller.intakeExternalFact(payload, request);

    expect(service.intakeExternalPaymentFact).toHaveBeenCalledWith(
      {
        orderId: payload.orderId,
        amount: payload.amount,
        paymentMethod: payload.paymentMethod,
        externalSource: payload.externalSource,
        externalEventId: payload.externalEventId,
        externalReference: payload.externalRef
      },
      request.auth.user,
      expect.objectContaining({
        idempotencyKey: "idem_intake_1",
        requestId: "req_0000000000000001",
        correlationId: "corr_0000000000001"
      })
    );
    expect(result).toEqual({
      data: {
        id: "pay_1",
        status: "pending"
      }
    });
  });

  it("confirms external payment fact with idempotency command context", async () => {
    const service = build_service_mock();
    const controller = new PaymentsController(service);
    const request = build_request("finance_1", ["finance"], "idem_confirm_1");

    const result = await controller.confirmExternalFact("pay_1", request);

    expect(service.confirmExternalPaymentFact).toHaveBeenCalledWith(
      "pay_1",
      request.auth.user,
      expect.objectContaining({
        idempotencyKey: "idem_confirm_1"
      })
    );
    expect(result).toEqual({
      data: {
        id: "pay_1",
        status: "completed"
      }
    });
  });

  it("rejects external payment fact without cash or finance command payload", async () => {
    const service = build_service_mock();
    const controller = new PaymentsController(service);
    const request = build_request("finance_1", ["finance"], "idem_reject_1");

    const result = await controller.rejectExternalFact(
      "pay_1",
      { reason: "Bank statement mismatch" },
      request
    );

    expect(service.rejectExternalPaymentFact).toHaveBeenCalledWith(
      "pay_1",
      { reason: "Bank statement mismatch" },
      request.auth.user,
      expect.objectContaining({
        idempotencyKey: "idem_reject_1"
      })
    );
    expect(result).toEqual({
      data: {
        id: "pay_1",
        status: "rejected"
      }
    });
  });

  it("creates refund with required ReturnRequest linkage and idempotency context", async () => {
    const service = build_service_mock();
    (service.refundPayment as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "pay_1",
      status: "completed",
      refundedAmount: "500.00"
    });
    const controller = new PaymentsController(service);
    const request = build_request("finance_1", ["finance"], "idem_refund_1");

    const payload = {
      amount: "500.00",
      returnRequestId: "6bb4774e-6d67-4e7f-9692-af0cf356ff9e",
      reason: "Customer return"
    };

    const result = await controller.refund("pay_1", payload, request);

    expect(service.refundPayment).toHaveBeenCalledWith(
      "pay_1",
      payload,
      request.auth.user,
      expect.objectContaining({
        idempotencyKey: "idem_refund_1",
        requestId: "req_0000000000000001",
        correlationId: "corr_0000000000001"
      })
    );
    expect(result).toEqual({
      data: {
        id: "pay_1",
        status: "completed",
        refundedAmount: "500.00"
      }
    });
  });

  it("requires idempotency key for intake command", async () => {
    const service = build_service_mock();
    const controller = new PaymentsController(service);
    const request = build_request("finance_1", ["finance"]);

    await expect(
      controller.intakeExternalFact(
        {
          orderId: "27d1ff9b-af56-4d8b-b662-c11ab5b949da",
          amount: "1500.00",
          paymentMethod: "cash",
          externalSource: "bank",
          externalEventId: "bank_evt_42"
        },
        request
      )
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(service.intakeExternalPaymentFact).not.toHaveBeenCalled();
  });

  it("requires idempotency key for confirm command", async () => {
    const service = build_service_mock();
    const controller = new PaymentsController(service);
    const request = build_request("finance_1", ["finance"]);

    await expect(controller.confirmExternalFact("pay_1", request)).rejects.toBeInstanceOf(
      BadRequestException
    );
    expect(service.confirmExternalPaymentFact).not.toHaveBeenCalled();
  });

  it("requires idempotency key for reject command", async () => {
    const service = build_service_mock();
    const controller = new PaymentsController(service);
    const request = build_request("finance_1", ["finance"]);

    await expect(
      controller.rejectExternalFact("pay_1", { reason: "Mismatch" }, request)
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(service.rejectExternalPaymentFact).not.toHaveBeenCalled();
  });

  it("requires idempotency key for refund command", async () => {
    const service = build_service_mock();
    const controller = new PaymentsController(service);
    const request = build_request("finance_1", ["finance"]);

    await expect(
      controller.refund(
        "pay_1",
        {
          amount: "500.00",
          returnRequestId: "6bb4774e-6d67-4e7f-9692-af0cf356ff9e"
        },
        request
      )
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(service.refundPayment).not.toHaveBeenCalled();
  });

  it("keeps command access baseline role matrix for external payment facts", () => {
    const classRequirements = Reflect.getMetadata(auth_access_metadata_key, PaymentsController) as {
      authenticated?: boolean;
      requiredRoleCodes?: string[];
    };
    const intakeRequirements = Reflect.getMetadata(
      auth_access_metadata_key,
      PaymentsController.prototype.intakeExternalFact
    ) as {
      authenticated?: boolean;
      requiredRoleCodes?: string[];
    };
    const confirmRequirements = Reflect.getMetadata(
      auth_access_metadata_key,
      PaymentsController.prototype.confirmExternalFact
    ) as {
      authenticated?: boolean;
      requiredRoleCodes?: string[];
    };
    const rejectRequirements = Reflect.getMetadata(
      auth_access_metadata_key,
      PaymentsController.prototype.rejectExternalFact
    ) as {
      authenticated?: boolean;
      requiredRoleCodes?: string[];
    };
    const refundRequirements = Reflect.getMetadata(
      auth_access_metadata_key,
      PaymentsController.prototype.refund
    ) as {
      authenticated?: boolean;
      requiredRoleCodes?: string[];
    };

    expect(classRequirements?.requiredRoleCodes).toEqual(["finance", "admin", "ceo"]);
    expect(intakeRequirements?.requiredRoleCodes).toEqual(["finance", "admin", "ceo"]);
    expect(confirmRequirements?.requiredRoleCodes).toEqual(["finance", "admin", "ceo"]);
    expect(rejectRequirements?.requiredRoleCodes).toEqual(["finance", "admin", "ceo"]);
    expect(refundRequirements?.requiredRoleCodes).toEqual(["finance", "admin", "ceo"]);
  });
});
