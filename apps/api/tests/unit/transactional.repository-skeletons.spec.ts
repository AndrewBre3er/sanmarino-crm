import { describe, expect, it } from "vitest";
import { PrismaService } from "../../src/prisma/prisma.service";
import {
  DeferredSkeletonError,
  PrismaCrmDealRepository,
  PrismaLogisticsDeliveryTaskRepository,
  PrismaOrdersOrderItemRepository,
  PrismaOrdersOrderRepository,
  PrismaOrdersReturnRequestRepository,
  PrismaPaymentsPaymentRepository
} from "../../src/modules/transactional";

describe("transactional repository skeletons", () => {
  const prismaService = new PrismaService();

  it("keeps deferred skeleton mode for domains outside lead baseline", async () => {
    const dealRepository = new PrismaCrmDealRepository(prismaService);
    const orderRepository = new PrismaOrdersOrderRepository(prismaService);
    const orderItemRepository = new PrismaOrdersOrderItemRepository(prismaService);
    const deliveryTaskRepository = new PrismaLogisticsDeliveryTaskRepository(prismaService);
    const returnRequestRepository = new PrismaOrdersReturnRequestRepository(prismaService);
    const paymentRepository = new PrismaPaymentsPaymentRepository(prismaService);

    await expect(
      dealRepository.create({
        clientId: "client_1",
        status: "in_progress",
        title: "Deal skeleton",
        responsibleUserId: "user_1"
      })
    ).rejects.toBeInstanceOf(DeferredSkeletonError);

    await expect(
      orderRepository.create({
        orderNumber: "ORD-SKELETON",
        dealId: "deal_1",
        clientId: "client_1",
        status: "assembling",
        fulfillmentType: "manual"
      })
    ).rejects.toBeInstanceOf(DeferredSkeletonError);

    await expect(
      orderItemRepository.create({
        orderId: "order_1",
        lineNo: 1,
        productId: "product_1",
        productNameSnapshot: "Product",
        qty: "1",
        unit: "шт",
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
