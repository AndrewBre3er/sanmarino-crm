-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "reconciliation";

-- CreateEnum
CREATE TYPE "reconciliation"."ReconciliationReportStatus" AS ENUM ('running', 'completed', 'failed');

-- AlterTable
ALTER TABLE "orders"."return_requests" ADD COLUMN     "realization_anchor_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "orders"."return_request_items" (
    "id" UUID NOT NULL,
    "return_request_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "qty" DECIMAL(14,3) NOT NULL,
    "resolution" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "return_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliation"."reports" (
    "id" UUID NOT NULL,
    "report_date" DATE NOT NULL,
    "status" "reconciliation"."ReconciliationReportStatus" NOT NULL,
    "summary" JSONB NOT NULL,
    "issues_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "return_request_items_order_item_id_idx" ON "orders"."return_request_items"("order_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "return_request_items_return_request_id_order_item_id_key" ON "orders"."return_request_items"("return_request_id", "order_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "reports_report_date_key" ON "reconciliation"."reports"("report_date");

-- CreateIndex
CREATE INDEX "reports_status_report_date_idx" ON "reconciliation"."reports"("status", "report_date");

-- AddForeignKey
ALTER TABLE "orders"."return_request_items" ADD CONSTRAINT "return_request_items_return_request_id_fkey" FOREIGN KEY ("return_request_id") REFERENCES "orders"."return_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders"."return_request_items" ADD CONSTRAINT "return_request_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "orders"."order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
