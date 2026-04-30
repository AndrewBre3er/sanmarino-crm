import "reflect-metadata";
import { readFileSync } from "node:fs";
import path from "node:path";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import {
  accepted_kpi_metric_keys,
  accepted_kpi_metric_key_values
} from "../../src/modules/analytics/kpi.metric-keys";
import {
  KpiDepartmentPlansReadQueryDto,
  KpiLiveMetricsReadQueryDto,
  KpiSnapshotsReadQueryDto
} from "../../src/modules/analytics/kpi-read.dto";

const expected_metric_keys = [
  "cash_revenue",
  "shipped_amount",
  "gross_profit",
  "net_profit",
  "cash_balance",
  "sales_pipeline_count",
  "sales_pipeline_amount",
  "sales_conversion_by_shipment",
  "cac_paid_channels_first_shipment",
  "inventory_turnover_ratio_month",
  "driver_money_expected",
  "problem_orders_count",
  "supplier_payables_amount"
] as const;

describe("KPI read contract", () => {
  it("keeps the accepted KPI metric key list narrow", () => {
    expect(accepted_kpi_metric_keys).toEqual(expected_metric_keys);
    expect(accepted_kpi_metric_key_values).toEqual([...expected_metric_keys]);
  });

  it("rejects unsupported live KPI metric keys", async () => {
    const dto = plainToInstance(KpiLiveMetricsReadQueryDto, {
      metricKey: "unsupported_metric"
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === "metricKey")).toBe(true);
  });

  it("accepts supported metric keys for all read DTOs", async () => {
    const liveDto = plainToInstance(KpiLiveMetricsReadQueryDto, {
      metricKey: "cash_revenue",
      scope: "global",
      date: "2026-04-30"
    });
    const snapshotDto = plainToInstance(KpiSnapshotsReadQueryDto, {
      metricKey: "cash_revenue",
      periodType: "month",
      periodStart: "2026-04-01",
      periodEnd: "2026-04-30"
    });
    const departmentPlanDto = plainToInstance(KpiDepartmentPlansReadQueryDto, {
      departmentId: "11111111-1111-4111-8111-111111111111",
      metricKey: "cash_revenue",
      periodStart: "2026-04-01",
      periodEnd: "2026-04-30"
    });

    await expect(validate(liveDto)).resolves.toHaveLength(0);
    await expect(validate(snapshotDto)).resolves.toHaveLength(0);
    await expect(validate(departmentPlanDto)).resolves.toHaveLength(0);
  });

  it("does not expose department plan mutation routes in the read controller", () => {
    const controller_path = path.resolve(
      process.cwd(),
      "src/modules/analytics/kpi-read.controller.ts"
    );
    const controller = readFileSync(controller_path, "utf8");

    expect(controller).toContain('@Get("department-plans")');
    expect(controller).not.toContain("@Post");
    expect(controller).not.toContain("@Patch");
    expect(controller).not.toContain("Post,");
    expect(controller).not.toContain("Patch,");
  });

  it("keeps KPI reads on analytics read-model tables", () => {
    const repository_path = path.resolve(
      process.cwd(),
      "src/modules/analytics/kpi-read.repository.ts"
    );
    const repository = readFileSync(repository_path, "utf8");

    expect(repository).toContain('"analytics"."live_kpi_metrics"');
    expect(repository).toContain('"analytics"."snapshot_kpi_metrics"');
    expect(repository).toContain('"analytics"."department_plans"');
    expect(repository).toContain("accepted_metric_key_condition");
    expect(repository).not.toContain('FROM "crm"');
    expect(repository).not.toContain('FROM "orders"');
    expect(repository).not.toContain('FROM "inventory"');
    expect(repository).not.toContain('FROM "payments"');
    expect(repository).not.toContain('FROM "logistics"');
    expect(repository).not.toContain('FROM "finance"');
    expect(repository).not.toContain('FROM "reconciliation"');
  });
});
