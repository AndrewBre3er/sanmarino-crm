-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "inventory";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "users";

-- CreateEnum
CREATE TYPE "crm"."LeadStatus" AS ENUM ('new', 'in_processing', 'cancelled');

-- CreateEnum
CREATE TYPE "inventory"."SupplierRequestStatus" AS ENUM ('formed', 'confirmed_by_supplier', 'paid', 'stocked');

-- CreateEnum
CREATE TYPE "inventory"."ProductUnit" AS ENUM ('шт', 'кв.м', 'п.м', 'услуга');

-- CreateEnum
CREATE TYPE "users"."RecordStatus" AS ENUM ('active', 'inactive');

-- AlterEnum
BEGIN;
CREATE TYPE "crm"."DealStatus_new" AS ENUM ('in_progress', 'converted_to_order', 'cancelled');
ALTER TABLE "crm"."deals" ALTER COLUMN "status" TYPE "crm"."DealStatus_new" USING ("status"::text::"crm"."DealStatus_new");
ALTER TYPE "crm"."DealStatus" RENAME TO "DealStatus_old";
ALTER TYPE "crm"."DealStatus_new" RENAME TO "DealStatus";
DROP TYPE "crm"."DealStatus_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "orders"."OrderStatus_new" AS ENUM ('assembling', 'ready_for_partial_shipment', 'ready_for_shipment', 'partially_shipped', 'shipped');
ALTER TABLE "orders"."orders" ALTER COLUMN "status" TYPE "orders"."OrderStatus_new" USING ("status"::text::"orders"."OrderStatus_new");
ALTER TYPE "orders"."OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "orders"."OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "orders"."OrderStatus_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "orders"."ReturnRequestStatus_new" AS ENUM ('created', 'confirmed', 'processed', 'closed');
ALTER TABLE "orders"."return_requests" ALTER COLUMN "status" TYPE "orders"."ReturnRequestStatus_new" USING ("status"::text::"orders"."ReturnRequestStatus_new");
ALTER TYPE "orders"."ReturnRequestStatus" RENAME TO "ReturnRequestStatus_old";
ALTER TYPE "orders"."ReturnRequestStatus_new" RENAME TO "ReturnRequestStatus";
DROP TYPE "orders"."ReturnRequestStatus_old";
COMMIT;

-- AlterTable
ALTER TABLE "audit"."audit_log_records" DROP COLUMN "actor_user_id",
ADD COLUMN     "actor_user_id" UUID,
DROP COLUMN "deleted_by",
ADD COLUMN     "deleted_by" UUID;

-- AlterTable
ALTER TABLE "crm"."deals" DROP COLUMN "responsible_user_id",
ADD COLUMN     "responsible_user_id" UUID,
DROP COLUMN "deleted_by",
ADD COLUMN     "deleted_by" UUID;

-- AlterTable
ALTER TABLE "crm"."leads" DROP COLUMN "status",
ADD COLUMN     "status" "crm"."LeadStatus" NOT NULL,
DROP COLUMN "responsible_user_id",
ADD COLUMN     "responsible_user_id" UUID;

-- AlterTable
ALTER TABLE "logistics"."delivery_tasks" DROP COLUMN "created_by",
ADD COLUMN     "created_by" UUID;

-- AlterTable
ALTER TABLE "orders"."orders" DROP COLUMN "deleted_by",
ADD COLUMN     "deleted_by" UUID;

-- AlterTable
ALTER TABLE "orders"."return_requests" DROP COLUMN "approved_at",
DROP COLUMN "submitted_at",
ADD COLUMN     "ceo_approved_at" TIMESTAMPTZ(6),
ADD COLUMN     "ceo_approved_by" UUID,
ADD COLUMN     "confirmed_at" TIMESTAMPTZ(6),
ADD COLUMN     "requested_by_user_id" UUID NOT NULL,
ADD COLUMN     "requires_ceo_approval" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "deleted_by",
ADD COLUMN     "deleted_by" UUID;

-- AlterTable
ALTER TABLE "payments"."payments" DROP COLUMN "deleted_by",
ADD COLUMN     "deleted_by" UUID;

-- AlterTable
ALTER TABLE "system"."idempotency_records" DROP COLUMN "deleted_by",
ADD COLUMN     "deleted_by" UUID;

-- AlterTable
ALTER TABLE "system"."outbox_events" DROP COLUMN "deleted_by",
ADD COLUMN     "deleted_by" UUID;

