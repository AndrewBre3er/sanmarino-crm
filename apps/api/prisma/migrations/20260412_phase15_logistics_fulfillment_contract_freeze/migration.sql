-- CreateEnum
CREATE TYPE "logistics"."SlotStatus" AS ENUM ('open', 'held', 'booked', 'closed');

-- CreateEnum
CREATE TYPE "logistics"."RouteDayStatus" AS ENUM ('planned', 'active', 'closed', 'cancelled');

-- CreateTable
CREATE TABLE "logistics"."delivery_slots" (
    "id" UUID NOT NULL,
    "slot_date" DATE NOT NULL,
    "window_start" TIME(6) NOT NULL,
    "window_end" TIME(6) NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "reserved_count" INTEGER NOT NULL DEFAULT 0,
    "status" "logistics"."SlotStatus" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "delivery_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistics"."pickup_windows" (
    "id" UUID NOT NULL,
    "window_date" DATE NOT NULL,
    "window_start" TIME(6) NOT NULL,
    "window_end" TIME(6) NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "reserved_count" INTEGER NOT NULL DEFAULT 0,
    "status" "logistics"."SlotStatus" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pickup_windows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistics"."drivers" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(64),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistics"."vehicles" (
    "id" UUID NOT NULL,
    "plate_number" VARCHAR(64),
    "name" VARCHAR(255) NOT NULL,
    "capacity_notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistics"."route_days" (
    "id" UUID NOT NULL,
    "route_date" DATE NOT NULL,
    "driver_id" UUID,
    "vehicle_id" UUID,
    "status" "logistics"."RouteDayStatus" NOT NULL DEFAULT 'planned',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "route_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistics"."delivery_task_items" (
    "id" UUID NOT NULL,
    "delivery_task_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "qty" DECIMAL(14,3) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "delivery_task_items_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "logistics"."delivery_tasks"
ADD COLUMN "route_day_id" UUID,
ADD COLUMN "delivery_slot_id" UUID,
ADD COLUMN "driver_id" UUID,
ADD COLUMN "vehicle_id" UUID;

-- AlterTable
ALTER TABLE "orders"."fulfillments"
ADD COLUMN "created_by" UUID NOT NULL;

-- DropForeignKey
ALTER TABLE "logistics"."delivery_tasks"
DROP CONSTRAINT "delivery_tasks_created_by_fkey";

-- AlterTable
ALTER TABLE "logistics"."delivery_tasks"
ALTER COLUMN "created_by" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "delivery_slots_slot_date_window_start_window_end_key"
ON "logistics"."delivery_slots"("slot_date", "window_start", "window_end");

-- CreateIndex
CREATE INDEX "delivery_slots_slot_date_status_idx"
ON "logistics"."delivery_slots"("slot_date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_plate_number_key" ON "logistics"."vehicles"("plate_number");

-- CreateIndex
CREATE INDEX "route_days_route_date_idx" ON "logistics"."route_days"("route_date");

-- CreateIndex
CREATE INDEX "route_days_driver_id_route_date_idx"
ON "logistics"."route_days"("driver_id", "route_date");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_task_items_delivery_task_id_order_item_id_key"
ON "logistics"."delivery_task_items"("delivery_task_id", "order_item_id");

-- CreateIndex
CREATE INDEX "delivery_task_items_order_item_id_idx"
ON "logistics"."delivery_task_items"("order_item_id");

-- CreateIndex
CREATE INDEX "delivery_tasks_route_day_id_idx"
ON "logistics"."delivery_tasks"("route_day_id");

-- CreateIndex
CREATE INDEX "delivery_tasks_delivery_slot_id_idx"
ON "logistics"."delivery_tasks"("delivery_slot_id");

-- CreateIndex
CREATE INDEX "delivery_tasks_order_id_status_idx"
ON "logistics"."delivery_tasks"("order_id", "status");

-- CreateIndex
CREATE INDEX "delivery_tasks_driver_id_planned_date_idx"
ON "logistics"."delivery_tasks"("driver_id", "planned_date");

-- CreateIndex
CREATE INDEX "fulfillments_created_by_idx" ON "orders"."fulfillments"("created_by");

-- AddForeignKey
ALTER TABLE "logistics"."drivers"
ADD CONSTRAINT "drivers_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"."users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics"."route_days"
ADD CONSTRAINT "route_days_driver_id_fkey"
FOREIGN KEY ("driver_id") REFERENCES "logistics"."drivers"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics"."route_days"
ADD CONSTRAINT "route_days_vehicle_id_fkey"
FOREIGN KEY ("vehicle_id") REFERENCES "logistics"."vehicles"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics"."delivery_tasks"
ADD CONSTRAINT "delivery_tasks_route_day_id_fkey"
FOREIGN KEY ("route_day_id") REFERENCES "logistics"."route_days"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics"."delivery_tasks"
ADD CONSTRAINT "delivery_tasks_delivery_slot_id_fkey"
FOREIGN KEY ("delivery_slot_id") REFERENCES "logistics"."delivery_slots"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics"."delivery_tasks"
ADD CONSTRAINT "delivery_tasks_driver_id_fkey"
FOREIGN KEY ("driver_id") REFERENCES "logistics"."drivers"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics"."delivery_tasks"
ADD CONSTRAINT "delivery_tasks_vehicle_id_fkey"
FOREIGN KEY ("vehicle_id") REFERENCES "logistics"."vehicles"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics"."delivery_tasks"
ADD CONSTRAINT "delivery_tasks_created_by_fkey"
FOREIGN KEY ("created_by") REFERENCES "users"."users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders"."fulfillments"
ADD CONSTRAINT "fulfillments_pickup_window_id_fkey"
FOREIGN KEY ("pickup_window_id") REFERENCES "logistics"."pickup_windows"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders"."fulfillments"
ADD CONSTRAINT "fulfillments_created_by_fkey"
FOREIGN KEY ("created_by") REFERENCES "users"."users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics"."delivery_task_items"
ADD CONSTRAINT "delivery_task_items_delivery_task_id_fkey"
FOREIGN KEY ("delivery_task_id") REFERENCES "logistics"."delivery_tasks"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics"."delivery_task_items"
ADD CONSTRAINT "delivery_task_items_order_item_id_fkey"
FOREIGN KEY ("order_item_id") REFERENCES "orders"."order_items"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
