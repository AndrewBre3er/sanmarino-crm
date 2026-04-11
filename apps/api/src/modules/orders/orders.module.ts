import { Module } from "@nestjs/common";
import { PrismaOrdersOrderReadRepository } from "../read-side/orders/order.read.repository";
import { FulfillmentsController } from "./fulfillments.controller";
import { FulfillmentsService } from "./fulfillments.service";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

@Module({
  controllers: [OrdersController, FulfillmentsController],
  providers: [OrdersService, FulfillmentsService, PrismaOrdersOrderReadRepository]
})
export class OrdersModule {}
