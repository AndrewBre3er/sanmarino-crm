import { Inject, Injectable } from "@nestjs/common";
import type { ReadCollectionQueryInput } from "../shared/read-model.contract";
import {
  PrismaCrmLeadReadRepository,
  type CrmLeadReadScope
} from "./lead.read.repository";

@Injectable()
export class ListLeadsUseCase {
  constructor(
    @Inject(PrismaCrmLeadReadRepository)
    private readonly leadRepository: PrismaCrmLeadReadRepository
  ) {}

  async execute(query: ReadCollectionQueryInput, scope?: CrmLeadReadScope) {
    return this.leadRepository.list(query, scope);
  }
}

@Injectable()
export class GetLeadDetailUseCase {
  constructor(
    @Inject(PrismaCrmLeadReadRepository)
    private readonly leadRepository: PrismaCrmLeadReadRepository
  ) {}

  async execute(leadId: string, scope?: CrmLeadReadScope) {
    return this.leadRepository.getById(leadId, scope);
  }
}
