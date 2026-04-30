export const accepted_kpi_metric_keys = [
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

export const accepted_kpi_metric_key_values = [...accepted_kpi_metric_keys];

export type AcceptedKpiMetricKey = (typeof accepted_kpi_metric_keys)[number];

const accepted_kpi_metric_key_set = new Set<string>(accepted_kpi_metric_keys);

export function is_accepted_kpi_metric_key(value: string): value is AcceptedKpiMetricKey {
  return accepted_kpi_metric_key_set.has(value);
}

export const kpi_refresh_queue_key = "kpi" as const;
export const kpi_refresh_queue_default_name = "analytics.kpi" as const;
export const kpi_refresh_job_name = "kpi.live-aggregate.refresh" as const;

export const kpi_refresh_queue_contract = {
  queueKey: kpi_refresh_queue_key,
  defaultName: kpi_refresh_queue_default_name,
  jobName: kpi_refresh_job_name
} as const;

export const kpi_refresh_job_contract = {
  queueKey: kpi_refresh_queue_key,
  jobName: kpi_refresh_job_name
} as const;

export const kpi_live_aggregate_refreshed_event_type =
  "kpi.live_aggregate_refreshed" as const;

export interface KpiLiveAggregateRefreshedEventPayload {
  metricKey: AcceptedKpiMetricKey;
  period: string;
  refreshedAt: string;
}
