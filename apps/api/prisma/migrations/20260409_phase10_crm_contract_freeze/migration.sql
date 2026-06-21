-- DropForeignKey
ALTER TABLE "crm"."deals" DROP CONSTRAINT "deals_responsible_user_id_fkey";

-- DropIndex
DROP INDEX "crm"."deals_lead_id_idx";

-- AlterTable
ALTER TABLE "crm"."deals" ADD COLUMN     "client_id" UUID NOT NULL,
ADD COLUMN     "contact_id" UUID,
ADD COLUMN     "delivery_mode" VARCHAR(32),
ADD COLUMN     "expected_value" DECIMAL(14,2),
ALTER COLUMN "responsible_user_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "crm"."leads" ADD COLUMN     "client_id" UUID,
ADD COLUMN     "contact_id" UUID;

-- CreateTable
CREATE TABLE "crm"."clients" (
    "id" UUID NOT NULL,
    "client_type" VARCHAR(32) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "legal_name" VARCHAR(255),
    "phone" VARCHAR(64),
    "email" VARCHAR(320),
    "tax_id" VARCHAR(64),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."contacts" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(64),
    "email" VARCHAR(320),
    "position" VARCHAR(255),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."client_participants" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "deal_id" UUID,
    "order_id" UUID,
    "role_type" VARCHAR(32) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(64),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "client_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clients_name_idx" ON "crm"."clients"("name");

-- CreateIndex
CREATE INDEX "clients_phone_idx" ON "crm"."clients"("phone");

-- CreateIndex
CREATE INDEX "clients_email_idx" ON "crm"."clients"("email");

-- CreateIndex
CREATE INDEX "contacts_client_id_idx" ON "crm"."contacts"("client_id");

-- CreateIndex
CREATE INDEX "client_participants_client_id_idx" ON "crm"."client_participants"("client_id");

-- CreateIndex
CREATE INDEX "client_participants_deal_id_idx" ON "crm"."client_participants"("deal_id");

-- CreateIndex
CREATE INDEX "client_participants_order_id_idx" ON "crm"."client_participants"("order_id");

-- CreateIndex
CREATE INDEX "client_participants_role_type_idx" ON "crm"."client_participants"("role_type");

-- CreateIndex
CREATE INDEX "deals_client_id_idx" ON "crm"."deals"("client_id");

-- CreateIndex
CREATE INDEX "deals_responsible_user_id_idx" ON "crm"."deals"("responsible_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "deals_lead_id_key" ON "crm"."deals"("lead_id");

-- CreateIndex
CREATE INDEX "leads_responsible_user_id_idx" ON "crm"."leads"("responsible_user_id");

-- AddForeignKey
ALTER TABLE "crm"."contacts" ADD CONSTRAINT "contacts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "crm"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."leads" ADD CONSTRAINT "leads_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "crm"."clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."leads" ADD CONSTRAINT "leads_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "crm"."contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."deals" ADD CONSTRAINT "deals_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "crm"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."deals" ADD CONSTRAINT "deals_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "crm"."contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."deals" ADD CONSTRAINT "deals_responsible_user_id_fkey" FOREIGN KEY ("responsible_user_id") REFERENCES "users"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."client_participants" ADD CONSTRAINT "client_participants_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "crm"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."client_participants" ADD CONSTRAINT "client_participants_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "crm"."deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."client_participants" ADD CONSTRAINT "client_participants_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"."orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
