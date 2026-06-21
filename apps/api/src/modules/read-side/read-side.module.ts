import { Module } from "@nestjs/common";
import { DealsReadController } from "./crm/deal.read.controller";
import { PrismaCrmDealReadRepository } from "./crm/deal.read.repository";
import { GetDealDetailUseCase, ListDealsUseCase } from "./crm/deal.read.use-cases";
import { FinanceEntriesReadController } from "./finance/finance-entry.read.controller";
import { PrismaFinanceEntryReadRepository } from "./finance/finance-entry.read.repository";
import {
  GetFinanceEntryDetailUseCase,
  ListFinanceEntriesUseCase
} from "./finance/finance-entry.read.use-cases";
import { DeliveryTasksReadController } from "./logistics/delivery-task.read.controller";
import { PrismaLogisticsDeliveryTaskReadRepository } from "./logistics/delivery-task.read.repository";
import {
  GetDeliveryTaskDetailUseCase,
  ListDeliveryTasksUseCase
} from "./logistics/delivery-task.read.use-cases";
import { PrismaOrdersOrderReadRepository } from "./orders/order.read.repository";
import { GetOrderDetailUseCase, ListOrdersUseCase } from "./orders/order.read.use-cases";
import { PaymentsReadController } from "./payments/payment.read.controller";
import { PrismaPaymentsPaymentReadRepository } from "./payments/payment.read.repository";
import { GetPaymentDetailUseCase, ListPaymentsUseCase } from "./payments/payment.read.use-cases";
import { ReturnRequestsReadController } from "./returns/return-request.read.controller";
import { PrismaOrdersReturnRequestReadRepository } from "./returns/return-request.read.repository";
import {
  GetReturnRequestDetailUseCase,
  ListReturnRequestsUseCase
} from "./returns/return-request.read.use-cases";

@Module({
  controllers: [
    DealsReadController,
    PaymentsReadController,
    FinanceEntriesReadController,
    DeliveryTasksReadController,
    ReturnRequestsReadController
  ],
  providers: [
    PrismaCrmDealReadRepository,
    PrismaOrdersOrderReadRepository,
    PrismaPaymentsPaymentReadRepository,
    PrismaFinanceEntryReadRepository,
    PrismaLogisticsDeliveryTaskReadRepository,
    PrismaOrdersReturnRequestReadRepository,
    ListDealsUseCase,
    GetDealDetailUseCase,
    ListOrdersUseCase,
    GetOrderDetailUseCase,
    ListPaymentsUseCase,
    GetPaymentDetailUseCase,
    ListFinanceEntriesUseCase,
    GetFinanceEntryDetailUseCase,
    ListDeliveryTasksUseCase,
    GetDeliveryTaskDetailUseCase,
    ListReturnRequestsUseCase,
    GetReturnRequestDetailUseCase
  ]
})
export class TransactionalReadModule {}

export const transactional_read_module_deferred_todos = {
  mutationEndpoints: "TODO",
  authAndRbacEnforcement: "TODO",
  businessWorkflowOrchestration: "TODO",
  idempotentWriteProcessing: "TODO",
  outboxDrivenWriteSideEffects: "TODO"
} as const;
