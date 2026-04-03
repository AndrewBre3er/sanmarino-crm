import { describe, expect, it } from "vitest";
import { PrismaService } from "../../src/prisma/prisma.service";
import {
  DeferredSkeletonError,
  PrismaCrmDealRepository,
  PrismaCrmLeadRepository,
  PrismaLogisticsDeliveryTaskRepository,
  PrismaOrdersOrderItemRepository,
  PrismaOrdersOrderRepository,
  PrismaOrdersReturnRequestRepository,
  PrismaPaymentsPaymentRepository
} from "../../src/modules/transactional";

describe("transactional repository skeletons", () => {
  const prismaService = new PrismaService();

  it("throws deferred error for crm lead skeleton methods", async () => {
    const repository = new PrismaCrmLeadRepository(prismaService);

    await expect(
      repository.create({
        source: "manual",
        status: "draft"
      })
    ).rejects.toBeInstanceOf(DeferredSkeletonError);
  });

  it("keeps all core transactional repositories in deferred skeleton mode", async () => {
    const dealRepository = new PrismaCrmDealRepository(prismaService);
    const orderRepository = new PrismaOrdersOrderRepository(prismaService);
    const orderItemRepository = new PrismaOrdersOrderItemRepository(prismaService);
    const deliveryTaskRepository = new PrismaLogisticsDeliveryTaskRepository(prismaService);
    const returnRequestRepository = new PrismaOrdersReturnRequestRepository(prismaService);
    const paymentRepository = new PrismaPaymentsPaymentRepository(prismaService);

    await expect(
      dealRepository.create({ status: "draft", title: "Deal skeleton" })
    ).rejects.toBeInstanceOf(DeferredSkeletonError);

    await expect(
      orderRepository.create({
        orderNumber: "ORD-SKELETON",
        dealId: "deal_1",
        status: "draft",
        fulfillmentType: "manual"
      })
    ).rejects.toBeInstanceOf(DeferredSkeletonError);

    await expect(
      orderItemRepository.create({
        orderId: "order_1",
        lineNo: 1,
        productRef: "product_1",
        productNameSnapshot: "Product",
        qty: "1",
        retailPrice: "100.00",
        lineTotal: "100.00"
      })
    ).rejects.toBeInstanceOf(DeferredSkeletonError);

    await expect(
      deliveryTaskRepository.create({
        orderId: "order_1",
        status: "planned"
      })
    ).rejects.toBeInstanceOf(DeferredSkeletonError);

    await expect(
      returnRequestRepository.create({
        orderId: "order_1",
        status: "draft",
        reason: "Need return"
      })
    ).rejects.toBeInstanceOf(DeferredSkeletonError);

    await expect(
      paymentRepository.create({
        paymentNumber: "PAY-SKELETON",
        orderId: "order_1",
        status: "pending",
        paymentMethod: "cash",
        amount: "100.00"
      })
    ).rejects.toBeInstanceOf(DeferredSkeletonError);
  });
});
