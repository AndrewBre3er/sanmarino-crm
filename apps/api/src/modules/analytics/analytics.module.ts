import { Module } from "@nestjs/common";
import { PrismaKpiLiveRefreshPersistenceAdapter } from "./kpi-live-refresh.persistence";
import { KpiReadController } from "./kpi-read.controller";
import { PrismaAnalyticsKpiReadRepository } from "./kpi-read.repository";
import {
  ListDepartmentPlansUseCase,
  ListLiveKpiMetricsUseCase,
  ListSnapshotKpiMetricsUseCase
} from "./kpi-read.use-cases";

@Module({
  controllers: [KpiReadController],
  providers: [
    PrismaKpiLiveRefreshPersistenceAdapter,
    PrismaAnalyticsKpiReadRepository,
    ListLiveKpiMetricsUseCase,
    ListSnapshotKpiMetricsUseCase,
    ListDepartmentPlansUseCase
  ],
  exports: [
    PrismaKpiLiveRefreshPersistenceAdapter
  ]
})
export class AnalyticsModule {}
