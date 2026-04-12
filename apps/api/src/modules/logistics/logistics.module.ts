import { Module } from "@nestjs/common";
import { PrismaLogisticsDeliveryTaskReadRepository } from "../read-side/logistics/delivery-task.read.repository";
import { DeliveryTasksController } from "./delivery-tasks.controller";
import { LogisticsService } from "./logistics.service";

@Module({
  controllers: [DeliveryTasksController],
  providers: [LogisticsService, PrismaLogisticsDeliveryTaskReadRepository]
})
export class LogisticsModule {}

