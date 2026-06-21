import { Inject, Injectable } from "@nestjs/common";
import type { ReadCollectionQueryInput } from "../shared/read-model.contract";
import { PrismaLogisticsDeliveryTaskReadRepository } from "./delivery-task.read.repository";
import type { DeliveryTaskReadScope } from "./delivery-task.read.scope";

@Injectable()
export class ListDeliveryTasksUseCase {
  constructor(
    @Inject(PrismaLogisticsDeliveryTaskReadRepository)
    private readonly deliveryTaskRepository: PrismaLogisticsDeliveryTaskReadRepository
  ) {}

  async execute(query: ReadCollectionQueryInput, scope?: DeliveryTaskReadScope) {
    return this.deliveryTaskRepository.list(query, scope);
  }
}

@Injectable()
export class GetDeliveryTaskDetailUseCase {
  constructor(
    @Inject(PrismaLogisticsDeliveryTaskReadRepository)
    private readonly deliveryTaskRepository: PrismaLogisticsDeliveryTaskReadRepository
  ) {}

  async execute(taskId: string, scope?: DeliveryTaskReadScope) {
    return this.deliveryTaskRepository.getById(taskId, scope);
  }
}
