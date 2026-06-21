ALTER TABLE "crm"."clients"
  ADD COLUMN "address_text" TEXT,
  ADD COLUMN "address_comment" TEXT,
  ADD COLUMN "installer_referral_comment" TEXT,
  ADD COLUMN "designer_referral_comment" TEXT;

ALTER TABLE "crm"."deals"
  ADD COLUMN "next_contact_at" TIMESTAMPTZ(6),
  ADD COLUMN "lost_reason_code" VARCHAR(64),
  ADD COLUMN "stuck_reason_code" VARCHAR(64),
  ADD COLUMN "is_stuck" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "deals_next_contact_at_idx"
  ON "crm"."deals"("next_contact_at");

CREATE INDEX "deals_is_stuck_status_idx"
  ON "crm"."deals"("is_stuck", "status");

CREATE TABLE "crm"."deal_follow_ups" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "deal_id" UUID NOT NULL,
  "owner_user_id" UUID NOT NULL,
  "next_contact_at" TIMESTAMPTZ(6) NOT NULL,
  "reminder_at" TIMESTAMPTZ(6),
  "status" VARCHAR(32) NOT NULL DEFAULT 'open',
  "comment" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "deal_follow_ups_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "deal_follow_ups_deal_id_status_idx"
  ON "crm"."deal_follow_ups"("deal_id", "status");

CREATE INDEX "deal_follow_ups_owner_user_id_next_contact_at_idx"
  ON "crm"."deal_follow_ups"("owner_user_id", "next_contact_at");

ALTER TABLE "crm"."deal_follow_ups"
  ADD CONSTRAINT "deal_follow_ups_deal_id_fkey"
  FOREIGN KEY ("deal_id")
  REFERENCES "crm"."deals"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "crm"."deal_follow_ups"
  ADD CONSTRAINT "deal_follow_ups_owner_user_id_fkey"
  FOREIGN KEY ("owner_user_id")
  REFERENCES "users"."users"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

CREATE TABLE "crm"."deal_communications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "deal_id" UUID NOT NULL,
  "client_id" UUID NOT NULL,
  "channel" VARCHAR(32) NOT NULL,
  "direction" VARCHAR(16) NOT NULL,
  "summary" TEXT NOT NULL,
  "occurred_at" TIMESTAMPTZ(6) NOT NULL,
  "author_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "deal_communications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "deal_communications_deal_id_occurred_at_idx"
  ON "crm"."deal_communications"("deal_id", "occurred_at");

CREATE INDEX "deal_communications_client_id_occurred_at_idx"
  ON "crm"."deal_communications"("client_id", "occurred_at");

ALTER TABLE "crm"."deal_communications"
  ADD CONSTRAINT "deal_communications_deal_id_fkey"
  FOREIGN KEY ("deal_id")
  REFERENCES "crm"."deals"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "crm"."deal_communications"
  ADD CONSTRAINT "deal_communications_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "crm"."clients"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "crm"."deal_communications"
  ADD CONSTRAINT "deal_communications_author_user_id_fkey"
  FOREIGN KEY ("author_user_id")
  REFERENCES "users"."users"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

CREATE TABLE "crm"."client_merge_cases" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "primary_client_id" UUID NOT NULL,
  "candidate_client_id" UUID NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'open',
  "reason" TEXT,
  "reviewed_by_user_id" UUID,
  "reviewed_at" TIMESTAMPTZ(6),
  "merged_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "client_merge_cases_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "client_merge_cases_primary_client_id_status_idx"
  ON "crm"."client_merge_cases"("primary_client_id", "status");

CREATE INDEX "client_merge_cases_candidate_client_id_status_idx"
  ON "crm"."client_merge_cases"("candidate_client_id", "status");

ALTER TABLE "crm"."client_merge_cases"
  ADD CONSTRAINT "client_merge_cases_primary_client_id_fkey"
  FOREIGN KEY ("primary_client_id")
  REFERENCES "crm"."clients"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "crm"."client_merge_cases"
  ADD CONSTRAINT "client_merge_cases_candidate_client_id_fkey"
  FOREIGN KEY ("candidate_client_id")
  REFERENCES "crm"."clients"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "crm"."client_merge_cases"
  ADD CONSTRAINT "client_merge_cases_reviewed_by_user_id_fkey"
  FOREIGN KEY ("reviewed_by_user_id")
  REFERENCES "users"."users"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
