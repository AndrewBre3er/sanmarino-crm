import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type {
  FilterClause,
  ReadCollectionQueryInput,
  ReadCollectionResult
} from "../read-side/shared/read-model.contract";
import { build_page_pagination_meta } from "../read-side/shared/read-query.dto";
import { to_decimal_string, to_iso_datetime } from "../read-side/shared/prisma-read.mapper";
import { accepted_kpi_metric_keys, type AcceptedKpiMetricKey } from "./kpi.metric-keys";

export interface LiveKpiMetricReadModel {
  id: string;
  metricKey: AcceptedKpiMetricKey;
  scopeType: string;
  scopeId: string | null;
  metricValue: string;
  metricPayload: Prisma.JsonValue | null;
  asOf: string;
  createdAt: string;
  updatedAt: string;
}

export interface SnapshotKpiMetricReadModel {
  id: string;
  metricKey: AcceptedKpiMetricKey;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  scopeType: string;
  scopeId: string | null;
  metricValue: string;
  metricPayload: Prisma.JsonValue | null;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentPlanReadModel {
  id: string;
  departmentId: string;
  metricKey: AcceptedKpiMetricKey;
  periodStart: string;
  periodEnd: string;
  planValue: string;
  setByUserId: string;
  setAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsKpiReadRepositoryContract {
  listLive(
    query: ReadCollectionQueryInput
  ): Promise<ReadCollectionResult<LiveKpiMetricReadModel>>;
  listSnapshots(
    query: ReadCollectionQueryInput
  ): Promise<ReadCollectionResult<SnapshotKpiMetricReadModel>>;
  listDepartmentPlans(
    query: ReadCollectionQueryInput
  ): Promise<ReadCollectionResult<DepartmentPlanReadModel>>;
}

type DecimalLike = { toString: () => string } | number | string | null | undefined;

interface CountRow {
  totalItems: number | bigint | string;
}

interface LiveKpiMetricRow {
  id: string;
  metricKey: AcceptedKpiMetricKey;
  scopeType: string;
  scopeId: string | null;
  metricValue: DecimalLike;
  metricPayload: Prisma.JsonValue | null;
  asOf: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface SnapshotKpiMetricRow {
  id: string;
  metricKey: AcceptedKpiMetricKey;
  periodType: string;
  periodStart: Date;
  periodEnd: Date;
  scopeType: string;
  scopeId: string | null;
  metricValue: DecimalLike;
  metricPayload: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
}

interface DepartmentPlanRow {
  id: string;
  departmentId: string;
  metricKey: AcceptedKpiMetricKey;
  periodStart: Date;
  periodEnd: Date;
  planValue: DecimalLike;
  setByUserId: string;
  setAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

function extract_eq_filter(query: ReadCollectionQueryInput, field: string): string | undefined {
  const filters = query.contract.filters ?? [];
  for (const filter of filters) {
    if (filter.field !== field || filter.operator !== "eq") {
      continue;
    }

    if (typeof filter.value !== "string") {
      continue;
    }

    const normalized = filter.value.trim();
    if (normalized.length > 0) {
      return normalized;
    }
  }

  return undefined;
}

function build_where_clause(conditions: Prisma.Sql[]): Prisma.Sql {
  if (conditions.length === 0) {
    return Prisma.empty;
  }

  return Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;
}

function normalize_sort_direction(direction: string): "ASC" | "DESC" {
  return direction === "asc" ? "ASC" : "DESC";
}

function build_order_clause(
  query: ReadCollectionQueryInput,
  sort_fields: Record<string, string>,
  default_sort_field: string
): Prisma.Sql {
  const column = sort_fields[query.sortField] ?? sort_fields[default_sort_field];
  const direction = normalize_sort_direction(query.sortDirection);
  return Prisma.sql`${Prisma.raw(column ?? sort_fields[default_sort_field] ?? '"created_at"')} ${Prisma.raw(direction)}`;
}

function build_utc_day_bounds(value: string): { from: Date; to: Date } | null {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return null;
  }

  const to = new Date(parsed);
  to.setUTCDate(parsed.getUTCDate() + 1);
  return { from: parsed, to };
}

function to_iso_date(value: Date | null | undefined): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

function total_items_from(rows: CountRow[]): number {
  const [first_row] = rows;
  if (!first_row) {
    return 0;
  }

  return Number(first_row.totalItems);
}

function map_live_kpi_metric(row: LiveKpiMetricRow): LiveKpiMetricReadModel {
  return {
    id: row.id,
    metricKey: row.metricKey,
    scopeType: row.scopeType,
    scopeId: row.scopeId,
    metricValue: to_decimal_string(row.metricValue) ?? "0",
    metricPayload: row.metricPayload,
    asOf: to_iso_datetime(row.asOf) ?? "",
    createdAt: to_iso_datetime(row.createdAt) ?? "",
    updatedAt: to_iso_datetime(row.updatedAt) ?? ""
  };
}

function map_snapshot_kpi_metric(row: SnapshotKpiMetricRow): SnapshotKpiMetricReadModel {
  return {
    id: row.id,
    metricKey: row.metricKey,
    periodType: row.periodType,
    periodStart: to_iso_date(row.periodStart),
    periodEnd: to_iso_date(row.periodEnd),
    scopeType: row.scopeType,
    scopeId: row.scopeId,
    metricValue: to_decimal_string(row.metricValue) ?? "0",
    metricPayload: row.metricPayload,
    createdAt: to_iso_datetime(row.createdAt) ?? "",
    updatedAt: to_iso_datetime(row.updatedAt) ?? ""
  };
}

function map_department_plan(row: DepartmentPlanRow): DepartmentPlanReadModel {
  return {
    id: row.id,
    departmentId: row.departmentId,
    metricKey: row.metricKey,
    periodStart: to_iso_date(row.periodStart),
    periodEnd: to_iso_date(row.periodEnd),
    planValue: to_decimal_string(row.planValue) ?? "0",
    setByUserId: row.setByUserId,
    setAt: to_iso_datetime(row.setAt) ?? "",
    createdAt: to_iso_datetime(row.createdAt) ?? "",
    updatedAt: to_iso_datetime(row.updatedAt) ?? ""
  };
}

function append_filter(filters: FilterClause[] | undefined, filter: FilterClause): FilterClause[] {
  return [...(filters ?? []), filter];
}

function accepted_metric_key_condition(): Prisma.Sql {
  return Prisma.sql`"metric_code" IN (${Prisma.join([...accepted_kpi_metric_keys])})`;
}

@Injectable()
export class PrismaAnalyticsKpiReadRepository implements AnalyticsKpiReadRepositoryContract {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async listLive(
    query: ReadCollectionQueryInput
  ): Promise<ReadCollectionResult<LiveKpiMetricReadModel>> {
    const conditions: Prisma.Sql[] = [accepted_metric_key_condition()];
    const metricKey = extract_eq_filter(query, "metricKey");
    if (metricKey) {
      conditions.push(Prisma.sql`"metric_code" = ${metricKey}`);
    }

    const scope = extract_eq_filter(query, "scope");
    if (scope) {
      conditions.push(Prisma.sql`"scope_type" = ${scope}`);
    }

    const date = extract_eq_filter(query, "date");
    if (date) {
      const bounds = build_utc_day_bounds(date);
      if (bounds) {
        conditions.push(Prisma.sql`"as_of" >= ${bounds.from} AND "as_of" < ${bounds.to}`);
      }
    }

    const where_clause = build_where_clause(conditions);
    const order_clause = build_order_clause(
      query,
      {
        asOf: '"as_of"',
        createdAt: '"created_at"',
        updatedAt: '"updated_at"',
        metricKey: '"metric_code"'
      },
      "asOf"
    );
    const offset = (query.page - 1) * query.pageSize;

    const [rows, countRows] = await this.prismaService.$transaction([
      this.prismaService.$queryRaw<LiveKpiMetricRow[]>`
        SELECT
          "id",
          "metric_code" AS "metricKey",
          "scope_type" AS "scopeType",
          "scope_id" AS "scopeId",
          "metric_value" AS "metricValue",
          "metric_payload" AS "metricPayload",
          "as_of" AS "asOf",
          "created_at" AS "createdAt",
          "updated_at" AS "updatedAt"
        FROM "analytics"."live_kpi_metrics"
        ${where_clause}
        ORDER BY ${order_clause}
        LIMIT ${query.pageSize}
        OFFSET ${offset}
      `,
      this.prismaService.$queryRaw<CountRow[]>`
        SELECT COUNT(*)::int AS "totalItems"
        FROM "analytics"."live_kpi_metrics"
        ${where_clause}
      `
    ]);

    return {
      items: rows.map(map_live_kpi_metric),
      pagination: build_page_pagination_meta(total_items_from(countRows), query.page, query.pageSize),
      ...(query.contract.filters ? { appliedFilters: query.contract.filters } : {}),
      ...(query.contract.sort ? { appliedSort: query.contract.sort } : {})
    };
  }

  async listSnapshots(
    query: ReadCollectionQueryInput
  ): Promise<ReadCollectionResult<SnapshotKpiMetricReadModel>> {
    const conditions: Prisma.Sql[] = [accepted_metric_key_condition()];
    const metricKey = extract_eq_filter(query, "metricKey");
    if (metricKey) {
      conditions.push(Prisma.sql`"metric_code" = ${metricKey}`);
    }

    const periodType = extract_eq_filter(query, "periodType");
    if (periodType) {
      conditions.push(Prisma.sql`"period_type" = ${periodType}`);
    }

    const periodStart = extract_eq_filter(query, "periodStart");
    if (periodStart) {
      conditions.push(Prisma.sql`"period_start" = ${periodStart}::date`);
    }

    const periodEnd = extract_eq_filter(query, "periodEnd");
    if (periodEnd) {
      conditions.push(Prisma.sql`"period_end" = ${periodEnd}::date`);
    }

    const where_clause = build_where_clause(conditions);
    const order_clause = build_order_clause(
      query,
      {
        periodStart: '"period_start"',
        periodEnd: '"period_end"',
        createdAt: '"created_at"',
        updatedAt: '"updated_at"',
        metricKey: '"metric_code"'
      },
      "periodStart"
    );
    const offset = (query.page - 1) * query.pageSize;

    const [rows, countRows] = await this.prismaService.$transaction([
      this.prismaService.$queryRaw<SnapshotKpiMetricRow[]>`
        SELECT
          "id",
          "metric_code" AS "metricKey",
          "period_type" AS "periodType",
          "period_start" AS "periodStart",
          "period_end" AS "periodEnd",
          "scope_type" AS "scopeType",
          "scope_id" AS "scopeId",
          "metric_value" AS "metricValue",
          "metric_payload" AS "metricPayload",
          "created_at" AS "createdAt",
          "updated_at" AS "updatedAt"
        FROM "analytics"."snapshot_kpi_metrics"
        ${where_clause}
        ORDER BY ${order_clause}
        LIMIT ${query.pageSize}
        OFFSET ${offset}
      `,
      this.prismaService.$queryRaw<CountRow[]>`
        SELECT COUNT(*)::int AS "totalItems"
        FROM "analytics"."snapshot_kpi_metrics"
        ${where_clause}
      `
    ]);

    return {
      items: rows.map(map_snapshot_kpi_metric),
      pagination: build_page_pagination_meta(total_items_from(countRows), query.page, query.pageSize),
      ...(query.contract.filters ? { appliedFilters: query.contract.filters } : {}),
      ...(query.contract.sort ? { appliedSort: query.contract.sort } : {})
    };
  }

  async listDepartmentPlans(
    query: ReadCollectionQueryInput
  ): Promise<ReadCollectionResult<DepartmentPlanReadModel>> {
    const conditions: Prisma.Sql[] = [accepted_metric_key_condition()];
    const departmentId = extract_eq_filter(query, "departmentId");
    if (departmentId) {
      conditions.push(Prisma.sql`"department_id" = ${departmentId}::uuid`);
    }

    const metricKey = extract_eq_filter(query, "metricKey");
    if (metricKey) {
      conditions.push(Prisma.sql`"metric_code" = ${metricKey}`);
    }

    const periodStart = extract_eq_filter(query, "periodStart");
    if (periodStart) {
      conditions.push(Prisma.sql`"period_start" = ${periodStart}::date`);
    }

    const periodEnd = extract_eq_filter(query, "periodEnd");
    if (periodEnd) {
      conditions.push(Prisma.sql`"period_end" = ${periodEnd}::date`);
    }

    const where_clause = build_where_clause(conditions);
    const order_clause = build_order_clause(
      query,
      {
        periodStart: '"period_start"',
        periodEnd: '"period_end"',
        createdAt: '"created_at"',
        updatedAt: '"updated_at"',
        metricKey: '"metric_code"'
      },
      "periodStart"
    );
    const offset = (query.page - 1) * query.pageSize;

    const [rows, countRows] = await this.prismaService.$transaction([
      this.prismaService.$queryRaw<DepartmentPlanRow[]>`
        SELECT
          "id",
          "department_id" AS "departmentId",
          "metric_code" AS "metricKey",
          "period_start" AS "periodStart",
          "period_end" AS "periodEnd",
          "plan_value" AS "planValue",
          "set_by_user_id" AS "setByUserId",
          "set_at" AS "setAt",
          "created_at" AS "createdAt",
          "updated_at" AS "updatedAt"
        FROM "analytics"."department_plans"
        ${where_clause}
        ORDER BY ${order_clause}
        LIMIT ${query.pageSize}
        OFFSET ${offset}
      `,
      this.prismaService.$queryRaw<CountRow[]>`
        SELECT COUNT(*)::int AS "totalItems"
        FROM "analytics"."department_plans"
        ${where_clause}
      `
    ]);

    return {
      items: rows.map(map_department_plan),
      pagination: build_page_pagination_meta(total_items_from(countRows), query.page, query.pageSize),
      ...(query.contract.filters ? { appliedFilters: query.contract.filters } : {}),
      ...(query.contract.sort ? { appliedSort: query.contract.sort } : {})
    };
  }
}

export function append_kpi_read_filter(
  query: ReadCollectionQueryInput,
  field: string,
  value: string | undefined
): ReadCollectionQueryInput {
  if (!value) {
    return query;
  }

  query.contract.filters = append_filter(query.contract.filters, {
    field,
    operator: "eq",
    value
  });

  return query;
}
