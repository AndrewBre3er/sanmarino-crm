-- CreateEnum
CREATE TYPE "inventory"."StockLockStatus" AS ENUM ('active', 'expired', 'released', 'promoted');

-- CreateEnum
CREATE TYPE "inventory"."ReservationStatus" AS ENUM ('active', 'released', 'expired', 'consumed', 'cancelled');

-- CreateEnum
CREATE TYPE "inventory"."InventoryMovementType" AS ENUM ('receipt', 'issue', 'return_to_stock', 'writeoff', 'adjustment', 'reservation_create', 'reservation_release', 'transfer_to_quarantine', 'release_from_quarantine');

-- CreateEnum
CREATE TYPE "inventory"."InventoryBucket" AS ENUM ('on_hand', 'reserved', 'available', 'quarantine');

-- CreateTable
CREATE TABLE "inventory"."products" (
    "id" UUID NOT NULL,
    "sku" VARCHAR(128) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "product_type" VARCHAR(64),
    "unit" "inventory"."ProductUnit" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."warehouses" (
    "id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."stock_balances" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "on_hand_qty" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "reserved_qty" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "available_qty" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "quarantine_qty" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "weighted_avg_cost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."stock_locks" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "order_id" UUID,
    "deal_id" UUID,
    "qty" DECIMAL(14,3) NOT NULL,
    "status" "inventory"."StockLockStatus" NOT NULL DEFAULT 'active',
    "idempotency_key" VARCHAR(128),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "released_at" TIMESTAMPTZ(6),
    "promoted_reservation_id" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "stock_locks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."reservations" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "qty" DECIMAL(14,3) NOT NULL,
    "status" "inventory"."ReservationStatus" NOT NULL DEFAULT 'active',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "released_at" TIMESTAMPTZ(6),
    "consumed_at" TIMESTAMPTZ(6),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."inventory_movements" (
    "id" UUID NOT NULL,
    "movement_type" "inventory"."InventoryMovementType" NOT NULL,
    "product_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "qty" DECIMAL(14,3) NOT NULL,
    "bucket_from" "inventory"."InventoryBucket",
    "bucket_to" "inventory"."InventoryBucket",
    "unit_cost" DECIMAL(14,2),
    "total_cost" DECIMAL(14,2),
    "order_id" UUID,
    "fulfillment_id" UUID,
    "return_request_id" UUID,
    "reservation_id" UUID,
    "purchase_receipt_id" UUID,
    "reason" TEXT,
    "performed_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "inventory"."products"("sku");

-- CreateIndex
CREATE INDEX "products_name_idx" ON "inventory"."products"("name");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_code_key" ON "inventory"."warehouses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "stock_balances_product_id_warehouse_id_key" ON "inventory"."stock_balances"("product_id", "warehouse_id");

-- CreateIndex
CREATE INDEX "stock_balances_warehouse_id_product_id_idx" ON "inventory"."stock_balances"("warehouse_id", "product_id");

-- CreateIndex
CREATE INDEX "stock_locks_product_id_warehouse_id_status_idx" ON "inventory"."stock_locks"("product_id", "warehouse_id", "status");

-- CreateIndex
CREATE INDEX "stock_locks_order_id_idx" ON "inventory"."stock_locks"("order_id");

-- CreateIndex
CREATE INDEX "stock_locks_deal_id_idx" ON "inventory"."stock_locks"("deal_id");

-- CreateIndex
CREATE INDEX "stock_locks_expires_at_idx" ON "inventory"."stock_locks"("expires_at");

-- CreateIndex
CREATE INDEX "reservations_order_id_idx" ON "inventory"."reservations"("order_id");

-- CreateIndex
CREATE INDEX "reservations_product_id_warehouse_id_status_idx" ON "inventory"."reservations"("product_id", "warehouse_id", "status");

-- CreateIndex
CREATE INDEX "reservations_expires_at_idx" ON "inventory"."reservations"("expires_at");

-- CreateIndex
CREATE INDEX "inventory_movements_product_id_warehouse_id_created_at_idx" ON "inventory"."inventory_movements"("product_id", "warehouse_id", "created_at");

-- CreateIndex
CREATE INDEX "inventory_movements_order_id_idx" ON "inventory"."inventory_movements"("order_id");

-- CreateIndex
CREATE INDEX "inventory_movements_return_request_id_idx" ON "inventory"."inventory_movements"("return_request_id");

-- CreateIndex
CREATE INDEX "inventory_movements_reservation_id_idx" ON "inventory"."inventory_movements"("reservation_id");

-- CreateIndex
CREATE INDEX "inventory_movements_purchase_receipt_id_idx" ON "inventory"."inventory_movements"("purchase_receipt_id");

-- CreateIndex
CREATE INDEX "supplier_request_items_product_id_idx" ON "inventory"."supplier_request_items"("product_id");

-- AddForeignKey
ALTER TABLE "inventory"."supplier_request_items" ADD CONSTRAINT "supplier_request_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "inventory"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."purchase_receipts" ADD CONSTRAINT "purchase_receipts_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "inventory"."warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "inventory"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."stock_balances" ADD CONSTRAINT "stock_balances_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "inventory"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."stock_balances" ADD CONSTRAINT "stock_balances_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "inventory"."warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."stock_locks" ADD CONSTRAINT "stock_locks_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "inventory"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."stock_locks" ADD CONSTRAINT "stock_locks_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "inventory"."warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."stock_locks" ADD CONSTRAINT "stock_locks_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"."orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."stock_locks" ADD CONSTRAINT "stock_locks_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "crm"."deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."stock_locks" ADD CONSTRAINT "stock_locks_promoted_reservation_id_fkey" FOREIGN KEY ("promoted_reservation_id") REFERENCES "inventory"."reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."stock_locks" ADD CONSTRAINT "stock_locks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."reservations" ADD CONSTRAINT "reservations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"."orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."reservations" ADD CONSTRAINT "reservations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "inventory"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."reservations" ADD CONSTRAINT "reservations_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "inventory"."warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."reservations" ADD CONSTRAINT "reservations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."inventory_movements" ADD CONSTRAINT "inventory_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "inventory"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."inventory_movements" ADD CONSTRAINT "inventory_movements_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "inventory"."warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."inventory_movements" ADD CONSTRAINT "inventory_movements_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"."orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."inventory_movements" ADD CONSTRAINT "inventory_movements_return_request_id_fkey" FOREIGN KEY ("return_request_id") REFERENCES "orders"."return_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."inventory_movements" ADD CONSTRAINT "inventory_movements_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "inventory"."reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."inventory_movements" ADD CONSTRAINT "inventory_movements_purchase_receipt_id_fkey" FOREIGN KEY ("purchase_receipt_id") REFERENCES "inventory"."purchase_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."inventory_movements" ADD CONSTRAINT "inventory_movements_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
