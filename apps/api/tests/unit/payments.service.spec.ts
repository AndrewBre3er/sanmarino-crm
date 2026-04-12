import { createHash } from "node:crypto";
import { ConflictException, NotFoundException } from "@nestjs/common";
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
  const ordersOrderUpdate = vi.fn();
  const paymentsPaymentFindFirst = vi.fn();
  const paymentsPaymentCreate = vi.fn();
  const paymentsPaymentUpdate = vi.fn();
  const paymentsPaymentAggregate = vi.fn();
  const paymentsCashOperationCreate = vi.fn();
  const financeFinanceEntryCreate = vi.fn();
  const systemIdempotencyRecordFindUnique = vi.fn();
  const systemIdempotencyRecordCreate = vi.fn();
  const systemIdempotencyRecordUpdate = vi.fn();

  const transactionClient = {
    ordersOrder: {
      findFirst: ordersOrderFindFirst,
      update: ordersOrderUpdate
    },
    paymentsPayment: {
      findFirst: paymentsPaymentFindFirst,
      create: paymentsPaymentCreate,
      update: paymentsPaymentUpdate,
      aggregate: paymentsPaymentAggregate
    },
    paymentsCashOperation: {
      create: paymentsCashOperationCreate
    },
    financeFinanceEntry: {
      create: financeFinanceEntryCreate
    },
    systemIdempotencyRecord: {
      update: systemIdempotencyRecordUpdate
    }
  };

  const prismaService = {
    ordersOrder: {
      findFirst: ordersOrderFindFirst,
      update: ordersOrderUpdate
    },
    paymentsPayment: {
      findFirst: paymentsPaymentFindFirst,
      create: paymentsPaymentCreate,
      update: paymentsPaymentUpdate,
      aggregate: paymentsPaymentAggregate
    },
    paymentsCashOperation: {
      create: paymentsCashOperationCreate
    },
    financeFinanceEntry: {
      create: financeFinanceEntryCreate
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
    ordersOrderUpdate,
    paymentsPaymentFindFirst,
    paymentsPaymentCreate,
    paymentsPaymentUpdate,
    paymentsPaymentAggregate,
    paymentsCashOperationCreate,
    financeFinanceEntryCreate,
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
      paymentsCashOperationCreate,
      financeFinanceEntryCreate,
      ordersOrderUpdate,
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
    expect(paymentsCashOperationCreate).not.toHaveBeenCalled();
    expect(financeFinanceEntryCreate).not.toHaveBeenCalled();
    expect(ordersOrderUpdate).not.toHaveBeenCalled();
  });

  it("completes pending payment and atomically creates cash + income records", async () => {
    const {
      service,
      paymentReadRepository,
      paymentsPaymentFindFirst,
      paymentsPaymentUpdate,
      paymentsCashOperationCreate,
      financeFinanceEntryCreate,
      ordersOrderFindFirst,
      ordersOrderUpdate,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate,
      systemIdempotencyRecordUpdate
    } = create_service_with_mocks();

    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_complete_0" });
    paymentsPaymentFindFirst.mockResolvedValue({
      id: "pay_1",
      orderId: "order_1",
      status: "PENDING",
      amount: "2000.00",
      externalReference: "ext_42",
      receivedAt: null
    });
    paymentsCashOperationCreate.mockResolvedValue({ id: "cash_1" });
    financeFinanceEntryCreate.mockResolvedValue({ id: "fin_1" });
    ordersOrderFindFirst.mockResolvedValue({
      id: "order_1",
      status: "ASSEMBLING",
      paymentControlStatus: "NONE",
      paymentControlDueAt: null,
      totalAmount: "2000.00"
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
        idempotencyKey: "idem_complete_0"
      }
    );

    expect(result.status).toBe("completed");
    expect(paymentsPaymentUpdate).toHaveBeenCalledOnce();
    expect(paymentsCashOperationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          operationType: "CASH_IN",
          payment: {
            connect: {
              id: "pay_1"
            }
          },
          createdByUser: {
            connect: {
              id: "finance_1"
            }
          }
        })
      })
    );
    expect(financeFinanceEntryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entryType: "INCOME",
          order: {
            connect: {
              id: "order_1"
            }
          },
          payment: {
            connect: {
              id: "pay_1"
            }
          },
          cashOperation: {
            connect: {
              id: "cash_1"
            }
          }
        })
      })
    );
    expect(ordersOrderUpdate).not.toHaveBeenCalled();
    expect(systemIdempotencyRecordUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "COMPLETED"
        })
      })
    );
  });

  it("marks shipped underpaid order as on_control on payment.completed", async () => {
    const {
      service,
      paymentReadRepository,
      paymentsPaymentFindFirst,
      paymentsCashOperationCreate,
      financeFinanceEntryCreate,
      ordersOrderFindFirst,
      ordersOrderUpdate,
      paymentsPaymentAggregate,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate
    } = create_service_with_mocks();

    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_complete_on_control" });
    paymentsPaymentFindFirst.mockResolvedValue({
      id: "pay_1",
      orderId: "order_1",
      status: "PENDING",
      amount: "1000.00",
      externalReference: null,
      receivedAt: null
    });
    paymentsCashOperationCreate.mockResolvedValue({ id: "cash_1" });
    financeFinanceEntryCreate.mockResolvedValue({ id: "fin_1" });
    ordersOrderFindFirst.mockResolvedValue({
      id: "order_1",
      status: "SHIPPED",
      paymentControlStatus: "NONE",
      paymentControlDueAt: null,
      totalAmount: "5000.00"
    });
    paymentsPaymentAggregate.mockResolvedValue({
      _sum: {
        amount: "1000.00",
        refundedAmount: "0.00"
      }
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
        idempotencyKey: "idem_complete_on_control"
      }
    );

    expect(result.status).toBe("completed");
    expect(ordersOrderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order_1" },
        data: expect.objectContaining({
          paymentControlStatus: "ON_CONTROL",
          paymentControlDueAt: expect.any(Date)
        })
      })
    );
  });

  it("clears system on_control when shipped order payment coverage becomes sufficient", async () => {
    const {
      service,
      paymentReadRepository,
      paymentsPaymentFindFirst,
      paymentsCashOperationCreate,
      financeFinanceEntryCreate,
      ordersOrderFindFirst,
      ordersOrderUpdate,
      paymentsPaymentAggregate,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate
    } = create_service_with_mocks();

    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_complete_clear_control" });
    paymentsPaymentFindFirst.mockResolvedValue({
      id: "pay_1",
      orderId: "order_1",
      status: "PENDING",
      amount: "5000.00",
      externalReference: null,
      receivedAt: null
    });
    paymentsCashOperationCreate.mockResolvedValue({ id: "cash_1" });
    financeFinanceEntryCreate.mockResolvedValue({ id: "fin_1" });
    ordersOrderFindFirst.mockResolvedValue({
      id: "order_1",
      status: "SHIPPED",
      paymentControlStatus: "ON_CONTROL",
      paymentControlDueAt: new Date("2026-04-12T10:00:00.000Z"),
      totalAmount: "5000.00"
    });
    paymentsPaymentAggregate.mockResolvedValue({
      _sum: {
        amount: "5000.00",
        refundedAmount: "0.00"
      }
    });
    (paymentReadRepository.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      build_payment_read_model("completed")
    );

    await service.completePayment(
      "pay_1",
      {
        userId: "finance_1",
        roleCodes: ["finance"]
      },
      {
        idempotencyKey: "idem_complete_clear_control"
      }
    );

    expect(ordersOrderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order_1" },
        data: {
          paymentControlStatus: "NONE",
          paymentControlDueAt: null
        }
      })
    );
  });

  it("blocks invalid complete transition when payment is already completed", async () => {
    const {
      service,
      paymentsPaymentFindFirst,
      paymentsPaymentUpdate,
      paymentsCashOperationCreate,
      financeFinanceEntryCreate,
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
    expect(paymentsCashOperationCreate).not.toHaveBeenCalled();
    expect(financeFinanceEntryCreate).not.toHaveBeenCalled();
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

  it("blocks complete when same idempotency key is reused for another payment", async () => {
    const {
      service,
      paymentsPaymentFindFirst,
      paymentsCashOperationCreate,
      financeFinanceEntryCreate,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate
    } = create_service_with_mocks();

    systemIdempotencyRecordFindUnique.mockResolvedValue({
      id: "idem_5",
      requestHash: "another_hash",
      status: "COMPLETED",
      lockedUntil: null,
      responseBody: { paymentId: "pay_1" }
    });

    await expect(
      service.completePayment(
        "pay_2",
        {
          userId: "finance_1",
          roleCodes: ["finance"]
        },
        {
          idempotencyKey: "idem_complete_3"
        }
      )
    ).rejects.toBeInstanceOf(ConflictException);

    expect(paymentsPaymentFindFirst).not.toHaveBeenCalled();
    expect(paymentsCashOperationCreate).not.toHaveBeenCalled();
    expect(financeFinanceEntryCreate).not.toHaveBeenCalled();
    expect(systemIdempotencyRecordCreate).not.toHaveBeenCalled();
  });

  it("does not create income side effects when payment does not exist", async () => {
    const {
      service,
      paymentsPaymentFindFirst,
      paymentsCashOperationCreate,
      financeFinanceEntryCreate,
      systemIdempotencyRecordFindUnique,
      systemIdempotencyRecordCreate,
      systemIdempotencyRecordUpdate
    } = create_service_with_mocks();

    systemIdempotencyRecordFindUnique.mockResolvedValue(null);
    systemIdempotencyRecordCreate.mockResolvedValue({ id: "idem_complete_4" });
    paymentsPaymentFindFirst.mockResolvedValue(null);

    await expect(
      service.completePayment(
        "pay_missing",
        {
          userId: "finance_1",
          roleCodes: ["finance"]
        },
        {
          idempotencyKey: "idem_complete_4"
        }
      )
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(paymentsCashOperationCreate).not.toHaveBeenCalled();
    expect(financeFinanceEntryCreate).not.toHaveBeenCalled();
    expect(systemIdempotencyRecordUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED"
        })
      })
    );
  });
});
