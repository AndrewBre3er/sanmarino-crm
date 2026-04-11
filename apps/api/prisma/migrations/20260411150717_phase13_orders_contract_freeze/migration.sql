/*
  Warnings:

  - You are about to drop the column `product_ref` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `cancelled_at` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `closed_at` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `completed_at` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `confirmed_at` on the `orders` table. All the data in the column will be lost.
  - Added the required column `product_id` to the `order_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unit` to the `order_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `client_id` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "orders"."OrderPaymentControlStatus" AS ENUM ('none', 'on_control', 'problem');

-- CreateEnum
CREATE TYPE "orders"."FulfillmentStatus" AS ENUM ('pending', 'completed', 'failed', 'cancelled');

-- AlterTable
ALTER TABLE "orders"."order_items" DROP COLUMN "product_ref",
ADD COLUMN     "product_id" UUID NOT NULL,
ADD COLUMN     "unit" "inventory"."ProductUnit" NOT NULL;

-- AlterTable
ALTER TABLE "orders"."orders" DROP COLUMN "cancelled_at",
DROP COLUMN "closed_at",
DROP COLUMN "completed_at",
DROP COLUMN "confirmed_at",
ADD COLUMN     "client_id" UUID NOT NULL,
ADD COLUMN     "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "partially_shipped_at" TIMESTAMPTZ(6),
ADD COLUMN     "payment_control_due_at" TIMESTAMPTZ(6),
ADD COLUMN     "payment_control_status" "orders"."OrderPaymentControlStatus" NOT NULL DEFAULT 'none',
ADD COLUMN     "ready_for_partial_shipment_at" TIMESTAMPTZ(6),
ADD COLUMN     "ready_for_shipment_at" TIMESTAMPTZ(6),
ADD COLUMN     "shipped_at" TIMESTAMPTZ(6),
ADD COLUMN     "subtotal_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'assembling';

-- CreateTable
CREATE TABLE "orders"."fulfillments" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "delivery_task_id" UUID,
    "pickup_window_id" UUID,
    "status" "orders"."FulfillmentStatus" NOT NULL DEFAULT 'pending',
    "fulfillment_type" "orders"."OrderFulfillmentType" NOT NULL,
    "fulfilled_at" TIMESTAMPTZ(6),
    "failure_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "fulfillments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders"."fulfillment_items" (
    "id" UUID NOT NULL,
    "fulfillment_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "qty" DECIMAL(14,3) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "fulfillment_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fulfillments_order_id_idx" ON "orders"."fulfillments"("order_id");

-- CreateIndex
CREATE INDEX "fulfillments_delivery_task_id_idx" ON "orders"."fulfillments"("delivery_task_id");

-- CreateIndex
CREATE INDEX "fulfillments_status_idx" ON "orders"."fulfillments"("status");

-- CreateIndex
CREATE INDEX "fulfillment_items_order_item_id_idx" ON "orders"."fulfillment_items"("order_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "fulfillment_items_fulfillment_id_order_item_id_key" ON "orders"."fulfillment_items"("fulfillment_id", "order_item_id");

-- CreateIndex
CREATE INDEX "inventory_movements_fulfillment_id_idx" ON "inventory"."inventory_movements"("fulfillment_id");

-- CreateIndex
CREATE INDEX "order_items_product_id_idx" ON "orders"."order_items"("product_id");

-- CreateIndex
CREATE INDEX "orders_client_id_idx" ON "orders"."orders"("client_id");

-- CreateIndex
CREATE INDEX "orders_payment_control_status_idx" ON "orders"."orders"("payment_control_status");

-- AddForeignKey
ALTER TABLE "orders"."orders" ADD CONSTRAINT "orders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "crm"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders"."order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "inventory"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders"."fulfillments" ADD CONSTRAINT "fulfillments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"."orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders"."fulfillments" ADD CONSTRAINT "fulfillments_delivery_task_id_fkey" FOREIGN KEY ("delivery_task_id") REFERENCES "logistics"."delivery_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders"."fulfillment_items" ADD CONSTRAINT "fulfillment_items_fulfillment_id_fkey" FOREIGN KEY ("fulfillment_id") REFERENCES "orders"."fulfillments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders"."fulfillment_items" ADD CONSTRAINT "fulfillment_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "orders"."order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."inventory_movements" ADD CONSTRAINT "inventory_movements_fulfillment_id_fkey" FOREIGN KEY ("fulfillment_id") REFERENCES "orders"."fulfillments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
