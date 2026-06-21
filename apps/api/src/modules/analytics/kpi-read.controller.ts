import { Controller, Get, Inject, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { api_openapi_tags } from "../../contracts/openapi.contract";
import { require_roles } from "../auth/auth.access.decorator";
import { AuthAccessGuard } from "../auth/auth.access.guard";
import { build_read_collection_query } from "../read-side/shared/read-query.dto";
import { to_read_collection_response } from "../read-side/shared/read-response";
import type {
  KpiDepartmentPlansReadQueryDto,
  KpiLiveMetricsReadQueryDto,
  KpiSnapshotsReadQueryDto
} from "./kpi-read.dto";
import { append_kpi_read_filter } from "./kpi-read.repository";
import {
  ListDepartmentPlansUseCase,
  ListLiveKpiMetricsUseCase,
  ListSnapshotKpiMetricsUseCase
} from "./kpi-read.use-cases";

@ApiTags(api_openapi_tags.kpiAnalytics.name)
@UseGuards(AuthAccessGuard)
@require_roles("admin", "seller", "warehouse", "logistics", "finance", "ceo", "driver", "marketing")
@Controller("kpi")
export class KpiReadController {
  constructor(
    @Inject(ListLiveKpiMetricsUseCase)
    private readonly listLiveKpiMetricsUseCase: ListLiveKpiMetricsUseCase,
    @Inject(ListSnapshotKpiMetricsUseCase)
    private readonly listSnapshotKpiMetricsUseCase: ListSnapshotKpiMetricsUseCase,
    @Inject(ListDepartmentPlansUseCase)
    private readonly listDepartmentPlansUseCase: ListDepartmentPlansUseCase
  ) {}

  @Get("live")
  async live(@Query() query: KpiLiveMetricsReadQueryDto) {
    let readQuery = build_read_collection_query(query, {
      defaultSortField: "asOf",
      allowedSortFields: ["asOf", "createdAt", "updatedAt", "metricKey"]
    });

    readQuery = append_kpi_read_filter(readQuery, "metricKey", query.metricKey);
    readQuery = append_kpi_read_filter(readQuery, "scope", query.scope);
    readQuery = append_kpi_read_filter(readQuery, "date", query.date);

    const result = await this.listLiveKpiMetricsUseCase.execute(readQuery);
    return to_read_collection_response(result);
  }

  @Get("snapshots")
  async snapshots(@Query() query: KpiSnapshotsReadQueryDto) {
    let readQuery = build_read_collection_query(query, {
      defaultSortField: "periodStart",
      allowedSortFields: ["periodStart", "periodEnd", "createdAt", "updatedAt", "metricKey"]
    });

    readQuery = append_kpi_read_filter(readQuery, "metricKey", query.metricKey);
    readQuery = append_kpi_read_filter(readQuery, "periodType", query.periodType);
    readQuery = append_kpi_read_filter(readQuery, "periodStart", query.periodStart);
    readQuery = append_kpi_read_filter(readQuery, "periodEnd", query.periodEnd);

    const result = await this.listSnapshotKpiMetricsUseCase.execute(readQuery);
    return to_read_collection_response(result);
  }

  @Get("department-plans")
  async departmentPlans(@Query() query: KpiDepartmentPlansReadQueryDto) {
    let readQuery = build_read_collection_query(query, {
      defaultSortField: "periodStart",
      allowedSortFields: ["periodStart", "periodEnd", "createdAt", "updatedAt", "metricKey"]
    });

    readQuery = append_kpi_read_filter(readQuery, "departmentId", query.departmentId);
    readQuery = append_kpi_read_filter(readQuery, "metricKey", query.metricKey);
    readQuery = append_kpi_read_filter(readQuery, "periodStart", query.periodStart);
    readQuery = append_kpi_read_filter(readQuery, "periodEnd", query.periodEnd);

    const result = await this.listDepartmentPlansUseCase.execute(readQuery);
    return to_read_collection_response(result);
  }
}
