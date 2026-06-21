CREATE TYPE "system"."IntegrationInboxStatus" AS ENUM ('received', 'processed', 'rejected');

CREATE TYPE "system"."NotificationDispatchStatus" AS ENUM ('queued', 'sent', 'failed');

CREATE TABLE "system"."integration_inbox_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "source_system" VARCHAR(32) NOT NULL,
  "external_event_id" VARCHAR(128) NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "system"."IntegrationInboxStatus" NOT NULL DEFAULT 'received',
  "received_at" TIMESTAMPTZ(6) NOT NULL,
  "processed_at" TIMESTAMPTZ(6),
  "rejected_reason" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "integration_inbox_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "integration_inbox_events_source_system_external_event_id_key"
  ON "system"."integration_inbox_events"("source_system", "external_event_id");

CREATE INDEX "integration_inbox_events_status_received_at_idx"
  ON "system"."integration_inbox_events"("status", "received_at");

CREATE TABLE "system"."notification_dispatches" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "channel" VARCHAR(32) NOT NULL,
  "event_type" VARCHAR(128) NOT NULL,
  "target_ref" VARCHAR(255) NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "system"."NotificationDispatchStatus" NOT NULL DEFAULT 'queued',
  "queued_at" TIMESTAMPTZ(6) NOT NULL,
  "sent_at" TIMESTAMPTZ(6),
  "error_message" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "notification_dispatches_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notification_dispatches_channel_status_queued_at_idx"
  ON "system"."notification_dispatches"("channel", "status", "queued_at");

CREATE INDEX "notification_dispatches_event_type_target_ref_idx"
  ON "system"."notification_dispatches"("event_type", "target_ref");
