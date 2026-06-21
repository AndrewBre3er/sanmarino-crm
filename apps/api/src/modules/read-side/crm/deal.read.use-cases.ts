import { Inject, Injectable } from "@nestjs/common";
import type { ReadCollectionQueryInput } from "../shared/read-model.contract";
import {
  PrismaCrmDealReadRepository,
  type CrmDealReadScope
} from "./deal.read.repository";

@Injectable()
export class ListDealsUseCase {
  constructor(
    @Inject(PrismaCrmDealReadRepository)
    private readonly dealRepository: PrismaCrmDealReadRepository
  ) {}

  async execute(query: ReadCollectionQueryInput, scope?: CrmDealReadScope) {
    return this.dealRepository.list(query, scope);
  }
}

@Injectable()
export class GetDealDetailUseCase {
  constructor(
    @Inject(PrismaCrmDealReadRepository)
    private readonly dealRepository: PrismaCrmDealReadRepository
  ) {}

  async execute(dealId: string, includeDeleted = false, scope?: CrmDealReadScope) {
    return this.dealRepository.getById(dealId, includeDeleted, scope);
  }
}
