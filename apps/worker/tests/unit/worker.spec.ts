import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  accepted_kpi_metric_keys as shared_accepted_kpi_metric_keys,
  kpi_live_aggregate_refreshed_event_type,
  kpi_refresh_job_contract as shared_kpi_refresh_job_contract,
  kpi_refresh_queue_default_name
} from "@sanmarino/types";
import {
  build_daily_reconciliation_command,
  process_reconciliation_job,
  reconciliation_daily_job_contract,
  ReconciliationJobError,
  type ReconciliationJobRunner
} from "../../src/jobs/reconciliation.processor";
import {
  accepted_kpi_refresh_metric_keys,
  build_kpi_refresh_command,
  kpi_refresh_job_contract,
  KpiRefreshJobError,
  KpiRefreshValidationError,
  process_kpi_recompute_job,
  type KpiRefreshJobRunner
} from "../../src/jobs/kpi-recompute.processor";
import { worker_queue_contracts } from "../../src/queues/queue.contracts";

const expected_kpi_metric_keys = [
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

describe("reconciliation worker baseline", () => {
  it("declares a concrete daily reconciliation queue job contract", () => {
    expect(reconciliation_daily_job_contract).toEqual({
      queueKey: "reconciliation",
      jobName: "reconciliation.daily.run"
    });
  });

  it("builds deterministic daily reconciliation command for report date", () => {
    const command = build_daily_reconciliation_command({
      reportDate: "2026-04-29"
    });

    expect(command).toEqual({
      reportDate: "2026-04-29",
      idempotencyKey: "reconciliation.daily.2026-04-29"
    });
  });

  it("normalizes Date payloads to UTC report date", () => {
    const command = build_daily_reconciliation_command({
      reportDate: new Date("2026-04-29T23:59:59.000Z")
    });

    expect(command.reportDate).toBe("2026-04-29");
    expect(command.idempotencyKey).toBe("reconciliation.daily.2026-04-29");
  });

  it("delegates daily reconciliation job to the runner once", async () => {
    const runner: ReconciliationJobRunner = {
      runDailyReconciliation: vi.fn().mockResolvedValue({
        reportId: "report_1"
      })
    };

    const result = await process_reconciliation_job(
      {
        reportDate: "2026-04-29"
      },
      runner
    );

    expect(runner.runDailyReconciliation).toHaveBeenCalledOnce();
    expect(runner.runDailyReconciliation).toHaveBeenCalledWith({
      reportDate: "2026-04-29",
      idempotencyKey: "reconciliation.daily.2026-04-29"
    });
    expect(result).toEqual({
      reportDate: "2026-04-29",
      idempotencyKey: "reconciliation.daily.2026-04-29",
      reportId: "report_1"
    });
  });

  it("wraps runner failures with retryable diagnostic context", async () => {
    const runner: ReconciliationJobRunner = {
      runDailyReconciliation: vi.fn().mockRejectedValue(new Error("database unavailable"))
    };

    await expect(
      process_reconciliation_job(
        {
          reportDate: "2026-04-29"
        },
        runner
      )
    ).rejects.toMatchObject({
      retryable: true,
      reportDate: "2026-04-29",
      idempotencyKey: "reconciliation.daily.2026-04-29"
    } satisfies Partial<ReconciliationJobError>);
  });
});

describe("KPI refresh worker boundary", () => {
  it("keeps the accepted KPI queue contract bound to analytics.kpi", () => {
    expect(worker_queue_contracts).toContainEqual({
      key: "kpi",
      env_key: "WORKER_KPI_QUEUE",
      default_name: kpi_refresh_queue_default_name,
      purpose: "KPI aggregate refresh placeholder"
    });
  });

  it("declares a narrow live aggregate refresh job contract on the KPI queue", () => {
    expect(kpi_refresh_job_contract).toBe(shared_kpi_refresh_job_contract);
  });

  it("keeps the worker KPI refresh metric list limited to accepted keys", () => {
    expect(accepted_kpi_refresh_metric_keys).toEqual(expected_kpi_metric_keys);
    expect(accepted_kpi_refresh_metric_keys).toBe(shared_accepted_kpi_metric_keys);
  });

  it("uses the shared KPI contract instead of a local hard-coded metric list", () => {
    const processor_path = path.resolve(process.cwd(), "src/jobs/kpi-recompute.processor.ts");
    const processor = readFileSync(processor_path, "utf8");

    expect(processor).toContain("@sanmarino/types");
    expect(processor).not.toContain('"cash_revenue"');
  });

  it("builds a normalized command for an accepted metric refresh payload", () => {
    const command = build_kpi_refresh_command({
      metricKey: "cash_revenue",
      period: "2026-04",
      refreshedAt: new Date("2026-04-30T10:00:00.000Z"),
      idempotencyKey: "kpi.refresh.cash_revenue.2026-04"
    });

    expect(command).toEqual({
      metricKey: "cash_revenue",
      period: "2026-04",
      refreshedAt: "2026-04-30T10:00:00.000Z",
      idempotencyKey: "kpi.refresh.cash_revenue.2026-04"
    });
  });

  it("keeps repeated equivalent payloads on the same idempotency boundary", () => {
    const payload = {
      metricKey: "cash_revenue",
      period: "2026-04",
      refreshedAt: "2026-04-30T10:00:00.000Z",
      idempotencyKey: "kpi.refresh.cash_revenue.2026-04"
    };

    expect(build_kpi_refresh_command(payload)).toEqual(build_kpi_refresh_command(payload));
  });

  it("rejects unsupported metric keys before runner execution", async () => {
    const runner: KpiRefreshJobRunner = {
      refreshLiveAggregate: vi.fn()
    };

    await expect(
      process_kpi_recompute_job(
        {
          metricKey: "unsupported_metric",
          period: "2026-04",
          refreshedAt: "2026-04-30T10:00:00.000Z",
          idempotencyKey: "kpi.refresh.unsupported.2026-04"
        },
        runner
      )
    ).rejects.toMatchObject({
      name: "KpiRefreshValidationError"
    } satisfies Partial<KpiRefreshValidationError>);

    expect(runner.refreshLiveAggregate).not.toHaveBeenCalled();
  });

  it("rejects missing idempotency input before runner execution", async () => {
    const runner: KpiRefreshJobRunner = {
      refreshLiveAggregate: vi.fn()
    };

    await expect(
      process_kpi_recompute_job(
        {
          metricKey: "cash_revenue",
          period: "2026-04",
          refreshedAt: "2026-04-30T10:00:00.000Z"
        },
        runner
      )
    ).rejects.toMatchObject({
      name: "KpiRefreshValidationError"
    } satisfies Partial<KpiRefreshValidationError>);

    expect(runner.refreshLiveAggregate).not.toHaveBeenCalled();
  });

  it("rejects blank idempotency input before runner execution", async () => {
    const runner: KpiRefreshJobRunner = {
      refreshLiveAggregate: vi.fn()
    };

    await expect(
      process_kpi_recompute_job(
        {
          metricKey: "cash_revenue",
          period: "2026-04",
          refreshedAt: "2026-04-30T10:00:00.000Z",
          idempotencyKey: "   "
        },
        runner
      )
    ).rejects.toMatchObject({
      name: "KpiRefreshValidationError"
    } satisfies Partial<KpiRefreshValidationError>);

    expect(runner.refreshLiveAggregate).not.toHaveBeenCalled();
  });

  it("delegates valid KPI refresh payloads to the runner once", async () => {
    const runner: KpiRefreshJobRunner = {
      refreshLiveAggregate: vi.fn().mockResolvedValue({
        refreshedAt: "2026-04-30T10:00:05.000Z"
      })
    };

    const result = await process_kpi_recompute_job(
      {
        metricKey: "cash_revenue",
        period: "2026-04",
        refreshedAt: "2026-04-30T10:00:00.000Z",
        idempotencyKey: "kpi.refresh.cash_revenue.2026-04"
      },
      runner
    );

    expect(runner.refreshLiveAggregate).toHaveBeenCalledOnce();
    expect(runner.refreshLiveAggregate).toHaveBeenCalledWith({
      metricKey: "cash_revenue",
      period: "2026-04",
      refreshedAt: "2026-04-30T10:00:00.000Z",
      idempotencyKey: "kpi.refresh.cash_revenue.2026-04"
    });
    expect(result).toEqual({
      metricKey: "cash_revenue",
      period: "2026-04",
      refreshedAt: "2026-04-30T10:00:05.000Z",
      idempotencyKey: "kpi.refresh.cash_revenue.2026-04",
      eventType: kpi_live_aggregate_refreshed_event_type
    });
  });

  it("wraps runner failures with retryable KPI diagnostic context", async () => {
    const runner: KpiRefreshJobRunner = {
      refreshLiveAggregate: vi.fn().mockRejectedValue(new Error("refresh adapter unavailable"))
    };

    await expect(
      process_kpi_recompute_job(
        {
          metricKey: "cash_revenue",
          period: "2026-04",
          refreshedAt: "2026-04-30T10:00:00.000Z",
          idempotencyKey: "kpi.refresh.cash_revenue.2026-04"
        },
        runner
      )
    ).rejects.toMatchObject({
      retryable: true,
      metricKey: "cash_revenue",
      period: "2026-04",
      idempotencyKey: "kpi.refresh.cash_revenue.2026-04"
    } satisfies Partial<KpiRefreshJobError>);
  });

  it("keeps the KPI processor isolated from API, HTTP, and notification provider coupling", () => {
    const processor_path = path.resolve(process.cwd(), "src/jobs/kpi-recompute.processor.ts");
    const processor = readFileSync(processor_path, "utf8");

    expect(processor).not.toContain("apps/api");
    expect(processor).not.toContain("@sanmarino/api");
    expect(processor).not.toContain("http://");
    expect(processor).not.toContain("https://");
    expect(processor).not.toContain("telegram");
    expect(processor).not.toContain("max");
    expect(processor).not.toContain("notification");
  });
});
