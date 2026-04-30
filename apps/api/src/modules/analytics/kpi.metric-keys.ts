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