-- CreateTable
CREATE TABLE "users"."departments" (
    "id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "status" "users"."RecordStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."roles" (
    "id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "department_id" UUID,
    "status" "users"."RecordStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."permissions" (
    "id" UUID NOT NULL,
    "code" VARCHAR(128) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."role_permissions" (
    "id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" VARCHAR(255) NOT NULL,
    "department_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."user_roles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."suppliers" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(64),
    "email" VARCHAR(320),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."supplier_requests" (
    "id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "business_source_type" VARCHAR(32) NOT NULL,
    "business_source_id" UUID NOT NULL,
    "status" "inventory"."SupplierRequestStatus" NOT NULL,
    "expected_supply_date" DATE NOT NULL,
    "requested_by" UUID NOT NULL,
    "confirmed_by" UUID,
    "paid_by" UUID,
    "paid_at" TIMESTAMPTZ(6),
    "stocked_by" UUID,
    "stocked_at" TIMESTAMPTZ(6),
    "supplier_document_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "supplier_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."supplier_request_items" (
    "id" UUID NOT NULL,
    "supplier_request_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "qty" DECIMAL(14,3) NOT NULL,
    "unit" "inventory"."ProductUnit" NOT NULL,
    "source_line_ref" VARCHAR(128) NOT NULL,
    "source_line_context" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "supplier_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."purchase_receipts" (
    "id" UUID NOT NULL,
    "receipt_number" VARCHAR(64) NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "supplier_request_id" UUID,
    "received_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "purchase_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."purchase_receipt_items" (
    "id" UUID NOT NULL,
    "purchase_receipt_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "qty" DECIMAL(14,3) NOT NULL,
    "unit" "inventory"."ProductUnit" NOT NULL,
    "unit_cost" DECIMAL(14,2) NOT NULL,
    "line_total" DECIMAL(14,2) NOT NULL,
    "supplier_request_item_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "purchase_receipt_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "users"."departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "users"."roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "users"."permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "users"."role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_key" ON "users"."user_roles"("user_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_receipts_receipt_number_key" ON "inventory"."purchase_receipts"("receipt_number");

-- CreateIndex
CREATE INDEX "purchase_receipt_items_purchase_receipt_id_idx" ON "inventory"."purchase_receipt_items"("purchase_receipt_id");

-- CreateIndex
CREATE INDEX "purchase_receipt_items_product_id_idx" ON "inventory"."purchase_receipt_items"("product_id");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "crm"."leads"("status");

-- AddForeignKey
ALTER TABLE "users"."roles" ADD CONSTRAINT "roles_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "users"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users"."role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "users"."roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users"."role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "users"."permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users"."users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "users"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users"."user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users"."user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "users"."roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."leads" ADD CONSTRAINT "leads_responsible_user_id_fkey" FOREIGN KEY ("responsible_user_id") REFERENCES "users"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."deals" ADD CONSTRAINT "deals_responsible_user_id_fkey" FOREIGN KEY ("responsible_user_id") REFERENCES "users"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."deals" ADD CONSTRAINT "deals_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders"."orders" ADD CONSTRAINT "orders_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics"."delivery_tasks" ADD CONSTRAINT "delivery_tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders"."return_requests" ADD CONSTRAINT "return_requests_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders"."return_requests" ADD CONSTRAINT "return_requests_ceo_approved_by_fkey" FOREIGN KEY ("ceo_approved_by") REFERENCES "users"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders"."return_requests" ADD CONSTRAINT "return_requests_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."supplier_requests" ADD CONSTRAINT "supplier_requests_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "inventory"."suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."supplier_requests" ADD CONSTRAINT "supplier_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."supplier_requests" ADD CONSTRAINT "supplier_requests_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "users"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."supplier_requests" ADD CONSTRAINT "supplier_requests_paid_by_fkey" FOREIGN KEY ("paid_by") REFERENCES "users"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."supplier_requests" ADD CONSTRAINT "supplier_requests_stocked_by_fkey" FOREIGN KEY ("stocked_by") REFERENCES "users"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."supplier_request_items" ADD CONSTRAINT "supplier_request_items_supplier_request_id_fkey" FOREIGN KEY ("supplier_request_id") REFERENCES "inventory"."supplier_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."purchase_receipts" ADD CONSTRAINT "purchase_receipts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "inventory"."suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."purchase_receipts" ADD CONSTRAINT "purchase_receipts_supplier_request_id_fkey" FOREIGN KEY ("supplier_request_id") REFERENCES "inventory"."supplier_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."purchase_receipts" ADD CONSTRAINT "purchase_receipts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_purchase_receipt_id_fkey" FOREIGN KEY ("purchase_receipt_id") REFERENCES "inventory"."purchase_receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_supplier_request_item_id_fkey" FOREIGN KEY ("supplier_request_item_id") REFERENCES "inventory"."supplier_request_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments"."payments" ADD CONSTRAINT "payments_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system"."idempotency_records" ADD CONSTRAINT "idempotency_records_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system"."outbox_events" ADD CONSTRAINT "outbox_events_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit"."audit_log_records" ADD CONSTRAINT "audit_log_records_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit"."audit_log_records" ADD CONSTRAINT "audit_log_records_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

