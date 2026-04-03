-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "audit";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "system";

-- CreateEnum
CREATE TYPE "system"."IdempotencyStatus" AS ENUM ('started', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "system"."OutboxStatus" AS ENUM ('pending', 'processing', 'processed', 'failed', 'dead_letter');

-- CreateTable
CREATE TABLE "system"."idempotency_records" (
    "id" UUID NOT NULL,
    "idempotency_key" VARCHAR(128) NOT NULL,
    "scope" VARCHAR(128) NOT NULL,
    "request_hash" VARCHAR(128) NOT NULL,
    "status" "system"."IdempotencyStatus" NOT NULL,
    "response_status_code" INTEGER,
    "response_body" JSONB,
    "locked_until" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" VARCHAR(128),
    "delete_reason" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system"."outbox_events" (
    "id" UUID NOT NULL,
    "event_type" VARCHAR(128) NOT NULL,
    "aggregate_type" VARCHAR(128) NOT NULL,
    "aggregate_id" VARCHAR(128) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "system"."OutboxStatus" NOT NULL DEFAULT 'pending',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMPTZ(6),
    "error_message" TEXT,
    "processed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" VARCHAR(128),
    "delete_reason" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit"."audit_log_records" (
    "id" UUID NOT NULL,
    "event_id" VARCHAR(128) NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "action" VARCHAR(128) NOT NULL,
    "entity_type" VARCHAR(128) NOT NULL,
    "entity_id" VARCHAR(128) NOT NULL,
    "actor_user_id" VARCHAR(128),
    "request_id" VARCHAR(128),
    "correlation_id" VARCHAR(128),
    "payload" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" VARCHAR(128),
    "delete_reason" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "audit_log_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idempotency_records_status_idx" ON "system"."idempotency_records"("status");

-- CreateIndex
CREATE INDEX "idempotency_records_locked_until_idx" ON "system"."idempotency_records"("locked_until");

-- CreateIndex
CREATE INDEX "idempotency_records_is_deleted_idx" ON "system"."idempotency_records"("is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_records_scope_idempotency_key_key" ON "system"."idempotency_records"("scope", "idempotency_key");

-- CreateIndex
CREATE INDEX "outbox_events_status_next_attempt_at_idx" ON "system"."outbox_events"("status", "next_attempt_at");

-- CreateIndex
CREATE INDEX "outbox_events_aggregate_type_aggregate_id_idx" ON "system"."outbox_events"("aggregate_type", "aggregate_id");

-- CreateIndex
CREATE INDEX "outbox_events_event_type_idx" ON "system"."outbox_events"("event_type");

-- CreateIndex
CREATE INDEX "outbox_events_is_deleted_idx" ON "system"."outbox_events"("is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "audit_log_records_event_id_key" ON "audit"."audit_log_records"("event_id");

-- CreateIndex
CREATE INDEX "audit_log_records_entity_type_entity_id_idx" ON "audit"."audit_log_records"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_log_records_occurred_at_idx" ON "audit"."audit_log_records"("occurred_at");

-- CreateIndex
CREATE INDEX "audit_log_records_is_deleted_idx" ON "audit"."audit_log_records"("is_deleted");

