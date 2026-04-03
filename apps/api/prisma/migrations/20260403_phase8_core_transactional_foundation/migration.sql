-- CreateEnum
CREATE TYPE "crm"."DealStatus" AS ENUM ('draft', 'qualified', 'proposal', 'negotiation', 'won', 'lost');

-- CreateEnum
CREATE TYPE "orders"."OrderStatus" AS ENUM ('draft', 'confirmed', 'reserved', 'in_progress', 'completed', 'closed', 'cancelled', 'partial_return', 'full_return');

-- CreateEnum
CREATE TYPE "orders"."OrderDeliveryStatus" AS ENUM ('not_scheduled', 'scheduled', 'partially_delivered', 'delivered', 'failed');

-- CreateEnum
CREATE TYPE "logistics"."DeliveryTaskStatus" AS ENUM ('planned', 'assigned', 'in_transit', 'delivered', 'failed', 'rescheduled');

-- CreateEnum
CREATE TYPE "orders"."ReturnRequestStatus" AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'processed', 'closed');

-- CreateEnum
CREATE TYPE "payments"."PaymentStatus" AS ENUM ('pending', 'completed', 'refunded');

-- CreateEnum
CREATE TYPE "payments"."PaymentMethod" AS ENUM ('cash', 'bank_transfer', 'card', 'sbp', 'other');

-- CreateTable
CREATE TABLE "crm"."leads" (
    "id" UUID NOT NULL,
    "source" VARCHAR(128) NOT NULL,
    "status" VARCHAR(64) NOT NULL,
    "title" VARCHAR(255),
    "notes" TEXT,
    "responsible_user_id" VARCHAR(128),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."deals" (
    "id" UUID NOT NULL,
    "lead_id" UUID,
    "status" "crm"."DealStatus" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "notes" TEXT,
    "responsible_user_id" VARCHAR(128),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" VARCHAR(128),
    "delete_reason" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders"."orders" (
    "id" UUID NOT NULL,
    "order_number" VARCHAR(64) NOT NULL,
    "deal_id" UUID NOT NULL,
    "status" "orders"."OrderStatus" NOT NULL,
    "delivery_status" "orders"."OrderDeliveryStatus" NOT NULL DEFAULT 'not_scheduled',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'RUB',
    "total_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "confirmed_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" VARCHAR(128),
    "delete_reason" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders"."order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "line_no" INTEGER NOT NULL,
    "product_ref" VARCHAR(128) NOT NULL,
    "product_name_snapshot" VARCHAR(255) NOT NULL,
    "qty" DECIMAL(14,3) NOT NULL,
    "retail_price" DECIMAL(14,2) NOT NULL,
    "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(14,2) NOT NULL,
    "cost_snapshot" DECIMAL(14,2),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistics"."delivery_tasks" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "status" "logistics"."DeliveryTaskStatus" NOT NULL,
    "sequence_no" INTEGER,
    "planned_date" DATE,
    "delivered_at" TIMESTAMPTZ(6),
    "failure_reason" TEXT,
    "address_text" TEXT,
    "recipient_name" VARCHAR(255),
    "recipient_phone" VARCHAR(64),
    "created_by" VARCHAR(128),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "delivery_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders"."return_requests" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "status" "orders"."ReturnRequestStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "requested_refund_amount" DECIMAL(14,2),
    "approved_refund_amount" DECIMAL(14,2),
    "submitted_at" TIMESTAMPTZ(6),
    "approved_at" TIMESTAMPTZ(6),
    "processed_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" VARCHAR(128),
    "delete_reason" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "return_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments"."payments" (
    "id" UUID NOT NULL,
    "payment_number" VARCHAR(64) NOT NULL,
    "order_id" UUID NOT NULL,
    "status" "payments"."PaymentStatus" NOT NULL,
    "payment_method" "payments"."PaymentMethod" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "refunded_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "received_at" TIMESTAMPTZ(6),
    "external_reference" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" VARCHAR(128),
    "delete_reason" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "crm"."leads"("status");

-- CreateIndex
CREATE INDEX "leads_source_idx" ON "crm"."leads"("source");

-- CreateIndex
CREATE INDEX "deals_lead_id_idx" ON "crm"."deals"("lead_id");

-- CreateIndex
CREATE INDEX "deals_status_idx" ON "crm"."deals"("status");

-- CreateIndex
CREATE INDEX "deals_is_deleted_idx" ON "crm"."deals"("is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"."orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_deal_id_idx" ON "orders"."orders"("deal_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"."orders"("status");

-- CreateIndex
CREATE INDEX "orders_delivery_status_idx" ON "orders"."orders"("delivery_status");

-- CreateIndex
CREATE INDEX "orders_is_deleted_idx" ON "orders"."orders"("is_deleted");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "orders"."order_items"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_order_id_line_no_key" ON "orders"."order_items"("order_id", "line_no");

-- CreateIndex
CREATE INDEX "delivery_tasks_order_id_idx" ON "logistics"."delivery_tasks"("order_id");

-- CreateIndex
CREATE INDEX "delivery_tasks_status_idx" ON "logistics"."delivery_tasks"("status");

-- CreateIndex
CREATE INDEX "return_requests_order_id_idx" ON "orders"."return_requests"("order_id");

-- CreateIndex
CREATE INDEX "return_requests_status_idx" ON "orders"."return_requests"("status");

-- CreateIndex
CREATE INDEX "return_requests_is_deleted_idx" ON "orders"."return_requests"("is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "payments_payment_number_key" ON "payments"."payments"("payment_number");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "payments"."payments"("order_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"."payments"("status");

-- CreateIndex
CREATE INDEX "payments_is_deleted_idx" ON "payments"."payments"("is_deleted");

-- AddForeignKey
ALTER TABLE "crm"."deals" ADD CONSTRAINT "deals_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "crm"."leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders"."orders" ADD CONSTRAINT "orders_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "crm"."deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders"."order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"."orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics"."delivery_tasks" ADD CONSTRAINT "delivery_tasks_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"."orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders"."return_requests" ADD CONSTRAINT "return_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"."orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments"."payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"."orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

