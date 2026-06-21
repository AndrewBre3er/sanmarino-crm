CREATE UNIQUE INDEX IF NOT EXISTS "live_kpi_metrics_metric_code_scope_type_global_key"
  ON "analytics"."live_kpi_metrics"("metric_code", "scope_type")
  WHERE "scope_id" IS NULL;
