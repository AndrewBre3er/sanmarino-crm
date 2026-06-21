import { Module } from "@nestjs/common";
import { PrismaLogisticsDeliveryTaskReadRepository } from "../read-side/logistics/delivery-task.read.repository";
import { DeliveryTasksController } from "./delivery-tasks.controller";
import { LogisticsResourcesController } from "./logistics-resources.controller";
import { LogisticsResourcesService } from "./logistics-resources.service";
import { LogisticsService } from "./logistics.service";

@Module({
  controllers: [DeliveryTasksController, LogisticsResourcesController],
  providers: [
    LogisticsService,
    LogisticsResourcesService,
    PrismaLogisticsDeliveryTaskReadRepository
  ]
})
export class LogisticsModule {}
