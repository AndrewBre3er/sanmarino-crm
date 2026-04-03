-- CreateEnum
CREATE TYPE "orders"."OrderFulfillmentType" AS ENUM ('delivery', 'pickup', 'manual');

-- AlterTable
ALTER TABLE "orders"."orders"
ADD COLUMN "fulfillment_type" "orders"."OrderFulfillmentType" NOT NULL DEFAULT 'manual';

-- CreateIndex
CREATE INDEX "orders_fulfillment_type_idx" ON "orders"."orders"("fulfillment_type");

-- AddConstraint
ALTER TABLE "orders"."orders"
ADD CONSTRAINT "orders_pickup_delivery_status_ck"
CHECK (
  "fulfillment_type" <> 'pickup'::"orders"."OrderFulfillmentType"
  OR "delivery_status" = 'not_scheduled'::"orders"."OrderDeliveryStatus"
);