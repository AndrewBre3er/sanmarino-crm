import { Inject, Injectable } from "@nestjs/common";
import type { ReadCollectionQueryInput } from "../shared/read-model.contract";
import { PrismaOrdersReturnRequestReadRepository } from "./return-request.read.repository";

@Injectable()
export class ListReturnRequestsUseCase {
  constructor(
    @Inject(PrismaOrdersReturnRequestReadRepository)
    private readonly returnRequestRepository: PrismaOrdersReturnRequestReadRepository
  ) {}

  async execute(query: ReadCollectionQueryInput) {
    return this.returnRequestRepository.list(query);
  }
}

@Injectable()
export class GetReturnRequestDetailUseCase {
  constructor(
    @Inject(PrismaOrdersReturnRequestReadRepository)
    private readonly returnRequestRepository: PrismaOrdersReturnRequestReadRepository
  ) {}

  async execute(returnRequestId: string, includeDeleted = false) {
    return this.returnRequestRepository.getById(returnRequestId, includeDeleted);
  }
}
