import { Inject, Injectable } from "@nestjs/common";
import type { ReadCollectionQueryInput } from "../shared/read-model.contract";
import { PrismaCrmDealReadRepository } from "./deal.read.repository";

@Injectable()
export class ListDealsUseCase {
  constructor(
    @Inject(PrismaCrmDealReadRepository)
    private readonly dealRepository: PrismaCrmDealReadRepository
  ) {}

  async execute(query: ReadCollectionQueryInput) {
    return this.dealRepository.list(query);
  }
}

@Injectable()
export class GetDealDetailUseCase {
  constructor(
    @Inject(PrismaCrmDealReadRepository)
    private readonly dealRepository: PrismaCrmDealReadRepository
  ) {}

  async execute(dealId: string, includeDeleted = false) {
    return this.dealRepository.getById(dealId, includeDeleted);
  }
}
