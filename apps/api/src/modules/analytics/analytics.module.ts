import { Module } from "@nestjs/common";
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
    PrismaAnalyticsKpiReadRepository,
    ListLiveKpiMetricsUseCase,
    ListSnapshotKpiMetricsUseCase,
    ListDepartmentPlansUseCase
  ]
})
export class AnalyticsModule {}
