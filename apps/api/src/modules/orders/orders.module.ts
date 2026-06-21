import { Module } from "@nestjs/common";
import { PrismaOrdersOrderReadRepository } from "../read-side/orders/order.read.repository";
import { FulfillmentsController } from "./fulfillments.controller";
import { FulfillmentsService } from "./fulfillments.service";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { ReturnRequestsController } from "./return-requests.controller";
import { ReturnRequestsService } from "./return-requests.service";

@Module({
  controllers: [OrdersController, FulfillmentsController, ReturnRequestsController],
  providers: [OrdersService, FulfillmentsService, ReturnRequestsService, PrismaOrdersOrderReadRepository]
})
export class OrdersModule {}
