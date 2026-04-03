import { Inject, Injectable } from "@nestjs/common";
import type { ReadCollectionQueryInput } from "../shared/read-model.contract";
import { PrismaOrdersOrderReadRepository } from "./order.read.repository";

@Injectable()
export class ListOrdersUseCase {
  constructor(
    @Inject(PrismaOrdersOrderReadRepository)
    private readonly orderRepository: PrismaOrdersOrderReadRepository
  ) {}

  async execute(query: ReadCollectionQueryInput) {
    return this.orderRepository.list(query);
  }
}

@Injectable()
export class GetOrderDetailUseCase {
  constructor(
    @Inject(PrismaOrdersOrderReadRepository)
    private readonly orderRepository: PrismaOrdersOrderReadRepository
  ) {}

  async execute(orderId: string, includeDeleted = false) {
    return this.orderRepository.getById(orderId, includeDeleted);
  }
}
