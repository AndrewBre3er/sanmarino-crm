import { createHash } from "node:crypto";
import { ConflictException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { PaymentsService } from "../../src/modules/payments/payments.service";
import type { PrismaPaymentsPaymentReadRepository } from "../../src/modules/read-side/payments/payment.read.repository";
import type { PrismaService } from "../../src/prisma/prisma.service";

function build_payment_read_model(status: "pending" | "completed" = "pending") {
  return {
    id: "pay_1",
    paymentNumber: "PAY-1",
    orderId: "order_1",
    status,
    paymentMethod: "cash",
    amount: "2000.00",
    refundedAmount: "0.00",
    receivedAt: status === "completed" ? new Date().toISOString() : null,
    externalReference: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    deletedAt: null,
    deletedBy: null,
    deleteReason: null,
    isDeleted: false
  };
}

function create_prisma_mock() {
  const ordersOrderFindFirst = vi.fn();
  const paymentsPaymentFindFirst = vi.fn();
  const paymentsPaymentCreate = vi.fn();
  const paymentsPaymentUpdate = vi.fn();
  const systemIdempotencyRecordFindUnique = vi.fn();
  const systemIdempotencyRecordCreate = vi.fn();
  const systemIdempotencyRecordUpdate = vi.fn();

  const transactionClient = {
    ordersOrder: {
      findFirst: ordersOrderFindFirst
    },
    paymentsPayment: {
      findFirst: paymentsPaymentFindFirst,
      create: paymentsPaymentCreate,
      update: paymentsPaymentUpdate
    },
    systemIdempotencyRecord: {
      update: systemIdempotencyRecordUpdate
    }
  };

  const prismaService = {
    ordersOrder: {
      findFirst: ordersOrderFindFirst
    },
    paymentsPayment: {
      findFirst: paymentsPaymentFindFirst,
      create: paymentsPaymentCreate,
      update: paymentsPaymentUpdate
    },
    systemIdempotencyRecord: {
      findUnique: systemIdempotencyRecordFindUnique,
      create: systemIdempotencyRecordCreate,
      update: systemIdempotencyRecordUpdate
    },
    $transaction: vi.fn(async (arg: unknown) => {
      if (typeof arg === "function") {
        return (arg as (client: typeof transactionClient) => Promise<unknown>)(transactionClient);
      }

      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }

      throw new Error("Unsupported transaction call");
    })
  } as unknown as PrismaService;

  return {
    prismaService,
    ordersOrderFindFirst,
    paymentsPaymentFindFirst,
    paymentsPaymentCreate,
    paymentsPaymentUpdate,
    systemIdempotencyRecordFindUnique,
    systemIdempotencyRecordCreate,
    systemIdempotencyRecordUpdate
  };
}

function create_service_with_mocks() {
  const prisma = create_prisma_mock();
  const paymentReadRepository = {
    getById: vi.fn(),
    list: vi.fn()
  } as unknown as PrismaPaymentsPaymentReadRepository;
  const service = new PaymentsService(prisma.prismaService, paymentReadRepository);

  return {
    service,
    paymentReadRepository,
    ...prisma
  };
}

