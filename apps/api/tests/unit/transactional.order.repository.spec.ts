import { describe, expect, it, vi } from "vitest";
import { PrismaOrdersOrderRepository } from "../../src/modules/transactional/orders/order.repository";

function build_prisma_order(overrides: Record<string, unknown> = {}) {
  return {
    id: "order_1",
    orderNumber: "ORD-DEAL-deal_1",
    dealId: "deal_1",
    clientId: "client_1",
    status: "ASSEMBLING",
    paymentControlStatus: "NONE",
    paymentControlDueAt: null,
    fulfillmentType: "MANUAL",
    deliveryStatus: "NOT_SCHEDULED",
    currency: "RUB",
    subtotalAmount: "0.00",
    discountAmount: "0.00",
    totalAmount: "0.00",
    notes: null,
    readyForPartialShipmentAt: null,
    readyForShipmentAt: null,
    partiallyShippedAt: null,
    shippedAt: null,
    createdAt: new Date("2026-04-10T10:00:00.000Z"),
    updatedAt: new Date("2026-04-10T10:00:00.000Z"),
    version: 1,
    deletedAt: null,
    deletedBy: null,
    deleteReason: null,
    isDeleted: false,
    ...overrides
  };
}

describe("transactional orders order repository auto-create baseline", () => {
  it("creates baseline order from deal with assembling status and linkage", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const create = vi.fn().mockResolvedValue(
      build_prisma_order({
        fulfillmentType: "DELIVERY",
        notes: "deal note"
      })
    );
    const findUnique = vi.fn();

    const prismaService = {
      ordersOrder: {
        findFirst,
        create,
        findUnique
      }
    } as unknown as ConstructorParameters<typeof PrismaOrdersOrderRepository>[0];

    const repository = new PrismaOrdersOrderRepository(prismaService);
    const created = await repository.ensureFromDeal({
      dealId: "deal_1",
      clientId: "client_1",
      deliveryMode: "delivery",
      notes: "deal note"
    });

    expect(created.dealId).toBe("deal_1");
    expect(created.clientId).toBe("client_1");
    expect(created.status).toBe("assembling");
    expect(created.fulfillmentType).toBe("delivery");
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderNumber: "ORD-DEAL-deal_1",
          dealId: "deal_1",
          clientId: "client_1",
          status: "ASSEMBLING",
          fulfillmentType: "DELIVERY",
          notes: "deal note"
        })
      })
    );
  });

  it("returns existing order for deal without creating duplicates", async () => {
    const existing = build_prisma_order({
      id: "order_existing",
      orderNumber: "ORD-DEAL-deal_1",
      status: "ASSEMBLING"
    });

    const findFirst = vi.fn().mockResolvedValue(existing);
    const create = vi.fn();
    const findUnique = vi.fn();

    const prismaService = {
      ordersOrder: {
        findFirst,
        create,
        findUnique
      }
    } as unknown as ConstructorParameters<typeof PrismaOrdersOrderRepository>[0];

    const repository = new PrismaOrdersOrderRepository(prismaService);
    const ensured = await repository.ensureFromDeal({
      dealId: "deal_1",
      clientId: "client_1",
      deliveryMode: "pickup"
    });

    expect(ensured.id).toBe("order_existing");
    expect(ensured.status).toBe("assembling");
    expect(create).not.toHaveBeenCalled();
  });

  it("recovers idempotently from deterministic order number unique conflict", async () => {
    const existing = build_prisma_order({
      id: "order_from_conflict",
      orderNumber: "ORD-DEAL-deal_1",
      status: "ASSEMBLING"
    });

    const findFirst = vi.fn().mockResolvedValue(null);
    const create = vi.fn().mockRejectedValue({ code: "P2002" });
    const findUnique = vi.fn().mockResolvedValue(existing);

    const prismaService = {
      ordersOrder: {
        findFirst,
        create,
        findUnique
      }
    } as unknown as ConstructorParameters<typeof PrismaOrdersOrderRepository>[0];

    const repository = new PrismaOrdersOrderRepository(prismaService);
    const ensured = await repository.ensureFromDeal({
      dealId: "deal_1",
      clientId: "client_1",
      deliveryMode: "manual"
    });

    expect(ensured.id).toBe("order_from_conflict");
    expect(create).toHaveBeenCalledTimes(1);
    expect(findUnique).toHaveBeenCalledWith({
      where: { orderNumber: "ORD-DEAL-deal_1" }
    });
  });
});
