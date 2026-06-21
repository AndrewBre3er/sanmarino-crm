import { Module } from "@nestjs/common";
import { PrismaPaymentsPaymentReadRepository } from "../read-side/payments/payment.read.repository";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PrismaPaymentsPaymentReadRepository]
})
export class PaymentsModule {}

