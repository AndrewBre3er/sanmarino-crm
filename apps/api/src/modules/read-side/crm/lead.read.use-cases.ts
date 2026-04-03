import { Inject, Injectable } from "@nestjs/common";
import type { ReadCollectionQueryInput } from "../shared/read-model.contract";
import { PrismaCrmLeadReadRepository } from "./lead.read.repository";

@Injectable()
export class ListLeadsUseCase {
  constructor(
    @Inject(PrismaCrmLeadReadRepository)
    private readonly leadRepository: PrismaCrmLeadReadRepository
  ) {}

  async execute(query: ReadCollectionQueryInput) {
    return this.leadRepository.list(query);
  }
}

@Injectable()
export class GetLeadDetailUseCase {
  constructor(
    @Inject(PrismaCrmLeadReadRepository)
    private readonly leadRepository: PrismaCrmLeadReadRepository
  ) {}

  async execute(leadId: string) {
    return this.leadRepository.getById(leadId);
  }
}
