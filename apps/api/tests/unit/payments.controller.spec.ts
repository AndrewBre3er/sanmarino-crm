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

describe("payments controller", () => {
  it("creates payment with idempotency command context", async () => {
    const service = {
      createPayment: vi.fn().mockResolvedValue({ id: "pay_1", status: "pending" }),
      completePayment: vi.fn(),
      refundPayment: vi.fn()
    } as unknown as PaymentsService;
    const controller = new PaymentsController(service);
    const request = build_request("finance_1", ["finance"], "idem_create_1");

    const payload = {
      orderId: "27d1ff9b-af56-4d8b-b662-c11ab5b949da",
      amount: "2000.00",
      paymentMethod: "cash" as const,
      externalRef: "ext-42"
    };

    const result = await controller.create(payload, request);

    expect(service.createPayment).toHaveBeenCalledWith(
      {
        orderId: payload.orderId,
        amount: payload.amount,
        paymentMethod: payload.paymentMethod,
        externalReference: payload.externalRef
      },
      request.auth.user,
      expect.objectContaining({
        idempotencyKey: "idem_create_1",
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

  it("completes payment with idempotency command context", async () => {
    const service = {
      createPayment: vi.fn(),
      completePayment: vi.fn().mockResolvedValue({ id: "pay_1", status: "completed" }),
      refundPayment: vi.fn()
    } as unknown as PaymentsService;
    const controller = new PaymentsController(service);
    const request = build_request("finance_1", ["finance"], "idem_complete_1");

    const result = await controller.complete("pay_1", request);

    expect(service.completePayment).toHaveBeenCalledWith(
      "pay_1",
      request.auth.user,
      expect.objectContaining({
        idempotencyKey: "idem_complete_1"
      })
    );
    expect(result).toEqual({
      data: {
        id: "pay_1",
        status: "completed"
      }
    });
  });

  it("creates refund with required ReturnRequest linkage and idempotency context", async () => {
    const service = {
      createPayment: vi.fn(),
      completePayment: vi.fn(),
      refundPayment: vi.fn().mockResolvedValue({
        id: "pay_1",
        status: "completed",
        refundedAmount: "500.00"
      })
    } as unknown as PaymentsService;
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

  it("requires idempotency key for create command", async () => {
    const service = {
      createPayment: vi.fn(),
      completePayment: vi.fn(),
      refundPayment: vi.fn()
    } as unknown as PaymentsService;
    const controller = new PaymentsController(service);
    const request = build_request("finance_1", ["finance"]);

    await expect(
      controller.create(
        {
          orderId: "27d1ff9b-af56-4d8b-b662-c11ab5b949da",
          amount: "1500.00",
          paymentMethod: "cash"
        },
        request
      )
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(service.createPayment).not.toHaveBeenCalled();
  });

  it("requires idempotency key for complete command", async () => {
    const service = {
      createPayment: vi.fn(),
      completePayment: vi.fn(),
      refundPayment: vi.fn()
    } as unknown as PaymentsService;
    const controller = new PaymentsController(service);
    const request = build_request("finance_1", ["finance"]);

    await expect(controller.complete("pay_1", request)).rejects.toBeInstanceOf(BadRequestException);
    expect(service.completePayment).not.toHaveBeenCalled();
  });

  it("requires idempotency key for refund command", async () => {
    const service = {
      createPayment: vi.fn(),
      completePayment: vi.fn(),
      refundPayment: vi.fn()
    } as unknown as PaymentsService;
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

  it("keeps command access baseline role matrix for payments", () => {
    const classRequirements = Reflect.getMetadata(auth_access_metadata_key, PaymentsController) as {
      authenticated?: boolean;
      requiredRoleCodes?: string[];
    };
    const createRequirements = Reflect.getMetadata(
      auth_access_metadata_key,
      PaymentsController.prototype.create
    ) as {
      authenticated?: boolean;
      requiredRoleCodes?: string[];
    };
    const completeRequirements = Reflect.getMetadata(
      auth_access_metadata_key,
      PaymentsController.prototype.complete
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

    expect(classRequirements?.requiredRoleCodes).toEqual(["warehouse", "finance", "admin", "ceo"]);
    expect(createRequirements?.requiredRoleCodes).toEqual([
      "warehouse",
      "finance",
      "admin",
      "ceo"
    ]);
    expect(completeRequirements?.requiredRoleCodes).toEqual(["finance", "admin", "ceo"]);
    expect(refundRequirements?.requiredRoleCodes).toEqual(["finance", "admin", "ceo"]);
  });
});
