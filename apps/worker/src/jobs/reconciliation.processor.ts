export const reconciliation_daily_job_contract = {
  queueKey: "reconciliation",
  jobName: "reconciliation.daily.run"
} as const;

export interface ReconciliationJobPayload {
  reportDate?: string | Date;
}

export interface DailyReconciliationCommand {
  reportDate: string;
  idempotencyKey: string;
}

export interface ReconciliationJobRunner {
  runDailyReconciliation(command: DailyReconciliationCommand): Promise<{
    reportId?: string;
  } | void>;
}

export interface ReconciliationJobResult extends DailyReconciliationCommand {
  reportId?: string;
}

export class ReconciliationJobError extends Error {
  readonly retryable = true;
  readonly reportDate: string;
  readonly idempotencyKey: string;
  readonly originalError: unknown;

  constructor(command: DailyReconciliationCommand, originalError: unknown) {
    const message =
      originalError instanceof Error ? originalError.message : "unknown reconciliation job failure";
    super(`Daily reconciliation job failed for ${command.reportDate}: ${message}`);
    this.name = "ReconciliationJobError";
    this.reportDate = command.reportDate;
    this.idempotencyKey = command.idempotencyKey;
    this.originalError = originalError;
  }
}

export function build_daily_reconciliation_command(
  payload: ReconciliationJobPayload = {},
  now = new Date()
): DailyReconciliationCommand {
  const reportDate = normalize_report_date(payload.reportDate ?? now);
  return {
    reportDate,
    idempotencyKey: `reconciliation.daily.${reportDate}`
  };
}

export async function process_reconciliation_job(
  payload: ReconciliationJobPayload = {},
  runner?: ReconciliationJobRunner
): Promise<ReconciliationJobResult> {
  const command = build_daily_reconciliation_command(payload);
  if (!runner) {
    throw new ReconciliationJobError(
      command,
      new Error("Daily reconciliation runner adapter is not configured")
    );
  }

  try {
    const result = await runner.runDailyReconciliation(command);
    return {
      ...command,
      ...(result?.reportId ? { reportId: result.reportId } : {})
    };
  } catch (error) {
    throw new ReconciliationJobError(command, error);
  }
}

function normalize_report_date(input: string | Date): string {
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) {
      throw new Error("reportDate is invalid");
    }

    return input.toISOString().slice(0, 10);
  }

  const normalized = input.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error("reportDate must be in YYYY-MM-DD format");
  }

  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized) {
    throw new Error("reportDate is invalid");
  }

  return normalized;
}
