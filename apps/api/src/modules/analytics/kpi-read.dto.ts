import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength } from "class-validator";
import { BaseReadCollectionQueryDto } from "../read-side/shared/read-query.dto";
import {
  accepted_kpi_metric_key_values,
  type AcceptedKpiMetricKey
} from "./kpi.metric-keys";

function trim_to_undefined(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

const iso_date_pattern = /^\d{4}-\d{2}-\d{2}$/;

export class KpiLiveMetricsReadQueryDto extends BaseReadCollectionQueryDto {
  @IsOptional()
  @Transform(({ value }) => trim_to_undefined(value))
  @IsIn(accepted_kpi_metric_key_values)
  metricKey?: AcceptedKpiMetricKey;

  @IsOptional()
  @Transform(({ value }) => trim_to_undefined(value))
  @IsString()
  @MaxLength(64)
  scope?: string;

  @IsOptional()
  @Transform(({ value }) => trim_to_undefined(value))
  @Matches(iso_date_pattern)
  date?: string;
}

export class KpiSnapshotsReadQueryDto extends BaseReadCollectionQueryDto {
  @IsOptional()
  @Transform(({ value }) => trim_to_undefined(value))
  @IsIn(accepted_kpi_metric_key_values)
  metricKey?: AcceptedKpiMetricKey;

  @IsOptional()
  @Transform(({ value }) => trim_to_undefined(value))
  @IsString()
  @MaxLength(32)
  periodType?: string;

  @IsOptional()
  @Transform(({ value }) => trim_to_undefined(value))
  @Matches(iso_date_pattern)
  periodStart?: string;

  @IsOptional()
  @Transform(({ value }) => trim_to_undefined(value))
  @Matches(iso_date_pattern)
  periodEnd?: string;
}

export class KpiDepartmentPlansReadQueryDto extends BaseReadCollectionQueryDto {
  @IsOptional()
  @Transform(({ value }) => trim_to_undefined(value))
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @Transform(({ value }) => trim_to_undefined(value))
  @IsIn(accepted_kpi_metric_key_values)
  metricKey?: AcceptedKpiMetricKey;

  @IsOptional()
  @Transform(({ value }) => trim_to_undefined(value))
  @Matches(iso_date_pattern)
  periodStart?: string;

  @IsOptional()
  @Transform(({ value }) => trim_to_undefined(value))
  @Matches(iso_date_pattern)
  periodEnd?: string;
}
