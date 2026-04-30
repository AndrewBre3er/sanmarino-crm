import { Inject, Injectable } from "@nestjs/common";
import type { ReadCollectionQueryInput } from "../read-side/shared/read-model.contract";
import { PrismaAnalyticsKpiReadRepository } from "./kpi-read.repository";

@Injectable()
export class ListLiveKpiMetricsUseCase {
  constructor(
    @Inject(PrismaAnalyticsKpiReadRepository)
    private readonly kpiReadRepository: PrismaAnalyticsKpiReadRepository
  ) {}

  async execute(query: ReadCollectionQueryInput) {
    return this.kpiReadRepository.listLive(query);
  }
}

@Injectable()
export class ListSnapshotKpiMetricsUseCase {
  constructor(
    @Inject(PrismaAnalyticsKpiReadRepository)
    private readonly kpiReadRepository: PrismaAnalyticsKpiReadRepository
  ) {}

  async execute(query: ReadCollectionQueryInput) {
    return this.kpiReadRepository.listSnapshots(query);
  }
}

@Injectable()
export class ListDepartmentPlansUseCase {
  constructor(
    @Inject(PrismaAnalyticsKpiReadRepository)
    private readonly kpiReadRepository: PrismaAnalyticsKpiReadRepository
  ) {}

  async execute(query: ReadCollectionQueryInput) {
    return this.kpiReadRepository.listDepartmentPlans(query);
  }
}
