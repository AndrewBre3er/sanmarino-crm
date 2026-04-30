CREATE TYPE "finance"."FinanceCorrectionStatus" AS ENUM (
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'applied'
);

CREATE TABLE "finance"."manual_corrections" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "status" "finance"."FinanceCorrectionStatus" NOT NULL DEFAULT 'draft',
  "reason" TEXT NOT NULL,
  "requested_by_user_id" UUID NOT NULL,
  "approved_by_user_id" UUID,
  "approved_at" TIMESTAMPTZ(6),
  "rejected_at" TIMESTAMPTZ(6),
  "applied_at" TIMESTAMPTZ(6),
  "applied_entry_id" UUID,
  "payload" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "manual_corrections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "manual_corrections_applied_entry_id_key"
  ON "finance"."manual_corrections"("applied_entry_id");

CREATE INDEX "manual_corrections_status_created_at_idx"
  ON "finance"."manual_corrections"("status", "created_at");

CREATE INDEX "manual_corrections_requested_by_user_id_status_idx"
  ON "finance"."manual_corrections"("requested_by_user_id", "status");

ALTER TABLE "finance"."manual_corrections"
  ADD CONSTRAINT "manual_corrections_requested_by_user_id_fkey"
  FOREIGN KEY ("requested_by_user_id")
  REFERENCES "users"."users"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "finance"."manual_corrections"
  ADD CONSTRAINT "manual_corrections_approved_by_user_id_fkey"
  FOREIGN KEY ("approved_by_user_id")
  REFERENCES "users"."users"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE "finance"."manual_corrections"
  ADD CONSTRAINT "manual_corrections_applied_entry_id_fkey"
  FOREIGN KEY ("applied_entry_id")
  REFERENCES "finance"."finance_entries"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
