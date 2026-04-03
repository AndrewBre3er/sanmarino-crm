import { Inject, Injectable } from "@nestjs/common";
import type { ReadCollectionQueryInput } from "../shared/read-model.contract";
import { PrismaPaymentsPaymentReadRepository } from "./payment.read.repository";

@Injectable()
export class ListPaymentsUseCase {
  constructor(
    @Inject(PrismaPaymentsPaymentReadRepository)
    private readonly paymentRepository: PrismaPaymentsPaymentReadRepository
  ) {}

  async execute(query: ReadCollectionQueryInput) {
    return this.paymentRepository.list(query);
  }
}

@Injectable()
export class GetPaymentDetailUseCase {
  constructor(
    @Inject(PrismaPaymentsPaymentReadRepository)
    private readonly paymentRepository: PrismaPaymentsPaymentReadRepository
  ) {}

  async execute(paymentId: string, includeDeleted = false) {
    return this.paymentRepository.getById(paymentId, includeDeleted);
  }
}
