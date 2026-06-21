CREATE SCHEMA IF NOT EXISTS "analytics";

CREATE TABLE "analytics"."live_kpi_metrics" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "metric_code" VARCHAR(128) NOT NULL,
  "scope_type" VARCHAR(64) NOT NULL,
  "scope_id" UUID,
  "metric_value" DECIMAL(18,4) NOT NULL,
  "metric_payload" JSONB,
  "as_of" TIMESTAMPTZ(6) NOT NULL,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "live_kpi_metrics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "analytics"."department_plans" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "department_id" UUID NOT NULL,
  "metric_code" VARCHAR(128) NOT NULL,
  "period_start" DATE NOT NULL,
  "period_end" DATE NOT NULL,
  "plan_value" DECIMAL(18,4) NOT NULL,
  "set_by_user_id" UUID NOT NULL,
  "set_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "department_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "analytics"."snapshot_kpi_metrics" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "metric_code" VARCHAR(128) NOT NULL,
  "period_type" VARCHAR(32) NOT NULL,
  "period_start" DATE NOT NULL,
  "period_end" DATE NOT NULL,
  "scope_type" VARCHAR(64) NOT NULL,
  "scope_id" UUID,
  "metric_value" DECIMAL(18,4) NOT NULL,
  "metric_payload" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "snapshot_kpi_metrics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "live_kpi_metrics_metric_code_scope_type_scope_id_key"
  ON "analytics"."live_kpi_metrics"("metric_code", "scope_type", "scope_id");

CREATE INDEX "live_kpi_metrics_as_of_idx"
  ON "analytics"."live_kpi_metrics"("as_of");

CREATE UNIQUE INDEX "department_plans_department_id_metric_code_period_start_period_end_key"
  ON "analytics"."department_plans"("department_id", "metric_code", "period_start", "period_end");

CREATE INDEX "department_plans_metric_code_period_start_period_end_idx"
  ON "analytics"."department_plans"("metric_code", "period_start", "period_end");

CREATE UNIQUE INDEX "snapshot_kpi_metrics_metric_code_period_type_period_start_period_end_scope_type_scope_id_key"
  ON "analytics"."snapshot_kpi_metrics"("metric_code", "period_type", "period_start", "period_end", "scope_type", "scope_id");

ALTER TABLE "analytics"."department_plans"
  ADD CONSTRAINT "department_plans_department_id_fkey"
  FOREIGN KEY ("department_id")
  REFERENCES "users"."departments"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "analytics"."department_plans"
  ADD CONSTRAINT "department_plans_set_by_user_id_fkey"
  FOREIGN KEY ("set_by_user_id")
  REFERENCES "users"."users"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
