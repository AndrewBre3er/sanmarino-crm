import {
  accepted_kpi_metric_keys,
  is_accepted_kpi_metric_key,
  kpi_live_aggregate_refreshed_event_type,
  kpi_refresh_job_contract as shared_kpi_refresh_job_contract,
  type AcceptedKpiMetricKey
} from "@sanmarino/types";

export const kpi_refresh_job_contract = shared_kpi_refresh_job_contract;

export const accepted_kpi_refresh_metric_keys = accepted_kpi_metric_keys;

export type AcceptedKpiRefreshMetricKey = AcceptedKpiMetricKey;

export interface KpiRefreshJobPayload {
  metricKey?: string;
  period?: string;
  refreshedAt?: string | Date;
  idempotencyKey?: string;
}

export interface KpiRefreshCommand {
  metricKey: AcceptedKpiRefreshMetricKey;
  period: string;
  refreshedAt: string;
  idempotencyKey: string;
}

export interface KpiRefreshJobRunner {
  refreshLiveAggregate(command: KpiRefreshCommand): Promise<{
    refreshedAt?: string | Date;
  } | void>;
}

export interface KpiRefreshJobResult extends KpiRefreshCommand {
  eventType: typeof kpi_live_aggregate_refreshed_event_type;
}

export class KpiRefreshValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KpiRefreshValidationError";
  }
}

export class KpiRefreshJobError extends Error {
  readonly retryable = true;
  readonly metricKey: AcceptedKpiRefreshMetricKey;
  readonly period: string;
  readonly idempotencyKey: string;
  readonly originalError: unknown;

  constructor(command: KpiRefreshCommand, originalError: unknown) {
    const message =
      originalError instanceof Error ? originalError.message : "unknown KPI refresh failure";
    super(
      `KPI live aggregate refresh failed for ${command.metricKey} ${command.period}: ${message}`
    );
    this.name = "KpiRefreshJobError";
    this.metricKey = command.metricKey;
    this.period = command.period;
    this.idempotencyKey = command.idempotencyKey;
    this.originalError = originalError;
  }
}

export function build_kpi_refresh_command(payload: KpiRefreshJobPayload): KpiRefreshCommand {
  const metricKey = normalize_metric_key(payload.metricKey);
  const period = normalize_required_string(payload.period, "period");
  const refreshedAt = normalize_refreshed_at(payload.refreshedAt);
  const idempotencyKey = normalize_required_string(payload.idempotencyKey, "idempotencyKey");

  return {
    metricKey,
    period,
    refreshedAt,
    idempotencyKey
  };
}

export async function process_kpi_recompute_job(
  payload: KpiRefreshJobPayload = {},
  runner?: KpiRefreshJobRunner
): Promise<KpiRefreshJobResult> {
  const command = build_kpi_refresh_command(payload);

  if (!runner) {
    throw new KpiRefreshJobError(
      command,
      new Error("KPI refresh runner adapter is not configured")
    );
  }

  try {
    const result = await runner.refreshLiveAggregate(command);
    return {
      ...command,
      refreshedAt: result?.refreshedAt
        ? normalize_refreshed_at(result.refreshedAt)
        : command.refreshedAt,
      eventType: kpi_live_aggregate_refreshed_event_type
    };
  } catch (error) {
    throw new KpiRefreshJobError(command, error);
  }
}

function normalize_metric_key(input: unknown): AcceptedKpiRefreshMetricKey {
  const metricKey = normalize_required_string(input, "metricKey");
  if (!is_accepted_kpi_metric_key(metricKey)) {
    throw new KpiRefreshValidationError("metricKey is not accepted for KPI refresh");
  }

  return metricKey;
}

function normalize_required_string(input: unknown, field: string): string {
  if (typeof input !== "string") {
    throw new KpiRefreshValidationError(`${field} is required`);
  }

  const normalized = input.trim();
  if (normalized.length === 0) {
    throw new KpiRefreshValidationError(`${field} is required`);
  }

  return normalized;
}

function normalize_refreshed_at(input: unknown): string {
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) {
      throw new KpiRefreshValidationError("refreshedAt is invalid");
    }

    return input.toISOString();
  }

  const refreshedAt = normalize_required_string(input, "refreshedAt");
  const parsed = new Date(refreshedAt);
  if (Number.isNaN(parsed.getTime())) {
    throw new KpiRefreshValidationError("refreshedAt is invalid");
  }

  return parsed.toISOString();
}
