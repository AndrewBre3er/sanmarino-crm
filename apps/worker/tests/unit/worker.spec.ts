import { describe, expect, it, vi } from "vitest";
import {
  build_daily_reconciliation_command,
  process_reconciliation_job,
  reconciliation_daily_job_contract,
  ReconciliationJobError,
  type ReconciliationJobRunner
} from "../../src/jobs/reconciliation.processor";

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