describe("payments service", () => {
  it("creates payment and persists createdBy actor linkage", async () => {
    const {
      service,
      paymentReadRepository,
      ordersOrderFindFirst,
      paymentsPaymentCreate,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate
    } = create_service_with_mocks();

    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_create_0" });
    ordersOrderFindFirst.mockResolvedValue({ id: "order_1" });
    paymentsPaymentCreate.mockResolvedValue({ id: "pay_1" });
    (paymentReadRepository.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      build_payment_read_model("pending")
    );

    const result = await service.createPayment(
      {
        orderId: "order_1",
        amount: "2000.00",
        paymentMethod: "cash"
      },
      {
        userId: "finance_1",
        roleCodes: ["finance"]
      },
      {
        idempotencyKey: "idem_create_0"
      }
    );

    expect(result.id).toBe("pay_1");
    expect(paymentsPaymentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          createdByUser: {
            connect: {
              id: "finance_1"
            }
          }
        })
      })
    );
  });

  it("replays idempotent create without second mutation", async () => {
    const {
      service,
      paymentReadRepository,
      paymentsPaymentCreate,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate
    } = create_service_with_mocks();

    const requestHash = createHash("sha256")
      .update(
        JSON.stringify({
          orderId: "order_1",
          amount: "2000.00",
          paymentMethod: "cash",
          externalReference: null
        })
      )
      .digest("hex");
    systemIdempotencyRecordFindUnique.mockResolvedValue({
      id: "idem_1",
      requestHash,
      status: "COMPLETED",
      lockedUntil: null,
      responseBody: { paymentId: "pay_1" }
    });
    (paymentReadRepository.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      build_payment_read_model("pending")
    );

    const result = await service.createPayment(
      {
        orderId: "order_1",
        amount: "2000.00",
        paymentMethod: "cash"
      },
      {
        userId: "finance_1",
        roleCodes: ["finance"]
      },
      {
        idempotencyKey: "idem_create_1"
      }
    );

    expect(result.id).toBe("pay_1");
    expect(paymentsPaymentCreate).not.toHaveBeenCalled();
    expect(systemIdempotencyRecordCreate).not.toHaveBeenCalled();
  });

  it("replays idempotent complete without second state transition", async () => {
    const {
      service,
      paymentReadRepository,
      paymentsPaymentUpdate,
      systemIdempotencyRecordFindUnique
    } = create_service_with_mocks();

    const requestHash = createHash("sha256")
      .update(JSON.stringify({ paymentId: "pay_1" }))
      .digest("hex");
    systemIdempotencyRecordFindUnique.mockResolvedValue({
      id: "idem_2",
      requestHash,
      status: "COMPLETED",
      lockedUntil: null,
      responseBody: { paymentId: "pay_1" }
    });
    (paymentReadRepository.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      build_payment_read_model("completed")
    );

    const result = await service.completePayment(
      "pay_1",
      {
        userId: "finance_1",
        roleCodes: ["finance"]
      },
      {
        idempotencyKey: "idem_complete_1"
      }
    );

    expect(result.status).toBe("completed");
    expect(paymentsPaymentUpdate).not.toHaveBeenCalled();
  });

  it("blocks invalid complete transition when payment is already completed", async () => {
    const {
      service,
      paymentsPaymentFindFirst,
      paymentsPaymentUpdate,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate,
      systemIdempotencyRecordUpdate
    } = create_service_with_mocks();

    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_3" });
    paymentsPaymentFindFirst.mockResolvedValue({
      id: "pay_1",
      status: "COMPLETED",
      receivedAt: new Date("2026-04-10T10:00:00.000Z")
    });

    await expect(
      service.completePayment(
        "pay_1",
        {
          userId: "finance_1",
          roleCodes: ["finance"]
        },
        {
          idempotencyKey: "idem_complete_2"
        }
      )
    ).rejects.toBeInstanceOf(ConflictException);

    expect(paymentsPaymentUpdate).not.toHaveBeenCalled();
    expect(systemIdempotencyRecordUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED"
        })
      })
    );
  });

  it("returns idempotency conflict when same key is reused with different payload", async () => {
    const {
      service,
      ordersOrderFindFirst,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate
    } = create_service_with_mocks();

    systemIdempotencyRecordFindUnique.mockResolvedValue({
      id: "idem_4",
      requestHash: "another_hash",
      status: "COMPLETED",
      lockedUntil: null,
      responseBody: { paymentId: "pay_1" }
    });

    await expect(
      service.createPayment(
        {
          orderId: "order_1",
          amount: "2000.00",
          paymentMethod: "cash"
        },
        {
          userId: "finance_1",
          roleCodes: ["finance"]
        },
        {
          idempotencyKey: "idem_create_2"
        }
      )
    ).rejects.toBeInstanceOf(ConflictException);

    expect(ordersOrderFindFirst).not.toHaveBeenCalled();
    expect(systemIdempotencyRecordCreate).not.toHaveBeenCalled();
  });
});
