CREATE TABLE "inventory"."product_suppliers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "product_id" UUID NOT NULL,
  "supplier_id" UUID NOT NULL,
  "supplier_priority" INTEGER NOT NULL,
  "base_purchase_price" DECIMAL(14,2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'RUB',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "product_suppliers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_suppliers_product_id_supplier_id_key"
  ON "inventory"."product_suppliers"("product_id", "supplier_id");

CREATE UNIQUE INDEX "product_suppliers_product_id_supplier_priority_active_key"
  ON "inventory"."product_suppliers"("product_id", "supplier_priority")
  WHERE "is_active" = true;

CREATE INDEX "product_suppliers_product_id_supplier_priority_idx"
  ON "inventory"."product_suppliers"("product_id", "supplier_priority");

CREATE INDEX "product_suppliers_supplier_id_is_active_idx"
  ON "inventory"."product_suppliers"("supplier_id", "is_active");

ALTER TABLE "inventory"."product_suppliers"
  ADD CONSTRAINT "product_suppliers_product_id_fkey"
  FOREIGN KEY ("product_id")
  REFERENCES "inventory"."products"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "inventory"."product_suppliers"
  ADD CONSTRAINT "product_suppliers_supplier_id_fkey"
  FOREIGN KEY ("supplier_id")
  REFERENCES "inventory"."suppliers"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
