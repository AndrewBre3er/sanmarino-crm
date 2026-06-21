ALTER TYPE "payments"."PaymentStatus" ADD VALUE 'rejected';

CREATE TYPE "payments"."PaymentSourceType" AS ENUM ('external_fact');

ALTER TABLE "payments"."payments"
  ADD COLUMN "source_type" "payments"."PaymentSourceType" NOT NULL DEFAULT 'external_fact',
  ADD COLUMN "external_source" VARCHAR(64),
  ADD COLUMN "external_event_id" VARCHAR(128),
  ADD COLUMN "intaked_at" TIMESTAMPTZ(6),
  ADD COLUMN "confirmed_by" UUID,
  ADD COLUMN "confirmed_at" TIMESTAMPTZ(6),
  ADD COLUMN "rejected_at" TIMESTAMPTZ(6);

UPDATE "payments"."payments"
SET
  "external_source" = 'manual_import',
  "external_event_id" = "payment_number",
  "intaked_at" = COALESCE("created_at", NOW())
WHERE
  "external_source" IS NULL
  OR "external_event_id" IS NULL
  OR "intaked_at" IS NULL;

ALTER TABLE "payments"."payments"
  ALTER COLUMN "external_source" SET NOT NULL,
  ALTER COLUMN "external_event_id" SET NOT NULL,
  ALTER COLUMN "intaked_at" SET NOT NULL;

CREATE UNIQUE INDEX "payments_external_source_external_event_id_key"
  ON "payments"."payments"("external_source", "external_event_id");

CREATE INDEX "payments_source_type_intaked_at_idx"
  ON "payments"."payments"("source_type", "intaked_at");

ALTER TABLE "payments"."payments"
  ADD CONSTRAINT "payments_confirmed_by_fkey"
  FOREIGN KEY ("confirmed_by")
  REFERENCES "users"."users"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
