import { Module } from "@nestjs/common";
import { PrismaOrdersOrderReadRepository } from "../read-side/orders/order.read.repository";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, PrismaOrdersOrderReadRepository]
})
export class OrdersModule {}
