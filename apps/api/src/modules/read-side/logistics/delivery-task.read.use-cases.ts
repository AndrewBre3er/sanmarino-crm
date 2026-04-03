import { Inject, Injectable } from "@nestjs/common";
import type { ReadCollectionQueryInput } from "../shared/read-model.contract";
import { PrismaLogisticsDeliveryTaskReadRepository } from "./delivery-task.read.repository";

@Injectable()
export class ListDeliveryTasksUseCase {
  constructor(
    @Inject(PrismaLogisticsDeliveryTaskReadRepository)
    private readonly deliveryTaskRepository: PrismaLogisticsDeliveryTaskReadRepository
  ) {}

  async execute(query: ReadCollectionQueryInput) {
    return this.deliveryTaskRepository.list(query);
  }
}

@Injectable()
export class GetDeliveryTaskDetailUseCase {
  constructor(
    @Inject(PrismaLogisticsDeliveryTaskReadRepository)
    private readonly deliveryTaskRepository: PrismaLogisticsDeliveryTaskReadRepository
  ) {}

  async execute(taskId: string) {
    return this.deliveryTaskRepository.getById(taskId);
  }
}
